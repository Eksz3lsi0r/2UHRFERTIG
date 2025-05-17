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
      x: touch.clientX - firstBlock.left - firstBlock.width / 2 - 50,
      y: touch.clientY - firstBlock.top - firstBlock.height / 2 - 200,
    };
    window.state.currentDragShape = shape;
    window.state.currentDragOffset = this.currentOffset;
    this.createGhost(shape);
    this.createPreview(shape);
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
    if (this.ghostEl) {
      this.ghostEl.style.transform = `translate3d(${
        pageX - this.currentOffset.x
      }px, ${pageY - this.currentOffset.y}px, 0)`;
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
    if (this.previewEl) {
      const xPos =
        this.boardRect.left +
        this.padding +
        this.previewCol * (this.cellSize + this.gap);
      const yPos =
        this.boardRect.top +
        this.padding +
        this.previewRow * (this.cellSize + this.gap);
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
  createPreview(shape, isValid = true) {
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
    this.previewEl.className = isValid
      ? "hover-preview valid"
      : "hover-preview invalid";
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
      block.style.backgroundColor = isValid
        ? "rgba(0,210,168,0.4)"
        : "rgba(255,70,118,0.4)";
      block.style.border = isValid
        ? "2px dashed #00d2a8"
        : "2px dashed #ff4676";
      block.style.boxShadow = isValid
        ? "0 0 10px rgba(0,210,168,0.3)"
        : "0 0 10px rgba(255,70,118,0.3)";
      block.style.transform = "scale(0.95)";
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
};
