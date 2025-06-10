/* --------------------------------------------------------------------
 *  src/powerups/stormBlock.js - Storm Block Power-Up
 * ------------------------------------------------------------------ */

import { BasePowerUp } from './basePowerUp.js';

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = false;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

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
      spawnRate: 0.11, // ~33.33% individual chance (100% base chance / 3 powerups)
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
    debugLog("Storm effect activated!");

    // Set flag to prevent automatic inventory generation during storm animation
    gameState.stormAnimationActive = true;

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
      }, 1000); // 33% faster: 1500 -> 1000
      return;
    }

    // 2. Show storm animation on the board
    this._showStormAnimation();

    // 3. After short delay: redistribute blocks randomly
    setTimeout(() => {
      this._shuffleAndPlaceBlocks(filledBlocks, gameState);
    }, 535); // 33% faster: 800 -> 535
  }  /**
   * Show storm animation effect
   * @private
   */
  _showStormAnimation() {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.add("storm-effect");
      debugLog("🌪️ Storm animation started - effect will run during entire storm event");

      // Show power-up indicator
      if (window.showPowerUpIndicator) {
        window.showPowerUpIndicator('storm', 'Storm Block');
      }

      // Play storm sound effect
      if (window.audio?.stormSound) {
        window.audio.stormSound.play();
      }

      // Animation will be removed when the storm is complete
      // Duration is managed by the complete storm process
    }
  }

  /**
   * Hide storm animation effect
   * @private
   */
  _hideStormAnimation() {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.remove("storm-effect");
      debugLog("🌪️ Storm animation ended");
    }

    // Stop storm sound effect
    if (window.audio?.stopStormSound) {
      window.audio.stopStormSound();
    }

    // Hide power-up indicator
    if (window.hidePowerUpIndicator) {
      window.hidePowerUpIndicator();
    }
  }

  /**
   * Shuffle and place blocks with weighted distribution favoring outer areas
   * @param {Array} blocks - Array of block objects to place
   * @param {Object} gameState - Current game state
   * @private
   */
  _shuffleAndPlaceBlocks(blocks, gameState) {
    // Find all empty positions and categorize them by distance from edge
    const emptyPositions = [];
    const outerPositions = []; // Distance 0 - Edges and corners
    const secondLayerPositions = []; // Distance 1 - Second layer from edge
    const innerMostPositions = []; // Distance 2
    const centerPositions = []; // Distance 3+ - Center area
    const middlePositions = []; // Distance 1 (legacy middle)

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (gameState.playerBoard[r][c] === 0) {
          const position = { row: r, col: c };
          emptyPositions.push(position);

          // Calculate distance from edges to determine weight category
          const distanceFromEdge = Math.min(r, c, 9 - r, 9 - c);

          if (distanceFromEdge === 0) {
            outerPositions.push(position);
          } else if (distanceFromEdge === 1) {
            secondLayerPositions.push(position);
            middlePositions.push(position); // for legacy logic
          } else if (distanceFromEdge === 2) {
            innerMostPositions.push(position);
          } else {
            centerPositions.push(position);
          }
        }
      }
    }

    // Determine which weighting to use
    let weightedPositions = [];
    if (blocks.length <= 64) {
      // New logic: 75% outer, 25% second layer, 0% elsewhere
      // 75 units outer, 25 units second layer
      for (let i = 0; i < 75; i++) {
        weightedPositions.push(...outerPositions);
      }
      for (let i = 0; i < 25; i++) {
        weightedPositions.push(...secondLayerPositions);
      }
      // If not enough positions, add center as overflow
      const preferredPositionsCount = outerPositions.length + secondLayerPositions.length;
      if (blocks.length > preferredPositionsCount) {
        debugLog(`Storm overflow: Need ${blocks.length} positions but only ${preferredPositionsCount} preferred positions available. Using center positions.`);
        weightedPositions.push(...centerPositions);
      }
      debugLog(`Storm placement distribution (<=64): Outer=${outerPositions.length} (75%), SecondLayer=${secondLayerPositions.length} (25%), Center=${centerPositions.length} (0%/overflow)`);
    } else {
      // Legacy logic: 50% outer, 25% middle, 25% inner-most, 0% center
      for (let i = 0; i < 50; i++) {
        weightedPositions.push(...outerPositions);
      }
      for (let i = 0; i < 25; i++) {
        weightedPositions.push(...middlePositions);
      }
      for (let i = 0; i < 25; i++) {
        weightedPositions.push(...innerMostPositions);
      }
      const preferredPositionsCount = outerPositions.length + middlePositions.length + innerMostPositions.length;
      if (blocks.length > preferredPositionsCount) {
        debugLog(`Storm overflow: Need ${blocks.length} positions but only ${preferredPositionsCount} preferred positions available. Using center positions.`);
        weightedPositions.push(...centerPositions);
      }
      debugLog(`Storm placement distribution (>64): Outer=${outerPositions.length} (50%), Middle=${middlePositions.length} (25%), Inner-most=${innerMostPositions.length} (25%), Center=${centerPositions.length} (0%/overflow)`);
    }

    // Shuffle the weighted positions
    for (let i = weightedPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [weightedPositions[i], weightedPositions[j]] = [weightedPositions[j], weightedPositions[i]];
    }

    // Select unique positions from the weighted pool
    const selectedPositions = [];
    const usedPositions = new Set();

    for (const pos of weightedPositions) {
      const posKey = `${pos.row},${pos.col}`;
      if (!usedPositions.has(posKey) && selectedPositions.length < blocks.length) {
        selectedPositions.push(pos);
        usedPositions.add(posKey);
      }
    }

    // Place blocks in weighted positions
    blocks.forEach((block, index) => {
      setTimeout(() => {
        if (index < selectedPositions.length) {
          const newPos = selectedPositions[index];
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
            }, 200); // 33% faster: 300 -> 200
          }

          // Debug log to show placement preference
          const distanceFromEdge = Math.min(newPos.row, newPos.col, 9 - newPos.row, 9 - newPos.col);
          let zone;
          if (blocks.length <= 64) {
            zone = distanceFromEdge === 0 ? "OUTER(75%)" :
                   distanceFromEdge === 1 ? "SECOND-LAYER(25%)" :
                   "CENTER(0%/overflow)";
          } else {
            zone = distanceFromEdge === 0 ? "OUTER(50%)" :
                   distanceFromEdge === 1 ? "MIDDLE(25%)" :
                   distanceFromEdge === 2 ? "INNER-MOST(25%)" :
                   "CENTER(0%/overflow)";
          }
          debugLog(`Storm block ${index + 1} placed at [${newPos.row},${newPos.col}] in ${zone} zone (distance from edge: ${distanceFromEdge})`);

          // After the last block: check for full lines, then regenerate inventory
          if (index === blocks.length - 1) {
            setTimeout(() => {
              this._checkAndClearLinesAfterStorm(gameState);
            }, 335); // 33% faster: 500 -> 335
          }
        }
      }, index * 33); // 33% faster: 50 -> 33
    });
  }  /**
   * Check for full lines after storm redistribution and clear them
   * @param {Object} gameState - Current game state
   * @private
   */
  _checkAndClearLinesAfterStorm(gameState) {
    debugLog("Checking for full lines after storm redistribution...");

    // Check if any lines are full after redistribution using player's public API
    const hasFullLines = window.player?.hasFullLines?.();

    if (hasFullLines) {
      debugLog("Full lines detected after storm - clearing them first!");

      // Track values before line clearing for gain calculation
      const oldScore = gameState.playerScore;
      const oldPermanentMultiplier = gameState.permanentMultiplier;
      const oldCurrentMultiplier = gameState.currentMultiplier;

      // Clear the full lines using the player's public clearLines function
      if (window.player?.clearLines) {
        window.player.clearLines();
      }

      // Calculate gains after line clearing
      const permanentMultiplierGain = gameState.permanentMultiplier - oldPermanentMultiplier;
      const currentMultiplierGain = gameState.currentMultiplier - oldCurrentMultiplier;
      const pointsGained = gameState.playerScore - oldScore;

      // After a short delay, regenerate inventory
      setTimeout(() => {
        this._regenerateInventoryAfterStorm(gameState, true, permanentMultiplierGain, currentMultiplierGain, pointsGained);
      }, 670); // 33% faster: 1000 -> 670
    } else {
      // No full lines, proceed directly to inventory regeneration
      this._regenerateInventoryAfterStorm(gameState, false, 0, 0, 0);
    }
  }  /**
   * Regenerate inventory after storm effect
   * @param {Object} gameState - Current game state
   * @param {boolean} linesWereCleared - Whether lines were cleared during storm
   * @param {number} permanentMultiplierGain - Permanent multiplier gained
   * @param {number} currentMultiplierGain - Current multiplier gained
   * @param {number} pointsGained - Points gained
   * @private
   */
  _regenerateInventoryAfterStorm(gameState, linesWereCleared = false, permanentMultiplierGain = 0, currentMultiplierGain = 0, pointsGained = 0) {
    // Wait for animations to complete, then show message first
    setTimeout(() => {
      // Nach Score/Multiplier-Änderung Animationen triggern
      // Note: Score animation is already handled by the clearLines() function with factor breakdown
      // if (window.player?.animateScore) window.player.animateScore(pointsGained); // Removed to avoid duplicate animations
      if (window.player?.animatePermanentMultiplier) window.player.animatePermanentMultiplier(permanentMultiplierGain);
      if (window.player?.animateCurrentMultiplier) window.player.animateCurrentMultiplier(currentMultiplierGain);

      // Use robust inventory regeneration
      if (window.player?.regenerateInventoryAfterPowerUp) {
        window.player.regenerateInventoryAfterPowerUp(gameState, "Storm Block");
      } else {
        // Fallback to original method
        if (window.player?.generatePieces) {
          window.player.generatePieces();
        }
        if (window.player?.renderPieces) {
          window.player.renderPieces();
        }
      }

      // Clear the storm animation flag to allow normal inventory generation
      gameState.stormAnimationActive = false;

      // Hide the storm animation when complete
      this._hideStormAnimation();
    }, 670); // 33% faster: 1000 -> 670
  }

  /**
   * Test the storm effect with sample blocks
   */
  testEffect() {
    debugLog("Testing Storm Block effect...");

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

    debugLog("✅ Test blocks added to board");
    debugLog("Now execute storm effect...");

    // Execute the storm effect
    this.execute(0, 0, window.state);
  } /**
   * Test the storm effect with weighted distribution analysis
   */
  testWeightedDistribution() {
    debugLog("Testing Storm Block weighted distribution...");

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

    // Add test blocks spread across the board to simulate a typical storm scenario
    const testPositions = [
      [1, 1], [1, 8], [8, 1], [8, 8], // corners area
      [3, 3], [3, 6], [6, 3], [6, 6], // middle area
      [4, 4], [5, 5], [4, 5], [5, 4]  // center area
    ];

    testPositions.forEach(([r, c]) => {
      window.state.playerBoard[r][c] = 1;
      const cell = window.state.boardCells[r][c];
      if (cell) {
        cell.classList.add('filled', 'rainbow');
        cell.style.background = '#FF6B6B';
      }
    });

    debugLog(`✅ Added ${testPositions.length} test blocks for weighted distribution test`);
    debugLog("🌪️ Executing Storm Block with new weighted distribution...");
    debugLog("📊 Watch the console for placement zone analysis");

    // Execute the storm effect
    this.execute(0, 0, window.state);

    // Analyze distribution after storm completes
    setTimeout(() => {
      let outerCount = 0, middleCount = 0, innerCount = 0;

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (window.state.playerBoard[r][c] === 1) {
            const distanceFromEdge = Math.min(r, c, 9 - r, 9 - c);
            if (distanceFromEdge === 0) outerCount++;
            else if (distanceFromEdge === 1) middleCount++;
            else innerCount++;
          }
        }
      }

      debugLog("📊 FINAL DISTRIBUTION ANALYSIS:");
      debugLog(`   OUTER zone (edges): ${outerCount} blocks`);
      debugLog(`   MIDDLE zone: ${middleCount} blocks`);
      debugLog(`   INNER zone (center): ${innerCount} blocks`);
      debugLog(`   Outer preference ratio: ${((outerCount / (outerCount + middleCount + innerCount)) * 100).toFixed(1)}%`);

      if (outerCount > innerCount) {
        debugLog("✅ SUCCESS: Outer zone has more blocks than inner zone!");
      } else {
        debugLog("⚠️ WARNING: Distribution may need adjustment - inner zone has more blocks");
      }
    }, 5000);
  }
}

// Export singleton instance
export const stormBlock = new StormBlock();
