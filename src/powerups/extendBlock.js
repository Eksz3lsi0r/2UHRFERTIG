import { BasePowerUp } from './basePowerUp.js';

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = true;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

/**
 * Extend Block Power-Up
 * Checks all four directions (up, down, left, right) from its position
 * and places extend blocks in free cells, then recursively repeats
 * the process until no more free cells are found.
 */
export class ExtendBlock extends BasePowerUp {
  constructor() {
    super({
      id: 'extend',
      name: 'Extend Block',
      shape: [[0, 0]], // 1x1 shape
      color: '#ff9500',
      spawnRate: 0.333, // ~33.33% individual chance (100% base chance / 3 powerups)
      emoji: '', // No emoji
      description: 'Expands in all directions until no free cells remain'
    });
  }

  /**
   * Get the flag property name for this power-up
   * @returns {string}
   */
  getFlag() {
    return 'isExtend';
  }

  /**
   * Apply special styling to extend blocks
   * @param {HTMLElement} block - The block element
   * @param {number} cellPx - Cell size in pixels
   */
  styleBlock(block, cellPx) {
    // Remove emoji and use gradient background instead
    block.innerHTML = '';
    block.style.backgroundImage = 'radial-gradient(circle, #ff9500, #e6750e)';
    block.style.boxShadow = '0 0 10px rgba(255, 149, 0, 0.6)';
    block.style.border = '2px solid rgba(255, 149, 0, 0.8)';
    block.style.fontSize = '';
    block.style.display = '';
    block.style.alignItems = '';
    block.style.justifyContent = '';
    block.style.textAlign = '';
  }

