/* --------------------------------------------------------------------
 *  src/powerups/electroStack.js - Electro Stack Power-Up
 * ------------------------------------------------------------------ */

import { BasePowerUp } from './basePowerUp.js';

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = false;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    debugLog(...args);
  }
}

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
      spawnRate: 0.11, // ~33.33% individual chance (100% base chance / 3 powerups)
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
    debugLog("Elektro Stack effect activated at position:", centerRow, centerCol);

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
      debugLog("No blocks found to clear");

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
      const permanentMultiplierGain = totalClearedBlocks;
      debugLog(`Elektro Stack: Permanent multiplier increased from ${oldPermanentMultiplier.toFixed(0)}x to ${gameState.permanentMultiplier.toFixed(0)}x (+${permanentMultiplierGain})`);

      // ElectroStack doesn't increase current multiplier, so current multiplier gain is 0
      const currentMultiplierGain = 0;

      // Add points with both multipliers
      const basePoints = totalPoints;
      const finalPoints = basePoints * gameState.currentMultiplier * gameState.permanentMultiplier;
      gameState.playerScore += finalPoints;

      // Update displays
      if (window.player?.updateScoreDisplay) {
        window.player.updateScoreDisplay();
      }
      if (window.player?.updatePermanentMultiplierDisplay) {
        window.player.updatePermanentMultiplierDisplay();
      }

      // Nach Score/Multiplier-Änderung Animationen triggern mit Faktoren-Aufschlüsselung
      if (window.player?.animateScore) window.player.animateScore(finalPoints, basePoints, gameState.permanentMultiplier, gameState.currentMultiplier);
      if (window.player?.animatePermanentMultiplier) window.player.animatePermanentMultiplier(permanentMultiplierGain);
      if (window.player?.animateCurrentMultiplier) window.player.animateCurrentMultiplier(currentMultiplierGain);

      // Regenerate inventory after electro effect
      setTimeout(() => {
        this._regenerateInventoryAfterElectro(gameState);
      }, 1000);

      debugLog(`Elektro Stack: ${totalClearedBlocks} blocks cleared, ${finalPoints} points gained`);
    }, 800);
  }

  /**
   * Show electro animation effect
   * @param {number} centerRow - Center row position
   * @param {number} centerCol - Center column position
   * @param {Array} targetBlocks - Array of blocks to be cleared
   * @private
   */  _showElectroAnimation(centerRow, centerCol, targetBlocks) {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.add("electro-effect");
      debugLog("⚡ Electro animation started - effect will run during entire electro event");

      // Show power-up indicator
      if (window.showPowerUpIndicator) {
        window.showPowerUpIndicator('electro', 'Electro Stack');
      }

      // Play electro sound effect
      if (window.audio?.electroSound) {
        window.audio.electroSound.play();
      }

      // Animation will be removed when the electro effect is complete
      // Duration is managed by the complete electro process
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
   * Hide electro animation effect
   * @private
   */
  _hideElectroAnimation() {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.remove("electro-effect");
      debugLog("⚡ Electro animation ended");
    }

    // Stop electro sound effect
    if (window.audio?.stopElectroSound) {
      window.audio.stopElectroSound();
    }

    // Hide power-up indicator
    if (window.hidePowerUpIndicator) {
      window.hidePowerUpIndicator();
    }
  }

  /**
   * Regenerate inventory after electro effect
   * @param {Object} gameState - Current game state
   * @private
   */
  _regenerateInventoryAfterElectro(gameState) {
    debugLog("Electro Stack: Starting inventory regeneration...");

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

    // Hide the electro animation when complete
    this._hideElectroAnimation();

    debugLog("Electro Stack: Inventory regenerated after effect completion");
  }

  /**
   * Test the electro effect with sample blocks
   */
  testEffect() {
    debugLog("Testing Electro Stack effect...");

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
    debugLog("✅ Electro piece added to inventory");

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

    debugLog("✅ Test blocks placed around position (5,5)");
    debugLog(`📊 Before: Score=${oldScore}, Multiplier=${oldMultiplier}x`);

    // Execute the electro effect at center position
    this.execute(5, 5, window.state);

    // Check results after a delay
    setTimeout(() => {
      const newScore = window.state.playerScore;
      const newMultiplier = window.state.permanentMultiplier;
      debugLog(`📊 After: Score=${newScore} (+${newScore - oldScore}), Multiplier=${newMultiplier}x (+${newMultiplier - oldMultiplier})`);
      debugLog("✅ Electro Stack test completed!");
    }, 2000);
  }
}

// Export singleton instance
export const electroStack = new ElectroStack();
