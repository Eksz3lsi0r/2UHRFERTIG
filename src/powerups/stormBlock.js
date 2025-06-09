/* --------------------------------------------------------------------
 *  src/powerups/stormBlock.js - Storm Block Power-Up
 * ------------------------------------------------------------------ */

import { BasePowerUp } from './basePowerUp.js';

/**
 * Storm Block Power-Up
 * Collects all blocks on the board and redistributes them randomly
 */
export class StormBlock extends BasePowerUp {
  constructor() {
    super({
      id: 'storm',
      name: 'Storm Block',
      shape: [[0, 0]], // 1x1 shape
      color: '#4a90e2',
      spawnRate: 0.1, // 10% chance
      emoji: '🌪️',
      description: 'Collects and redistributes all blocks on the board'
    });
  }

  /**
   * Get the flag property name for this power-up
   * @returns {string}
   */
  getFlag() {
    return 'isStorm';
  }

  /**
   * Apply special styling to storm blocks
   * @param {HTMLElement} block - The block element
   * @param {number} cellPx - Cell size in pixels
   */
  styleBlock(block, cellPx) {
    super.styleBlock(block, cellPx);
    block.style.backgroundImage = 'radial-gradient(circle, #4a90e2, #2171b5)';
    block.style.boxShadow = '0 0 10px rgba(74, 144, 226, 0.6)';
  }

