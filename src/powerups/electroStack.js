/* --------------------------------------------------------------------
 *  src/powerups/electroStack.js - Electro Stack Power-Up
 * ------------------------------------------------------------------ */

import { BasePowerUp } from './basePowerUp.js';

/**
 * Electro Stack Power-Up
 * Creates an electrical explosion that clears all blocks in the 8 surrounding cells
 */
export class ElectroStack extends BasePowerUp {
  constructor() {
    super({
      id: 'electro',
      name: 'Electro Stack',
      shape: [[0, 0]], // 1x1 shape
      color: '#FFD700',
      spawnRate: 0.05, // 5% chance
      emoji: '⚡',
      description: 'Clears all blocks in the 8 surrounding cells'
    });
  }

  /**
   * Get the flag property name for this power-up
   * @returns {string}
   */
  getFlag() {
    return 'isElectro';
  }

  /**
   * Apply special styling to electro blocks
   * @param {HTMLElement} block - The block element
   * @param {number} cellPx - Cell size in pixels
   */
  styleBlock(block, cellPx) {
    super.styleBlock(block, cellPx);
    block.style.backgroundImage = 'linear-gradient(45deg, #FFD700, #FFA500)';
    block.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.6)';
  }

  /**
   * Execute the electro effect when placed on the board
   * @param {number} centerRow - Placement row
   * @param {number} centerCol - Placement column
   * @param {Object} gameState - Current game state
   */
  execute(centerRow, centerCol, gameState) {
    console.log("Elektro Stack effect activated at position:", centerRow, centerCol);

    // Set flag to prevent automatic inventory generation during electro animation
    gameState.electroAnimationActive = true;

    // Define the 8 surrounding positions (all directions)
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],  // top-left, top, top-right
      [0, -1],           [0, 1],   // left, right
      [1, -1],  [1, 0],  [1, 1]    // bottom-left, bottom, bottom-right
    ];

    const clearedBlocks = [];
    let totalClearedBlocks = 0;

    // Collect all blocks in the surrounding fields
    directions.forEach(([dRow, dCol]) => {
      const targetRow = centerRow + dRow;
      const targetCol = centerCol + dCol;

      // Check if position is within board bounds
      if (targetRow >= 0 && targetRow < 10 && targetCol >= 0 && targetCol < 10) {
        if (gameState.playerBoard[targetRow][targetCol] === 1) {
          const cell = gameState.boardCells[targetRow][targetCol];
          clearedBlocks.push({
            row: targetRow,
            col: targetCol,
            cell: cell,
            color: cell.style.background,
            hasRainbow: cell.classList.contains('rainbow')
          });
          totalClearedBlocks++;
        }
      }
    });

    if (totalClearedBlocks === 0) {
      console.log("No blocks found to clear");
      this._showElectroCompleteMessage(0, 0);

      // Still need to regenerate inventory even if no blocks were cleared
      setTimeout(() => {
        this._regenerateInventoryAfterElectro(gameState);
      }, 1000);
      return;
    }

    // Show electro animation
    this._showElectroAnimation(centerRow, centerCol, clearedBlocks);

    // After animation: clear the blocks and calculate points
    setTimeout(() => {
      clearedBlocks.forEach(block => {
        gameState.playerBoard[block.row][block.col] = 0;
        block.cell.classList.remove("filled", "rainbow");
        block.cell.style.background = "";

        // Electrical clear animation on each block
        block.cell.classList.add("electro-zapped");
        setTimeout(() => {
          block.cell.classList.remove("electro-zapped");
        }, 600);
      });

      // Calculate points: 50 points per cleared block
      const pointsPerBlock = 5;
      const totalPoints = totalClearedBlocks * pointsPerBlock;

      // Increase permanent multiplier by +1 per cleared block
      const oldPermanentMultiplier = gameState.permanentMultiplier;
      gameState.permanentMultiplier += totalClearedBlocks;
      console.log(`Elektro Stack: Permanent multiplier increased from ${oldPermanentMultiplier.toFixed(0)}x to ${gameState.permanentMultiplier.toFixed(0)}x (+${totalClearedBlocks})`);

      // Add points with current multipliers
      const finalPoints = totalPoints * gameState.currentMultiplier * gameState.permanentMultiplier;
      gameState.playerScore += finalPoints;

      // Update displays
      if (window.player?.updateScoreDisplay) {
        window.player.updateScoreDisplay();
      }
      if (window.player?.updatePermanentMultiplierDisplay) {
        window.player.updatePermanentMultiplierDisplay();
      }

      // Show completion message
      this._showElectroCompleteMessage(totalClearedBlocks, finalPoints);

      // Regenerate inventory after electro effect
      setTimeout(() => {
        this._regenerateInventoryAfterElectro(gameState);
      }, 1000);

      console.log(`Elektro Stack: ${totalClearedBlocks} blocks cleared, ${finalPoints} points gained`);
    }, 800);
  }

  /**
   * Show electro animation effect
   * @param {number} centerRow - Center row position
   * @param {number} centerCol - Center column position
   * @param {Array} targetBlocks - Array of blocks to be cleared
   * @private
   */
  _showElectroAnimation(centerRow, centerCol, targetBlocks) {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.add("electro-effect");

      // Animation for the board
      setTimeout(() => {
        boardElement.classList.remove("electro-effect");
      }, 1500);
    }

    // Animate each block to be cleared individually
    targetBlocks.forEach((block, index) => {
      setTimeout(() => {
        block.cell.classList.add("electro-target");
        setTimeout(() => {
          block.cell.classList.remove("electro-target");
        }, 400);
      }, index * 50); // Staggered animation
    });
  }

  /**
   * Show electro completion message
   * @param {number} blocksCleared - Number of blocks cleared
   * @param {number} pointsGained - Points gained from the effect
   * @private
   */
  _showElectroCompleteMessage(blocksCleared, pointsGained) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "electro-complete-message";

    let messageText = "⚡ Elektro Stack activated!";
    if (blocksCleared > 0) {
      messageText += ` ${blocksCleared} blocks cleared! +${pointsGained} points!`;
    } else {
      messageText += " No blocks affected.";
    }

    messageDiv.textContent = messageText;
    messageDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: #000;
      padding: 15px 25px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
      backdrop-filter: blur(5px);
      animation: electroMessageFade 3s ease-out forwards;
      border: 2px solid #FFD700;
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  /**
   * Regenerate inventory after electro effect
   * @param {Object} gameState - Current game state
   * @private
   */
  _regenerateInventoryAfterElectro(gameState) {
    console.log("Electro Stack: Starting inventory regeneration...");

    // Use robust inventory regeneration
    if (window.player?.regenerateInventoryAfterPowerUp) {
      window.player.regenerateInventoryAfterPowerUp(gameState, "Electro Stack");
    } else {
      // Fallback to original method
      if (window.player?.generatePieces) {
        window.player.generatePieces();
      }
      if (window.player?.renderPieces) {
        window.player.renderPieces();
      }
    }

    // Clear the electro animation flag to allow normal inventory generation
    gameState.electroAnimationActive = false;

    console.log("Electro Stack: Inventory regenerated after effect completion");
  }

  /**
   * Test the electro effect with sample blocks
   */
  testEffect() {
    console.log("Testing Electro Stack effect...");

    if (!window.state?.playerBoard || !window.state?.boardCells) {
      console.error("Game state not available for testing");
      return;
    }

    // Clear any existing pieces in inventory
    window.state.playerPieces = [];

    // Add an electro piece to inventory
    window.state.playerPieces = [{
      shape: [[0, 0]],
      color: '#FFD700',
      isElectro: true
    }];

    if (window.player?.renderPieces) {
      window.player.renderPieces();
    }
    console.log("✅ Electro piece added to inventory");

    // Add test blocks around position (5,5) in a 3x3 pattern
    const testBlocks = [
      [4, 4], [4, 5], [4, 6],
      [5, 4],         [5, 6],
      [6, 4], [6, 5], [6, 6]
    ];

    testBlocks.forEach(([r, c]) => {
      window.state.playerBoard[r][c] = 1;
      const cell = window.state.boardCells[r][c];
      if (cell) {
        cell.classList.add('filled', 'rainbow');
        cell.style.background = '#FF6B6B';
      }
    });

    const oldScore = window.state.playerScore;
    const oldMultiplier = window.state.permanentMultiplier;

    console.log("✅ Test blocks placed around position (5,5)");
    console.log(`📊 Before: Score=${oldScore}, Multiplier=${oldMultiplier}x`);

    // Execute the electro effect at center position
    this.execute(5, 5, window.state);

    // Check results after a delay
    setTimeout(() => {
      const newScore = window.state.playerScore;
      const newMultiplier = window.state.permanentMultiplier;
      console.log(`📊 After: Score=${newScore} (+${newScore - oldScore}), Multiplier=${newMultiplier}x (+${newMultiplier - oldMultiplier})`);
      console.log("✅ Electro Stack test completed!");
    }, 2000);
  }
}

// Export singleton instance
export const electroStack = new ElectroStack();
