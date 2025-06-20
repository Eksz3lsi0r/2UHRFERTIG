/* --------------------------------------------------------------------
 *  src/powerups/powerUpRegistry.js - Power-Up Registry System
 * ------------------------------------------------------------------ */

import { electroStack } from './electroStack.js';
import { extendBlock } from './extendBlock.js';
import { stormBlock } from './stormBlock.js';

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = false;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

/**
 * Central registry for all power-ups in the game
 * Provides a unified interface for managing different power-up types
 */
class PowerUpRegistry {
  constructor() {
    this.powerUps = new Map();
    this.setupRegistry();
  }

  /**
   * Initialize and register all power-ups
   * @private
   */
  setupRegistry() {
    // Register built-in power-ups
    this.register(stormBlock);
    this.register(electroStack);
    this.register(extendBlock);

    debugLog(`Power-Up Registry initialized with ${this.powerUps.size} power-ups:`,
                Array.from(this.powerUps.keys()));
  }

  /**
   * Register a new power-up
   * @param {BasePowerUp} powerUp - The power-up instance to register
   */
  register(powerUp) {
    if (!powerUp || !powerUp.id) {
      throw new Error('Invalid power-up: must have an id property');
    }

    this.powerUps.set(powerUp.id, powerUp);

    // Add test functions to global scope for debugging
    const testFunctions = powerUp.getTestFunctions();
    Object.assign(window, testFunctions);

    debugLog(`Registered power-up: ${powerUp.name} (${powerUp.id})`);
  }

  /**
   * Get a power-up by its ID
   * @param {string} id - The power-up ID
   * @returns {BasePowerUp|null}
   */
  get(id) {
    return this.powerUps.get(id) || null;
  }

  /**
   * Get all registered power-ups
   * @returns {Array<BasePowerUp>}
   */
  getAll() {
    return Array.from(this.powerUps.values());
  }

  /**
   * Check if a piece object is any type of power-up
   * @param {Object} pieceObj - The piece object to check
   * @returns {BasePowerUp|null} - The power-up instance if found, null otherwise
   */
  identifyPowerUp(pieceObj) {
    for (const powerUp of this.powerUps.values()) {
      if (powerUp.isPowerUp(pieceObj)) {
        return powerUp;
      }
    }
    return null;
  }

  /**
   * Execute the appropriate power-up effect for a piece
   * @param {Object} pieceObj - The piece object
   * @param {number} row - Placement row
   * @param {number} col - Placement column
   * @param {Object} gameState - Current game state
   * @returns {boolean} - True if a power-up was executed, false otherwise
   */
  executePowerUp(pieceObj, row, col, gameState) {
    const powerUp = this.identifyPowerUp(pieceObj);
    if (powerUp) {
      debugLog(`Executing ${powerUp.name} power-up...`);

      // Immediately clear the entire inventory when any power-up is executed
      gameState.playerPieces = [];
      if (window.player?.renderPieces) {
        window.player.renderPieces();
      }

      powerUp.execute(row, col, gameState);
      return true;
    }
    return false;
  }

  /**
   * Apply power-up generation logic during piece generation
   * @param {Array} pieces - Current piece array
   * @returns {Array} - Modified piece array with possible power-ups
   */
  applyPowerUpGeneration(pieces) {
    if (!pieces || pieces.length === 0) return pieces;

    // Track available indices (non-power-up pieces)
    const availableIndices = pieces
      .map((piece, index) => this.identifyPowerUp(piece) ? -1 : index)
      .filter(index => index !== -1);

    if (availableIndices.length === 0) return pieces;

    // Step 1: Check if any power-up should be generated (33% base chance)
    const POWERUP_BASE_CHANCE = 0.33; // 33% chance for any power-up

    if (Math.random() < POWERUP_BASE_CHANCE) {
      // Step 2: If a power-up should be generated, choose one with equal probability
      const availablePowerUps = Array.from(this.powerUps.values());

      if (availablePowerUps.length > 0) {
        // Equal probability: 1 / number of available power-ups
        const randomPowerUpIndex = Math.floor(Math.random() * availablePowerUps.length);
        const selectedPowerUp = availablePowerUps[randomPowerUpIndex];

        // Choose a random available piece to replace
        const randomIdx = Math.floor(Math.random() * availableIndices.length);
        const targetIndex = availableIndices[randomIdx];

        // Replace the piece with the selected power-up
        pieces[targetIndex] = selectedPowerUp.createPiece();

        const individualChance = (POWERUP_BASE_CHANCE / availablePowerUps.length * 100).toFixed(1);
        debugLog(`Generated ${selectedPowerUp.name} power-up (${individualChance}% individual chance, equal distribution)`);
      }
    }

    return pieces;
  }

  /**
   * Apply power-up styling during piece rendering
   * @param {Object} pieceObj - The piece object
   * @param {HTMLElement} pieceDiv - The piece container element
   * @param {HTMLElement} blockElement - The individual block element
   * @param {number} cellPx - Cell size in pixels
   */
  applyPowerUpStyling(pieceObj, pieceDiv, blockElement, cellPx) {
    const powerUp = this.identifyPowerUp(pieceObj);
    if (powerUp) {
      // Apply power-up classes to piece container
      pieceDiv.className = powerUp.getPieceClasses();

      // Apply power-up classes to block
      blockElement.className = powerUp.getBlockClasses();

      // Apply special styling
      powerUp.styleBlock(blockElement, cellPx);

      return true;
    }
    return false;
  }

  /**
   * Get comprehensive test function that tests all power-ups
   * @returns {Function}
   */
  getComprehensiveTest() {
    return () => {
      debugLog("🧪 Running comprehensive power-up tests...");

      this.powerUps.forEach(powerUp => {
        debugLog(`\n--- Testing ${powerUp.name} ---`);
        powerUp.testEffect();
      });

      debugLog("\n✅ All power-up tests completed!");
    };
  }

  /**
   * Get debug information about all registered power-ups
   * @returns {Object}
   */
  getDebugInfo() {
    const info = {
      totalPowerUps: this.powerUps.size,
      powerUps: {}
    };

    this.powerUps.forEach((powerUp, id) => {
      info.powerUps[id] = {
        name: powerUp.name,
        spawnRate: powerUp.spawnRate,
        color: powerUp.color,
        emoji: powerUp.emoji,
        description: powerUp.description
      };
    });

    return info;
  }
}

// Create and export singleton instance
export const powerUpRegistry = new PowerUpRegistry();

// Add comprehensive test to global scope
window.testAllPowerUps = powerUpRegistry.getComprehensiveTest();
window.getPowerUpInfo = () => {
  console.table(powerUpRegistry.getDebugInfo().powerUps);
  return powerUpRegistry.getDebugInfo();
};