  /**
   * Execute the storm effect when placed on the board
   * @param {number} row - Placement row (unused for storm)
   * @param {number} col - Placement column (unused for storm)
   * @param {Object} gameState - Current game state
   */
  execute(row, col, gameState) {
    console.log("Storm effect activated!");

    // Set flag to prevent automatic inventory generation during storm animation
    gameState.stormAnimationActive = true;

    // Immediately clear inventory when storm is placed
    gameState.playerPieces = [];
    if (window.player?.renderPieces) {
      window.player.renderPieces();
    }

    // 1. Collect all filled blocks from the board
    const filledBlocks = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (gameState.playerBoard[r][c] === 1) {
          const cell = gameState.boardCells[r][c];
          filledBlocks.push({
            row: r,
            col: c,
            color: cell.style.background,
            hasRainbow: cell.classList.contains('rainbow')
          });
          // Remove block from board
          gameState.playerBoard[r][c] = 0;
          cell.classList.remove("filled", "rainbow");
          cell.style.background = "";
        }
      }
    }

    if (filledBlocks.length === 0) {
      // No effect if no blocks present - but still regenerate inventory after animation
      this._showStormAnimation();
      setTimeout(() => {
        this._regenerateInventoryAfterStorm(gameState, false);
      }, 1500);
      return;
    }

    // 2. Show storm animation on the board
    this._showStormAnimation();

    // 3. After short delay: redistribute blocks randomly
    setTimeout(() => {
      this._shuffleAndPlaceBlocks(filledBlocks, gameState);
    }, 800);
  }

  /**
   * Show storm animation effect
   * @private
   */
  _showStormAnimation() {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.add("storm-effect");

      // Animation for 1.5 seconds
      setTimeout(() => {
        boardElement.classList.remove("storm-effect");
      }, 1500);
    }
  }

  /**
   * Shuffle and place blocks randomly on the board
   * @param {Array} blocks - Array of block objects to place
   * @param {Object} gameState - Current game state
   * @private
   */
  _shuffleAndPlaceBlocks(blocks, gameState) {
    // Find all empty positions
    const emptyPositions = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (gameState.playerBoard[r][c] === 0) {
          emptyPositions.push({ row: r, col: c });
        }
      }
    }

    // Shuffle the empty positions
    for (let i = emptyPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptyPositions[i], emptyPositions[j]] = [emptyPositions[j], emptyPositions[i]];
    }

    // Place blocks in shuffled positions
    blocks.forEach((block, index) => {
      setTimeout(() => {
        if (index < emptyPositions.length) {
          const newPos = emptyPositions[index];
          gameState.playerBoard[newPos.row][newPos.col] = 1;
          const cell = gameState.boardCells[newPos.row][newPos.col];

          if (cell) {
            cell.classList.add("filled");
            if (block.hasRainbow) {
              cell.classList.add("rainbow");
            }
            cell.style.background = block.color;

            // Placement animation
            cell.classList.add("storm-placed");
            setTimeout(() => {
              cell.classList.remove("storm-placed");
            }, 300);
          }

          // After the last block: check for full lines, then regenerate inventory
          if (index === blocks.length - 1) {
            setTimeout(() => {
              this._checkAndClearLinesAfterStorm(gameState);
            }, 500);
          }
        }
      }, index * 50); // Staggered animation
    });
  }  /**
   * Check for full lines after storm redistribution and clear them
   * @param {Object} gameState - Current game state
   * @private
   */
  _checkAndClearLinesAfterStorm(gameState) {
    console.log("Checking for full lines after storm redistribution...");

    // Check if any lines are full after redistribution using player's public API
    const hasFullLines = window.player?.hasFullLines?.();

    if (hasFullLines) {
      console.log("Full lines detected after storm - clearing them first!");

      // Clear the full lines using the player's public clearLines function
      if (window.player?.clearLines) {
        window.player.clearLines();
      }

      // After a short delay, regenerate inventory
      setTimeout(() => {
        this._regenerateInventoryAfterStorm(gameState, true); // true = lines were cleared
      }, 1000); // Give time for line clearing animations
    } else {
      // No full lines, proceed directly to inventory regeneration
      this._regenerateInventoryAfterStorm(gameState, false); // false = no lines cleared
    }
  }  /**
   * Regenerate inventory after storm effect
   * @param {Object} gameState - Current game state
   * @param {boolean} linesWereCleared - Whether lines were cleared during storm
   * @private
   */
  _regenerateInventoryAfterStorm(gameState, linesWereCleared = false) {
    // Wait for animations to complete, then show message first
    setTimeout(() => {
      // Show completion message with appropriate text
      this._showStormCompleteMessage(linesWereCleared, () => {
        // Generate new pieces only after message appears
        if (window.player?.generatePieces) {
          window.player.generatePieces();
        }

        // Re-render pieces
        if (window.player?.renderPieces) {
          window.player.renderPieces();
        }

        // Clear the storm animation flag to allow normal inventory generation
        gameState.stormAnimationActive = false;
      });
    }, 1000); // Wait for storm animations to complete
  }

  /**
   * Show storm completion message
   * @param {boolean} linesWereCleared - Whether lines were cleared during storm
   * @param {Function} callback - Function to call after message appears
   * @private
   */
  _showStormCompleteMessage(linesWereCleared = false, callback = null) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "storm-complete-message";

    // Different message based on whether lines were cleared
    const messageText = linesWereCleared
      ? "🌪️ Sturm abgeschlossen! Linien gelöscht und neues Inventar generiert!"
      : "🌪️ Sturm abgeschlossen! Neues Inventar generiert!";

    messageDiv.textContent = messageText;
    messageDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(138, 43, 226, 0.9);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 0 20px rgba(138, 43, 226, 0.8);
      backdrop-filter: blur(5px);
      animation: stormMessageFade 3s ease-out forwards;
    `;

    document.body.appendChild(messageDiv);

    // Execute callback after message is shown (short delay for visibility)
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
   * Test the storm effect with sample blocks
   */
  testEffect() {
    console.log("Testing Storm Block effect...");

    if (!window.state?.playerBoard || !window.state?.boardCells) {
      console.error("Game state not available for testing");
      return;
    }

    // Add some test blocks to the board
    const testPositions = [
      [2, 2], [2, 3], [2, 4],
      [4, 1], [4, 2], [4, 3],
      [6, 5], [6, 6], [6, 7]
    ];

    testPositions.forEach(([r, c]) => {
      window.state.playerBoard[r][c] = 1;
      const cell = window.state.boardCells[r][c];
      if (cell) {
        cell.classList.add('filled', 'rainbow');
        cell.style.background = '#FF6B6B';
      }
    });

    console.log("✅ Test blocks added to board");
    console.log("Now execute storm effect...");

    // Execute the storm effect
    this.execute(0, 0, window.state);
  }
}

// Export singleton instance
export const stormBlock = new StormBlock();