  /**
   * Execute the extend effect when placed on the board
   * @param {number} row - Placement row
   * @param {number} col - Placement column
   * @param {Object} gameState - Current game state
   */
  execute(row, col, gameState) {
    debugLog(`Extend Block effect activated at position [${row}, ${col}]!`);

    // Track this ExtendBlock usage
    gameState.lastExtendBlockTurn = gameState.turnCounter;
    gameState.lastExtendBlockWasOnEmptyField = gameState.playerBoard.every(row => row.every(cell => cell === 0));

    // Set flag to prevent automatic inventory generation during extend animation
    gameState.extendAnimationActive = true;

    // Start the extend animation
    this._showExtendAnimation();

    // Start the recursive expansion process
    setTimeout(() => {
      this._startExtendProcess(row, col, gameState);
    }, 250); // Doubled speed: 500 -> 250
  }  /**
   * Show extend animation effect
   * @private
   */
  _showExtendAnimation() {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.add("extend-effect");
      debugLog("🔄 Extend animation started - effect will run during entire extend event");

      // Show power-up indicator
      if (window.showPowerUpIndicator) {
        window.showPowerUpIndicator('extend', 'Extend Block');
      }

      // Play extend sound effect
      if (window.audio?.extendSound) {
        window.audio.extendSound.play();
      }

      // Animation will be removed when the extend effect is complete
      // Duration is managed by the complete extend process
    }
  }

  /**
   * Hide extend animation effect
   * @private
   */
  _hideExtendAnimation() {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.remove("extend-effect");
      debugLog("🔄 Extend animation ended");
    }

    // Stop extend sound effect
    if (window.audio?.stopExtendSound) {
      window.audio.stopExtendSound();
    }

    // Hide power-up indicator
    if (window.hidePowerUpIndicator) {
      window.hidePowerUpIndicator();
    }
  }

  /**
   * Start the recursive extend process
   * @param {number} startRow - Starting row position
   * @param {number} startCol - Starting column position
   * @param {Object} gameState - Current game state
   * @private
   */
  _startExtendProcess(startRow, startCol, gameState) {
    debugLog(`Starting extend process at position [${startRow}, ${startCol}]`);

    // First, place the extend block itself at the starting position
    gameState.playerBoard[startRow][startCol] = 1;
    const startCell = gameState.boardCells[startRow][startCol];
    if (startCell) {
      startCell.classList.add("filled");
      startCell.style.background = this.color;
      startCell.innerHTML = ''; // No emoji

      // Add placement animation for the starting block
      startCell.classList.add("extend-placed");
      setTimeout(() => {
        startCell.classList.remove("extend-placed");
      }, 300);
    }

    // Add points for the initial extend block placement with BOTH multipliers
    const basePoints = 1;
    const startBlockPoints = basePoints * gameState.permanentMultiplier * gameState.currentMultiplier;
    gameState.playerScore += startBlockPoints;

    // Update score display immediately
    if (window.player?.updateScoreDisplay) {
      window.player.updateScoreDisplay();
    }

    // Animate score gain for starting block with breakdown
    if (window.player?.animateScore) {
      window.player.animateScore(startBlockPoints, basePoints, gameState.permanentMultiplier, gameState.currentMultiplier);
    }

    debugLog(`Extend Block placed at starting position [${startRow}, ${startCol}] - Added ${startBlockPoints} points (1 × ${gameState.permanentMultiplier}x × ${gameState.currentMultiplier}x multiplier)`);

    // Use a simple queue-based approach for reliable expansion
    const queue = [{row: startRow, col: startCol}];
    const processed = new Set();
    const allNewPositions = [];
    let waveNumber = 0;

    const processNextWave = () => {
      if (queue.length === 0) {
        // No more positions to process, finish the extend effect
        debugLog(`Extend process completed after ${waveNumber} waves. Total new positions: ${allNewPositions.length}`);
        setTimeout(() => {
          this._finishExtendEffect(gameState, allNewPositions);
        }, 150); // Doubled speed: 300 -> 150
        return;
      }

      debugLog(`Processing wave ${waveNumber} with ${queue.length} positions`);

      const currentWave = [...queue];
      queue.length = 0; // Clear the queue for next wave

      let processedInThisWave = 0;
      const totalInWave = currentWave.length;

      currentWave.forEach((pos, index) => {
        const posKey = `${pos.row},${pos.col}`;

        if (processed.has(posKey)) {
          processedInThisWave++;
          if (processedInThisWave === totalInWave) {
            waveNumber++;
            setTimeout(processNextWave, 150); // Doubled speed: 300 -> 150
          }
          return;
        }

        processed.add(posKey);

        setTimeout(() => {
          const newPositions = this._checkAndFillDirections(pos.row, pos.col, gameState);

          // Add new positions to queue if they haven't been processed
          newPositions.forEach(newPos => {
            const newPosKey = `${newPos.row},${newPos.col}`;
            if (!processed.has(newPosKey) && !queue.some(qPos => `${qPos.row},${qPos.col}` === newPosKey)) {
              queue.push(newPos);
              allNewPositions.push(newPos);
            }
          });

          processedInThisWave++;

          // If this was the last position in the current wave, start next wave
          if (processedInThisWave === totalInWave) {
            waveNumber++;
            setTimeout(processNextWave, 150); // Doubled speed: 300 -> 150
          }
        }, index * 25); // Doubled speed: 50 -> 25
      });
    };

    // Start processing after a short delay to show the initial placement
    setTimeout(() => {
      processNextWave();
    }, 100); // Doubled speed: 200 -> 100
  }

  /**
   * Check all four directions and fill free cells
   * @param {number} row - Current row
   * @param {number} col - Current column
   * @param {Object} gameState - Current game state
   * @returns {Array} Array of new positions that were filled
   * @private
   */
  _checkAndFillDirections(row, col, gameState) {
    const directions = [
      [-1, 0], // up
      [1, 0],  // down
      [0, -1], // left
      [0, 1]   // right
    ];

    const newPositions = [];
    const sourceCell = gameState.boardCells[row][col];

    directions.forEach(([dr, dc], dirIndex) => {
      const newRow = row + dr;
      const newCol = col + dc;

      // Check if position is within bounds and free
      if (this._isValidAndFreePosition(newRow, newCol, gameState)) {
        // Immediately fill the position in the game state
        gameState.playerBoard[newRow][newCol] = 1;
        const cell = gameState.boardCells[newRow][newCol];

        if (cell) {
          cell.classList.add("filled");
          cell.style.background = this.color;
          cell.innerHTML = ''; // No emoji

          // Add placement animation
          cell.classList.add("extend-placed");
          setTimeout(() => {
            cell.classList.remove("extend-placed");
          }, 150); // Doubled speed: 300 -> 150
        }

        // Add points for each extended block with BOTH multipliers
        const basePoints = 1;
        const blockPoints = basePoints * gameState.permanentMultiplier * gameState.currentMultiplier;
        gameState.playerScore += blockPoints;

        // Update score display immediately
        if (window.player?.updateScoreDisplay) {
          window.player.updateScoreDisplay();
        }

        // Animate score gain for each extended block with breakdown
        if (window.player?.animateScore) {
          window.player.animateScore(blockPoints, basePoints, gameState.permanentMultiplier, gameState.currentMultiplier);
        }

        // Create visual flying animation (doesn't affect game logic)
        this._createFlyingBlockAnimation(sourceCell, cell, dirIndex);

        newPositions.push({row: newRow, col: newCol});
        debugLog(`Extended to position [${newRow}, ${newCol}] - Added ${blockPoints} points (1 × ${gameState.permanentMultiplier}x × ${gameState.currentMultiplier}x multiplier)`);
      }
    });

    return newPositions;
  }

  /**
   * Create a flying block animation from source to target cell
   * @param {HTMLElement} sourceCell - The source cell element
   * @param {HTMLElement} targetCell - The target cell element
   * @param {number} dirIndex - Direction index for animation timing
   * @private
   */
  _createFlyingBlockAnimation(sourceCell, targetCell, dirIndex) {
    if (!sourceCell || !targetCell) {
      return;
    }

    // Create flying block element
    const flyingBlock = document.createElement('div');
    flyingBlock.className = 'flying-extend-block';
    flyingBlock.style.cssText = `
      position: absolute;
      width: ${sourceCell.offsetWidth}px;
      height: ${sourceCell.offsetHeight}px;
      background: ${this.color};
      border-radius: 4px;
      box-shadow: 0 0 10px rgba(255, 149, 0, 0.8);
      z-index: 1000;
      pointer-events: none;
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    `;

    // Get positions
    const sourceRect = sourceCell.getBoundingClientRect();
    const targetRect = targetCell.getBoundingClientRect();
    const boardRect = document.getElementById('board').getBoundingClientRect();

    // Set initial position relative to board
    flyingBlock.style.left = `${sourceRect.left - boardRect.left}px`;
    flyingBlock.style.top = `${sourceRect.top - boardRect.top}px`;

    // Add to board container
    document.getElementById('board').appendChild(flyingBlock);

    // Trigger animation after a small delay for each direction
    setTimeout(() => {
      // Set final position
      flyingBlock.style.left = `${targetRect.left - boardRect.left}px`;
      flyingBlock.style.top = `${targetRect.top - boardRect.top}px`;
      flyingBlock.style.transform = 'scale(0.8)';
      flyingBlock.style.opacity = '0.8';

      // Remove element after animation
      setTimeout(() => {
        if (flyingBlock.parentNode) {
          flyingBlock.parentNode.removeChild(flyingBlock);
        }
      }, 200); // Doubled speed: 400 -> 200
    }, dirIndex * 25); // Doubled speed: 50 -> 25
  }

  /**
   * Check if a position is valid and free
   * @param {number} row - Row to check
   * @param {number} col - Column to check
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if position is valid and free
   * @private
   */
  _isValidAndFreePosition(row, col, gameState) {
    // Check bounds
    if (row < 0 || row >= 10 || col < 0 || col >= 10) {
      return false;
    }

    // Check if cell is free
    return gameState.playerBoard[row][col] === 0;
  }

  /**
   * Finish the extend effect and regenerate inventory
   * @param {Object} gameState - Current game state
   * @param {Array} extendedPositions - All positions that were filled during extend
   * @private
   */
  _finishExtendEffect(gameState, extendedPositions) {
    // Include the starting position in the total count
    const totalExtendedCount = extendedPositions.length + 1; // +1 for the starting position
    debugLog(`Extend effect completed! Extended to ${extendedPositions.length} new positions + 1 starting position = ${totalExtendedCount} total.`);

    // Check for full lines after extend effect
    setTimeout(() => {
      this._checkAndClearLinesAfterExtend(gameState, extendedPositions, totalExtendedCount);
    }, 250); // Doubled speed: 500 -> 250
  }

  /**
   * Check for full lines after extend effect and clear them
   * @param {Object} gameState - Current game state
   * @param {Array} extendedPositions - All positions that were filled during extend
   * @private
   */
  _checkAndClearLinesAfterExtend(gameState, extendedPositions, totalExtendedCount) {
    debugLog("Checking for full lines after extend effect...");

    // Check for full lines manually to handle current multiplier correctly
    const fullRows = [];
    const fullCols = [];

    // Check rows
    for (let r = 0; r < 10; r++) {
      if (gameState.playerBoard[r].every((v) => v === 1)) {
        fullRows.push(r);
      }
    }

    // Check columns
    for (let c = 0; c < 10; c++) {
      let colFull = true;
      for (let r = 0; r < 10; r++) {
        if (gameState.playerBoard[r][c] !== 1) {
          colFull = false;
          break;
        }
      }
      if (colFull) fullCols.push(c);
    }

    const totalLinesCleared = fullRows.length + fullCols.length;

    if (totalLinesCleared > 0) {
      debugLog(`Extend Block: Found ${fullRows.length} rows and ${fullCols.length} columns to clear`);

      // Track values before changes for gain calculation
      const oldCurrentMultiplier = gameState.currentMultiplier;
      const oldPermanentMultiplier = gameState.permanentMultiplier;
      const oldScore = gameState.playerScore;

      debugLog(`Extend Block: BEFORE - consecutiveClears: ${gameState.consecutiveClears}, currentMultiplier: ${gameState.currentMultiplier}x, permanentMultiplier: ${gameState.permanentMultiplier}x`);

      // Increase consecutive clears counter
      gameState.consecutiveClears += totalLinesCleared;

      // Check if entire board is cleared (all 100 cells filled)
      let allCellsFilled = true;
      for (let r = 0; r < 10 && allCellsFilled; r++) {
        for (let c = 0; c < 10 && allCellsFilled; c++) {
          if (gameState.playerBoard[r][c] !== 1) {
            allCellsFilled = false;
          }
        }
      }

      // Use normal progression: +1 per line + consecutive bonus
      gameState.currentMultiplier += totalLinesCleared;

      // Consecutive clear bonus if last clear was recent
      if (gameState.lastClearTurn === gameState.turnCounter - 1) {
        gameState.currentMultiplier += 1;
        debugLog(`Extend Block: Consecutive clear bonus +1`);
      }
      gameState.lastClearTurn = gameState.turnCounter;

      // Cap at 40x
      gameState.currentMultiplier = Math.min(gameState.currentMultiplier, 40);

      // If 40x reached, start 3-round duration
      if (gameState.currentMultiplier === 40 && gameState.currentMultiplier40xRoundsRemaining === 0) {
        gameState.currentMultiplier40xRoundsRemaining = 3;
        debugLog(`Extend Block: 40x multiplier reached! Starting 3-round duration.`);
      }

      debugLog(`Extend Block: AFTER Current multiplier - currentMultiplier: ${gameState.currentMultiplier}x (${totalLinesCleared} lines + consecutive bonus)`);

      // Clear the lines visually
      fullRows.forEach((r) => {
        for (let c = 0; c < 10; c++) {
          gameState.playerBoard[r][c] = 0;
          const cell = gameState.boardCells[r][c];
          if (cell) {
            cell.classList.remove("filled", "rainbow");
            cell.style.background = "";
            cell.innerHTML = "";
          }
        }
      });

      fullCols.forEach((c) => {
        for (let r = 0; r < 10; r++) {
          gameState.playerBoard[r][c] = 0;
          const cell = gameState.boardCells[r][c];
          if (cell) {
            cell.classList.remove("filled", "rainbow");
            cell.style.background = "";
            cell.innerHTML = "";
          }
        }
      });

      // Calculate and award points for line clearing
      let basePoints = fullRows.length + fullCols.length;
      if (fullRows.length && fullCols.length) basePoints += 2; // Bonus for both
      if (fullRows.length > 1) basePoints += fullRows.length * 2; // Multi-row bonus
      if (fullCols.length > 1) basePoints += fullCols.length * 2; // Multi-col bonus

      // Update permanent multiplier for line clearing FIRST (before using it in calculation)
      gameState.permanentMultiplier += 1;
      debugLog(`Extend Block: Permanent multiplier increased from ${oldPermanentMultiplier}x to ${gameState.permanentMultiplier}x`);

      // Award points with both multipliers (using NEW permanent multiplier, reduced by 20x)
      const baseLineClearingPoints = (basePoints * 10) / 20; // Base points with 10x multiplier but reduced by 20x
      const lineClearingPoints = baseLineClearingPoints * gameState.currentMultiplier * gameState.permanentMultiplier;
      gameState.playerScore += lineClearingPoints;

      // Calculate gains for message display
      const permanentMultiplierGain = gameState.permanentMultiplier - oldPermanentMultiplier;
      const currentMultiplierGain = gameState.currentMultiplier - oldCurrentMultiplier;
      const pointsGained = gameState.playerScore - oldScore;

      // Nach Score/Multiplier-Änderung Animationen triggern mit Faktoren-Aufschlüsselung
      if (window.player?.animateScore) window.player.animateScore(lineClearingPoints, baseLineClearingPoints, gameState.permanentMultiplier, gameState.currentMultiplier);
      if (window.player?.animatePermanentMultiplier) window.player.animatePermanentMultiplier(permanentMultiplierGain);
      if (window.player?.animateCurrentMultiplier) window.player.animateCurrentMultiplier(currentMultiplierGain);

      // Update displays
      if (window.player?.updateScoreDisplay) {
        window.player.updateScoreDisplay();
      }
      if (window.player?.updatePermanentMultiplierDisplay) {
        window.player.updatePermanentMultiplierDisplay();
      }
      if (window.player?.updateCurrentMultiplierDisplay) {
        window.player.updateCurrentMultiplierDisplay();
      }

      debugLog(`Extend Block: Awarded ${lineClearingPoints} points for line clearing (${basePoints} base * 10 * ${gameState.currentMultiplier}x current * ${gameState.permanentMultiplier}x permanent ÷ 20)`);
      debugLog(`Extend Block: FINAL STATE - consecutiveClears: ${gameState.consecutiveClears}, currentMultiplier: ${gameState.currentMultiplier}x, permanentMultiplier: ${gameState.permanentMultiplier}x`);

      // After a short delay, regenerate inventory
      setTimeout(() => {
        this._regenerateInventoryAfterExtend(gameState, true, permanentMultiplierGain, currentMultiplierGain, pointsGained);
      }, 500);
    } else {
      // No full lines, proceed directly to inventory regeneration
      this._regenerateInventoryAfterExtend(gameState, false, 0, 0, 0);
    }
  }

  /**
   * Regenerate inventory after extend effect
   * @param {Object} gameState - Current game state
   * @param {boolean} linesWereCleared - Whether lines were cleared during extend
   * @param {number} permanentMultiplierGain - Permanent multiplier gained
   * @param {number} currentMultiplierGain - Current multiplier gained
   * @param {number} pointsGained - Points gained
   * @private
   */
  _regenerateInventoryAfterExtend(gameState, linesWereCleared = false, permanentMultiplierGain = 0, currentMultiplierGain = 0, pointsGained = 0) {
    // Wait for animations to complete, then show message first
    setTimeout(() => {
      // Use robust inventory regeneration
      if (window.player?.regenerateInventoryAfterPowerUp) {
        window.player.regenerateInventoryAfterPowerUp(gameState, "Extend Block");
      } else {
        // Fallback to original method
        if (window.player?.generatePieces) {
          window.player.generatePieces();
        }
        if (window.player?.renderPieces) {
          window.player.renderPieces();
        }
      }

      // Clear the extend animation flag to allow normal inventory generation
      gameState.extendAnimationActive = false;

      // Hide the extend animation when complete
      this._hideExtendAnimation();
    }, 500); // Doubled speed: 1000 -> 500
  }

  /**
   * Test the extend effect with a positioned block
   */
  testEffect() {
    debugLog("Testing Extend Block effect...");

    if (!window.state?.playerBoard || !window.state?.boardCells) {
      console.error("Game state not available for testing");
      return;
    }

    // Clear the board first for better testing
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        window.state.playerBoard[r][c] = 0;
        const cell = window.state.boardCells[r][c];
        if (cell) {
          cell.classList.remove('filled', 'rainbow');
          cell.style.background = '';
          cell.innerHTML = '';
        }
      }
    }

    // Add some test blocks to create boundaries
    const testBlocks = [
      [2, 2], [2, 7], [7, 2], [7, 7], // corners
      [4, 0], [4, 9], [0, 4], [9, 4]  // edges
    ];

    testBlocks.forEach(([r, c]) => {
      window.state.playerBoard[r][c] = 1;
      const cell = window.state.boardCells[r][c];
      if (cell) {
        cell.classList.add('filled');
        cell.style.background = '#666666';
      }
    });

    debugLog("✅ Test boundaries added to board");
    debugLog("Now execute extend effect from center position [5, 5]...");

    // Execute the extend effect from center
    this.execute(5, 5, window.state);
  }  /**
   * Test the extend effect with line clearing to verify current multiplier increase
   */
  testExtendWithLineClearing() {
    debugLog("Testing Extend Block with line clearing for current multiplier...");

    if (!window.state?.playerBoard || !window.state?.boardCells) {
      console.error("Game state not available for testing");
      return;
    }

    // Clear the board first
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        window.state.playerBoard[r][c] = 0;
        const cell = window.state.boardCells[r][c];
        if (cell) {
          cell.classList.remove('filled', 'rainbow');
          cell.style.background = '';
          cell.innerHTML = '';
        }
      }
    }

    // Create a scenario where extend block will create full lines
    // Fill most of row 5, leaving space at [5,5] for extend block
    for (let c = 0; c < 10; c++) {
      if (c !== 5) {
        window.state.playerBoard[5][c] = 1;
        const cell = window.state.boardCells[5][c];
        if (cell) {
          cell.classList.add('filled');
          cell.style.background = '#666666';
        }
      }
    }

    // Fill most of column 5, leaving space at [5,5] for extend block
    for (let r = 0; r < 10; r++) {
      if (r !== 5) {
        window.state.playerBoard[r][5] = 1;
        const cell = window.state.boardCells[r][5];
        if (cell) {
          cell.classList.add('filled');
          cell.style.background = '#666666';
        }
      }
    }

    // Record initial state
    const initialScore = window.state.playerScore;
    const initialCurrentMultiplier = window.state.currentMultiplier;
    const initialConsecutiveClears = window.state.consecutiveClears;
    const initialPermanentMultiplier = window.state.permanentMultiplier;

    debugLog(`📊 Before Extend: Score=${initialScore}, Current Multiplier=${initialCurrentMultiplier}x, Consecutive Clears=${initialConsecutiveClears}, Permanent Multiplier=${initialPermanentMultiplier}x`);
    debugLog("Setup: Row 5 and Column 5 are almost full, extend block will complete both");

    // Execute extend at [5,5] - this should complete both row 5 and column 5
    this.execute(5, 5, window.state);

    // Check results after a delay
    setTimeout(() => {
      const newScore = window.state.playerScore;
      const newCurrentMultiplier = window.state.currentMultiplier;
      const newConsecutiveClears = window.state.consecutiveClears;
      const newPermanentMultiplier = window.state.permanentMultiplier;

      debugLog(`📊 After Extend: Score=${newScore} (+${newScore - initialScore}), Current Multiplier=${newCurrentMultiplier}x (+${newCurrentMultiplier - initialCurrentMultiplier}), Consecutive Clears=${newConsecutiveClears} (+${newConsecutiveClears - initialConsecutiveClears}), Permanent Multiplier=${newPermanentMultiplier}x (+${newPermanentMultiplier - initialPermanentMultiplier})`);

      if (newConsecutiveClears > initialConsecutiveClears) {
        debugLog("✅ SUCCESS: Current multiplier increased due to line clearing by Extend Block!");
      } else {
        debugLog("❌ FAILURE: Current multiplier did not increase");
        debugLog("🔍 DEBUG: Check if gameState references are correct");
        debugLog(`🔍 DEBUG: window.state === gameState? ${window.state === window.state}`);
        debugLog(`🔍 DEBUG: gameState.consecutiveClears = ${window.state.consecutiveClears}`);
        debugLog(`🔍 DEBUG: gameState.currentMultiplier = ${window.state.currentMultiplier}`);
      }

      debugLog("✅ Extend Block line clearing test completed!");
    }, 3000);
  }

  /**
   * Test the special 40x multiplier case by filling the entire board except one cell
   */
  testExtend40xMultiplier() {
    debugLog("Testing Extend Block 40x multiplier (entire board clear)...");

    if (!window.state?.playerBoard || !window.state?.boardCells) {
      console.error("Game state not available for testing");
      return;
    }

    // Fill the entire board except position [5,5]
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (r !== 5 || c !== 5) {
          window.state.playerBoard[r][c] = 1;
          const cell = window.state.boardCells[r][c];
          if (cell) {
            cell.classList.add('filled');
            cell.style.background = '#666666';
          }
        } else {
          window.state.playerBoard[r][c] = 0;
          const cell = window.state.boardCells[r][c];
          if (cell) {
            cell.classList.remove('filled', 'rainbow');
            cell.style.background = '';
            cell.innerHTML = '';
          }
        }
      }
    }

    // Record initial state
    const initialScore = window.state.playerScore;
    const initialCurrentMultiplier = window.state.currentMultiplier;
    const initialConsecutiveClears = window.state.consecutiveClears;
    const initialPermanentMultiplier = window.state.permanentMultiplier;

    debugLog(`📊 Before Extend: Score=${initialScore}, Current Multiplier=${initialCurrentMultiplier}x, Consecutive Clears=${initialConsecutiveClears}, Permanent Multiplier=${initialPermanentMultiplier}x`);
    debugLog("Setup: Entire board filled except [5,5] - extend block should trigger 40x multiplier!");

    // Execute extend at [5,5] - this should fill the entire board and trigger 40x multiplier
    this.execute(5, 5, window.state);

    // Check results after a delay
    setTimeout(() => {
      const newScore = window.state.playerScore;
      const newCurrentMultiplier = window.state.currentMultiplier;
      const newConsecutiveClears = window.state.consecutiveClears;
      const newPermanentMultiplier = window.state.permanentMultiplier;

      debugLog(`📊 After Extend: Score=${newScore} (+${newScore - initialScore}), Current Multiplier=${newCurrentMultiplier}x (+${newCurrentMultiplier - initialCurrentMultiplier}), Consecutive Clears=${newConsecutiveClears} (+${newConsecutiveClears - initialConsecutiveClears}), Permanent Multiplier=${newPermanentMultiplier}x (+${newPermanentMultiplier - initialPermanentMultiplier})`);

      if (newCurrentMultiplier === 40) {
        debugLog("✅ SUCCESS: 40x multiplier achieved when entire board was cleared!");
      } else {
        debugLog(`❌ FAILURE: Expected 40x multiplier, got ${newCurrentMultiplier}x`);
      }

      debugLog("✅ Extend Block 40x multiplier test completed!");
    }, 5000); // Longer delay to account for extend animation
  }

  /**
   * Test the special ExtendBlock double combo for 40x multiplier
   */
  testExtendBlockDoubleCombo() {
    debugLog("Testing ExtendBlock double combo for 40x multiplier...");

    if (!window.state?.playerBoard || !window.state?.boardCells) {
      console.error("Game state not available for testing");
      return;
    }

    // Clear the board completely
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        window.state.playerBoard[r][c] = 0;
        const cell = window.state.boardCells[r][c];
        if (cell) {
          cell.classList.remove('filled', 'rainbow');
          cell.style.background = '';
          cell.innerHTML = '';
        }
      }
    }

    // Reset multiplier tracking
    window.state.turnCounter = 0;
    window.state.lastExtendBlockTurn = -1;
    window.state.lastExtendBlockWasOnEmptyField = false;
    window.state.currentMultiplier = 1;
    window.state.currentMultiplier40xRoundsRemaining = 0;

    debugLog("📊 Setup: Empty board, reset turn counter and ExtendBlock tracking");
    debugLog("Step 1: First ExtendBlock on empty field");

    // First ExtendBlock - should set tracking but not activate 40x multiplier
    window.state.turnCounter = 1;
    this.execute(5, 5, window.state);

    setTimeout(() => {
      debugLog(`After first ExtendBlock: lastExtendBlockTurn=${window.state.lastExtendBlockTurn}, lastExtendBlockWasOnEmptyField=${window.state.lastExtendBlockWasOnEmptyField}`);

      // Wait for first extend to complete, then clear board and do second ExtendBlock
      setTimeout(() => {
        // Clear board again to simulate empty field
        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 10; c++) {
            window.state.playerBoard[r][c] = 0;
            const cell = window.state.boardCells[r][c];
            if (cell) {
              cell.classList.remove('filled', 'rainbow');
              cell.style.background = '';
              cell.innerHTML = '';
            }
          }
        }

        debugLog("Step 2: Second ExtendBlock on empty field (should trigger 40x multiplier)");

        // Second ExtendBlock - should trigger 40x multiplier
        window.state.turnCounter = 2;
        const initialMultiplier = window.state.currentMultiplier;

        this.execute(4, 4, window.state);

        setTimeout(() => {
          const newMultiplier = window.state.currentMultiplier;
          const duration = window.state.currentMultiplier40xRoundsRemaining;

          debugLog(`📊 After second ExtendBlock: Current Multiplier=${newMultiplier}x, Duration=${duration} rounds`);

          if (newMultiplier === 40 && duration === 3) {
            debugLog("✅ SUCCESS: 40x multiplier activated with 3 rounds duration!");
          } else {
            debugLog(`❌ FAILURE: Expected 40x multiplier with 3 rounds, got ${newMultiplier}x with ${duration} rounds`);
          }

          debugLog("✅ ExtendBlock double combo test completed!");
        }, 2000);
      }, 3000);
    }, 1000);
  }
}

// Export singleton instance
export const extendBlock = new ExtendBlock();
