/* --------------------------------------------------------------------
 *  src/powerups/extendBlock.js - Extend Block Power-Up
 * ------------------------------------------------------------------ */

import { BasePowerUp } from './basePowerUp.js';

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
      spawnRate: 0.5, // 50% chance for testing
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
    console.log(`Extend Block effect activated at position [${row}, ${col}]!`);

    // Set flag to prevent automatic inventory generation during extend animation
    gameState.extendAnimationActive = true;

    // Start the extend animation
    this._showExtendAnimation();

    // Start the recursive expansion process
    setTimeout(() => {
      this._startExtendProcess(row, col, gameState);
    }, 500);
  }

  /**
   * Show extend animation effect
   * @private
   */
  _showExtendAnimation() {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.add("extend-effect");
      console.log("🔄 Extend animation started - effect will run during entire extend event");

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
      console.log("🔄 Extend animation ended");
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
    console.log(`Starting extend process at position [${startRow}, ${startCol}]`);

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

    // Use a simple queue-based approach for reliable expansion
    const queue = [{row: startRow, col: startCol}];
    const processed = new Set();
    const allNewPositions = [];
    let waveNumber = 0;

    const processNextWave = () => {
      if (queue.length === 0) {
        // No more positions to process, finish the extend effect
        console.log(`Extend process completed after ${waveNumber} waves. Total new positions: ${allNewPositions.length}`);
        setTimeout(() => {
          this._finishExtendEffect(gameState, allNewPositions);
        }, 300);
        return;
      }

      console.log(`Processing wave ${waveNumber} with ${queue.length} positions`);

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
            setTimeout(processNextWave, 300);
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
            setTimeout(processNextWave, 300); // Wait a bit before next wave
          }
        }, index * 50); // Staggered animation within the wave
      });
    };

    // Start processing after a short delay to show the initial placement
    setTimeout(() => {
      processNextWave();
    }, 200);
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
          }, 300);
        }

        // Create visual flying animation (doesn't affect game logic)
        this._createFlyingBlockAnimation(sourceCell, cell, dirIndex);

        newPositions.push({row: newRow, col: newCol});
        console.log(`Extended to position [${newRow}, ${newCol}]`);
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
      }, 400);
    }, dirIndex * 50); // Staggered delay for each direction
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
    console.log(`Extend effect completed! Extended to ${extendedPositions.length} new positions + 1 starting position = ${totalExtendedCount} total.`);

    // Check for full lines after extend effect
    setTimeout(() => {
      this._checkAndClearLinesAfterExtend(gameState, extendedPositions, totalExtendedCount);
    }, 500);
  }

  /**
   * Check for full lines after extend effect and clear them
   * @param {Object} gameState - Current game state
   * @param {Array} extendedPositions - All positions that were filled during extend
   * @private
   */
  _checkAndClearLinesAfterExtend(gameState, extendedPositions, totalExtendedCount) {
    console.log("Checking for full lines after extend effect...");

    // Check if any lines are full after extension using player's public API
    const hasFullLines = window.player?.hasFullLines?.();

    if (hasFullLines) {
      console.log("Full lines detected after extend effect - clearing them!");

      // Clear the full lines using the player's public clearLines function
      if (window.player?.clearLines) {
        window.player.clearLines();
      }

      // After a short delay, regenerate inventory
      setTimeout(() => {
        this._regenerateInventoryAfterExtend(gameState, true, totalExtendedCount);
      }, 1000); // Give time for line clearing animations
    } else {
      // No full lines, proceed directly to inventory regeneration
      this._regenerateInventoryAfterExtend(gameState, false, totalExtendedCount);
    }
  }

  /**
   * Regenerate inventory after extend effect
   * @param {Object} gameState - Current game state
   * @param {boolean} linesWereCleared - Whether lines were cleared during extend
   * @param {number} extendedCount - Number of cells that were extended
   * @private
   */
  _regenerateInventoryAfterExtend(gameState, linesWereCleared = false, extendedCount = 0) {
    // Wait for animations to complete, then show message first
    setTimeout(() => {
      // Show completion message with appropriate text
      this._showExtendCompleteMessage(linesWereCleared, extendedCount, () => {
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
      });
    }, 1000); // Wait for extend animations to complete
  }

  /**
   * Show extend completion message
   * @param {boolean} linesWereCleared - Whether lines were cleared during extend
   * @param {number} extendedCount - Number of cells that were extended
   * @param {Function} callback - Function to call after message appears
   * @private
   */
  _showExtendCompleteMessage(linesWereCleared = false, extendedCount = 0, callback = null) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "extend-complete-message";

    // Different message based on whether lines were cleared and extend count
    let messageText;
    if (linesWereCleared) {
      messageText = `🔄 Extend abgeschlossen! ${extendedCount} Zellen erweitert, Linien gelöscht!`;
    } else if (extendedCount > 0) {
      messageText = `🔄 Extend abgeschlossen! ${extendedCount} Zellen erweitert!`;
    } else {
      messageText = "🔄 Extend abgeschlossen! Keine freien Zellen gefunden.";
    }

    messageDiv.textContent = messageText;
    messageDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 149, 0, 0.9);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 0 20px rgba(255, 149, 0, 0.8);
      backdrop-filter: blur(5px);
      animation: extendMessageFade 3s ease-out forwards;
    `;

    document.body.appendChild(messageDiv);

    // Execute callback after message is shown
    if (callback) {
      setTimeout(() => {
        callback();
      }, 500); // Wait 500ms after message appears before generating inventory
    }

    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  /**
   * Test the extend effect with a positioned block
   */
  testEffect() {
    console.log("Testing Extend Block effect...");

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

    console.log("✅ Test boundaries added to board");
    console.log("Now execute extend effect from center position [5, 5]...");

    // Execute the extend effect from center
    this.execute(5, 5, window.state);
  }
}

// Export singleton instance
export const extendBlock = new ExtendBlock();
