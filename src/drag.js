/* -------------------------------------------------------------------------
 *  touchDragSnap.js  –  Vollständiger Ersatz für alle Touch-Drag-Hilfsroutinen
 *  Kopiere die komplette Datei in dein Projekt und binde sie nach deinem
 *  Haupt-Script ein oder füge den Inhalt direkt dort ein.
 * ----------------------------------------------------------------------- */
export const GridSnap = {
  /* interner State */
  boardEl: null,
  cellMatrix: null,
  ghostEl: null,
  previewEl: null,
  cellSize: 0,
  gap: 0,
  padding: 0,
  boardRect: null,
  currentShape: null,
  currentOffset: { x: 0, y: 0 },
  previewRow: 0,
  previewCol: 0,

  init(boardDiv, cells) {
    this.boardEl = boardDiv;
    this.cellMatrix = cells;
    this.recalcMetrics();
    window.addEventListener("resize", () => this.recalcMetrics(), {
      passive: true,
    });
    // Fix: gebundene Methoden speichern
    this._onTouchMove = this.onTouchMove.bind(this);
    this._onTouchEnd = this.onTouchEnd.bind(this);
  },

  onTouchStart(e, shape) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    this.recalcMetrics(); // Immer aktuelle Werte!
    this.currentShape = shape;
    const touch = e.touches[0];
    // Finde den Mittelpunkt des ersten Blocks (Shape-Array ist [r, c])
    let minR = Math.min(...shape.map(([r]) => r));
    let minC = Math.min(...shape.map(([, c]) => c));
    const firstBlock = this.cellMatrix[minR][minC].getBoundingClientRect();
    this.currentOffset = {
      x: 0,
      y: touch.clientY - firstBlock.top - firstBlock.height / 2 - 200,
    };
    window.state.currentDragShape = shape;
    window.state.currentDragOffset = this.currentOffset;
    this.createGhost(shape);

    // Create initial preview with proper assessment
    const isValid = this.checkValidPlacement(shape, 0, 0);
    const canClearLines = isValid
      ? this.checkCanClearLines(shape, 0, 0)
      : false;
    const previewType = isValid
      ? canClearLines
        ? "line-clear"
        : "valid"
      : "invalid";
    this.createPreview(shape, isValid, previewType);

    // Fix: gebundene Methoden verwenden
    document.addEventListener("touchmove", this._onTouchMove, {
      passive: false,
      capture: true,
    });
    document.addEventListener("touchend", this._onTouchEnd, {
      passive: false,
      capture: true,
    });
    this.updatePositions(touch.clientX, touch.clientY);
  },

  onTouchMove(e) {
    if (!this.currentShape) return;
    const touch = e.touches[0];
    e.preventDefault();
    this.updatePositions(touch.clientX, touch.clientY);
  },

  onTouchEnd(e) {
    if (!this.currentShape) return;
    e.preventDefault();
    // Prüfe, ob das Shape vollständig im Grid liegt
    const shapeArr = this.currentShape;
    let valid = true;
    for (const [r, c] of shapeArr) {
      const rr = this.previewRow + r;
      const cc = this.previewCol + c;
      if (rr < 0 || rr > 9 || cc < 0 || cc > 9) {
        valid = false;
        break;
      }
    }
    if (valid) {
      this.placeShapeAt(this.previewRow, this.previewCol);
    }
    this.removeGhost();
    this.removePreview();
    this.currentShape = null;
    this.currentOffset = { x: 0, y: 0 };
    // Fix: gebundene Methoden verwenden
    document.removeEventListener("touchmove", this._onTouchMove, true);
    document.removeEventListener("touchend", this._onTouchEnd, true);
  },

  updatePositions(pageX, pageY) {
    this.recalcMetrics(); // Immer aktuelle Werte!
    // Begrenzung: Ghost und Preview dürfen Viewport nicht verlassen
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let ghostX = pageX - this.currentOffset.x;
    let ghostY = pageY - this.currentOffset.y;
    // Begrenze Ghost auf Viewport
    if (this.ghostEl) {
      const ghostW = this.ghostEl.offsetWidth;
      const ghostH = this.ghostEl.offsetHeight;
      ghostX = Math.max(0, Math.min(ghostX, vw - ghostW));
      ghostY = Math.max(0, Math.min(ghostY, vh - ghostH));
      this.ghostEl.style.transform = `translate3d(${ghostX}px, ${ghostY}px, 0)`;
    }
    // Exakte Berechnung der Zielzelle (Grid-Snap)
    const relX =
      pageX - this.boardRect.left - this.padding - this.currentOffset.x;
    const relY =
      pageY - this.boardRect.top - this.padding - this.currentOffset.y;
    this.previewCol = this.clamp(
      Math.round(relX / (this.cellSize + this.gap)),
      0,
      9
    );
    this.previewRow = this.clamp(
      Math.round(relY / (this.cellSize + this.gap)),
      0,
      9
    );
    // Update preview with enhanced visual feedback
    if (this.currentShape) {
      const isValid = this.checkValidPlacement(
        this.currentShape,
        this.previewRow,
        this.previewCol
      );
      const canClearLines = isValid
        ? this.checkCanClearLines(
            this.currentShape,
            this.previewRow,
            this.previewCol
          )
        : false;

      // Determine preview type
      let previewType = "invalid";
      if (isValid) {
        previewType = canClearLines ? "line-clear" : "valid";
      }

      // Recreate preview with correct styling
      this.createPreview(this.currentShape, isValid, previewType);
    }

    if (this.previewEl) {
      // Begrenze Preview auf Viewport
      const previewW = this.previewEl.offsetWidth;
      const previewH = this.previewEl.offsetHeight;
      let xPos =
        this.boardRect.left +
        this.padding +
        this.previewCol * (this.cellSize + this.gap);
      let yPos =
        this.boardRect.top +
        this.padding +
        this.previewRow * (this.cellSize + this.gap);
      xPos = Math.max(0, Math.min(xPos, vw - previewW));
      yPos = Math.max(0, Math.min(yPos, vh - previewH));
      this.previewEl.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
  },

  createGhost(shape) {
    this.removeGhost();
    this.ghostEl = document.createElement("div");
    this.ghostEl.className = "touch-ghost";
    this.ghostEl.style.position = "fixed";
    this.ghostEl.style.pointerEvents = "none";
    this.ghostEl.style.zIndex = "10000";
    this.ghostEl.style.opacity = "0.85";
    this.ghostEl.style.display = "grid";
    this.ghostEl.style.left = "0";
    this.ghostEl.style.top = "0";
    this.ghostEl.style.transform = "translate3d(0, 0, 0)";
    this.buildShapeBlocks(this.ghostEl, shape, true);
    document.body.appendChild(this.ghostEl);
  },
  removeGhost() {
    this.ghostEl?.remove();
    this.ghostEl = null;
  },
  createPreview(shape, isValid = true, previewType = "valid") {
    this.removePreview();
    // minRow/minCol für korrekte Grid-Positionierung bestimmen
    let minRow = Infinity,
      minCol = Infinity,
      maxRow = 0,
      maxCol = 0;
    shape.forEach(([r, c]) => {
      if (r < minRow) minRow = r;
      if (c < minCol) minCol = c;
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    });
    this.previewEl = document.createElement("div");

    // Set class names based on preview type
    let className = "hover-preview";
    if (previewType === "line-clear") {
      className += " line-clear";
    } else if (previewType === "invalid") {
      className += " invalid";
    } else {
      className += " valid";
    }

    this.previewEl.className = className;
    this.previewEl.style.position = "fixed";
    this.previewEl.style.pointerEvents = "none";
    this.previewEl.style.zIndex = "9998";
    this.previewEl.style.opacity = "0.7";
    this.previewEl.style.display = "grid";
    this.previewEl.style.left = "0";
    this.previewEl.style.top = "0";
    this.previewEl.style.transform = "translate3d(0, 0, 0)";
    this.previewEl.style.gridTemplateRows = `repeat(${
      maxRow - minRow + 1
    }, 1fr)`;
    this.previewEl.style.gridTemplateColumns = `repeat(${
      maxCol - minCol + 1
    }, 1fr)`;
    this.previewEl.style.width = `${
      (maxCol - minCol + 1) * this.cellSize + (maxCol - minCol) * this.gap
    }px`;
    this.previewEl.style.height = `${
      (maxRow - minRow + 1) * this.cellSize + (maxRow - minRow) * this.gap
    }px`;
    this.previewEl.style.gap = `${this.gap}px`;

    shape.forEach(([r, c]) => {
      const block = document.createElement("div");
      block.className = "block";
      block.style.gridRow = r - minRow + 1;
      block.style.gridColumn = c - minCol + 1;

      // Set colors based on preview type
      if (previewType === "line-clear") {
        block.style.backgroundColor = "rgba(255,215,0,0.6)"; // Gold with higher opacity
        block.style.border = "2px dashed #FFD700";
        block.style.boxShadow = "0 0 15px rgba(255,215,0,0.5)";
      } else if (previewType === "invalid") {
        block.style.backgroundColor = "rgba(255,70,118,0.4)";
        block.style.border = "2px dashed #ff4676";
        block.style.boxShadow = "0 0 10px rgba(255,70,118,0.3)";
      } else {
        block.style.backgroundColor = "rgba(0,210,168,0.4)";
        block.style.border = "2px dashed #00d2a8";
        block.style.boxShadow = "0 0 10px rgba(0,210,168,0.3)";
      }

      this.previewEl.appendChild(block);
    });
    document.body.appendChild(this.previewEl);
  },
  removePreview() {
    this.previewEl?.remove();
    this.previewEl = null;
  },
  buildShapeBlocks(container, shape, isGhost) {
    let maxR = 0,
      maxC = 0,
      minR = Infinity,
      minC = Infinity;
    shape.forEach(([r, c]) => {
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (c < minC) minC = c;
    });
    container.style.gridTemplateRows = `repeat(${maxR - minR + 1}, 1fr)`;
    container.style.gridTemplateColumns = `repeat(${maxC - minC + 1}, 1fr)`;
    container.style.width = `${
      (maxC - minC + 1) * this.cellSize + (maxC - minC) * this.gap
    }px`;
    container.style.height = `${
      (maxR - minR + 1) * this.cellSize + (maxR - minR) * this.gap
    }px`;
    container.style.gap = `${this.gap}px`;
    shape.forEach(([r, c]) => {
      const block = document.createElement("div");
      block.className = "block";
      block.style.gridRow = r - minR + 1;
      block.style.gridColumn = c - minC + 1;
      if (isGhost) {
        block.style.backgroundColor = "rgba(182,125,255,0.9)";
        block.style.border = "2px solid #b67dff";
        block.style.boxShadow = "0 0 15px rgba(138,43,226,0.5)";
      }
      container.appendChild(block);
    });
  },
  placeShapeAt(row, col) {
    if (window.player && typeof window.player.handleDrop === "function") {
      window.player.handleDrop(this.currentShape, row, col);
    }
  },
  recalcMetrics() {
    if (!this.boardEl || !this.cellMatrix?.[0]?.[0]) return;
    this.boardRect = this.boardEl.getBoundingClientRect();
    // Suche eine Zelle IM BOARD, nicht aus dem Inventar
    let found = false;
    for (let r = 0; r < this.cellMatrix.length; r++) {
      for (let c = 0; c < this.cellMatrix[r].length; c++) {
        if (
          this.cellMatrix[r][c] &&
          this.boardEl.contains(this.cellMatrix[r][c])
        ) {
          this.cellSize = this.cellMatrix[r][c].offsetWidth;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    this.gap = parseFloat(getComputedStyle(this.boardEl).gap) || 0;
    this.padding = parseFloat(getComputedStyle(this.boardEl).paddingLeft) || 0;
  },
  clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  },
  // Hilfsmethode für korrekt gebundenen TouchStart-Handler
  getTouchStartHandler(shape) {
    return (e) => this.onTouchStart(e, shape);
  },

  /* --------------------------------------------------------------------
   *  Helper functions for enhanced preview
   * ------------------------------------------------------------------ */
  checkCanClearLines(shape, row, col) {
    if (!window.state?.playerBoard) return false;

    // Create a temporary board with the shape placed
    const tempBoard = window.state.playerBoard.map((r) => [...r]);

    // Place the shape in the temporary board
    for (const [r, c] of shape) {
      const rr = row + r;
      const cc = col + c;
      if (rr >= 0 && rr < 10 && cc >= 0 && cc < 10) {
        tempBoard[rr][cc] = 1;
      }
    }

    // Check for full rows
    for (let r = 0; r < 10; r++) {
      if (tempBoard[r].every((v) => v === 1)) {
        return true;
      }
    }

    // Check for full columns
    for (let c = 0; c < 10; c++) {
      let colFull = true;
      for (let r = 0; r < 10; r++) {
        if (tempBoard[r][c] !== 1) {
          colFull = false;
          break;
        }
      }
      if (colFull) return true;
    }

    return false;
  },

  checkValidPlacement(shape, row, col) {
    if (!window.player?.canPlace) return false;
    return window.player.canPlace(shape, row, col);
  },
};
