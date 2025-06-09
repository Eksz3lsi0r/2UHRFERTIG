/* --------------------------------------------------------------------
 *  src/powerups/basePowerUp.js - Base Power-Up Class
 * ------------------------------------------------------------------ */

/**
 * Base class for all power-ups in the game
 * Provides a common interface and shared functionality
 */
export class BasePowerUp {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.shape = config.shape || [[0, 0]]; // Default 1x1 shape
    this.color = config.color;
    this.spawnRate = config.spawnRate || 0.05; // 5% default
    this.emoji = config.emoji || '⭐';
    this.description = config.description || '';
  }

  /**
   * Check if a piece object is this type of power-up
   * @param {Object} pieceObj - The piece object to check
   * @returns {boolean}
   */
  isPowerUp(pieceObj) {
    return pieceObj?.[this.getFlag()] === true;
  }

  /**
   * Get the flag property name for this power-up (e.g., 'isStorm', 'isElectro')
   * Must be implemented by subclasses
   * @returns {string}
   */
  getFlag() {
    throw new Error('getFlag() must be implemented by subclass');
  }

  /**
   * Create a power-up piece object
   * @returns {Object}
   */
  createPiece() {
    const piece = {
      shape: this.shape.map(row => [...row]), // Deep copy
      color: this.color,
      [this.getFlag()]: true
    };
    return piece;
  }

  /**
   * Execute the power-up effect when placed on the board
   * Must be implemented by subclasses
   * @param {number} row - Placement row
   * @param {number} col - Placement column
   * @param {Object} gameState - Current game state
   */
  execute(row, col, gameState) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Get CSS classes for rendering this power-up
   * @returns {string}
   */
  getPieceClasses() {
    return `piece ${this.id}-piece`;
  }

  /**
   * Get CSS classes for individual blocks
   * @returns {string}
   */
  getBlockClasses() {
    return `block ${this.id}-block`;
  }

  /**
   * Apply special styling to a block element
   * @param {HTMLElement} block - The block element
   * @param {number} cellPx - Cell size in pixels
   */
  styleBlock(block, cellPx) {
    // Default implementation adds emoji
    block.innerHTML = this.emoji;
    block.style.fontSize = `${cellPx * 0.6}px`;
    block.style.display = 'flex';
    block.style.alignItems = 'center';
    block.style.justifyContent = 'center';
    block.style.textAlign = 'center';
  }

  /**
   * Get debug test functions for this power-up
   * @returns {Object}
   */
  getTestFunctions() {
    return {
      [`force${this.name.replace(/\s+/g, '')}Piece`]: () => this.forceTestPiece(),
      [`test${this.name.replace(/\s+/g, '')}Effect`]: () => this.testEffect()
    };
  }

  /**
   * Force add this power-up to inventory for testing
   */
  forceTestPiece() {
    if (window.state?.playerPieces?.length > 0) {
      window.state.playerPieces[0] = this.createPiece();
      if (window.player?.renderPieces) {
        window.player.renderPieces();
      }
      console.log(`${this.name} piece forced in inventory!`);
    }
  }

  /**
   * Test the power-up effect (override in subclasses)
   */
  testEffect() {
    console.log(`Testing ${this.name} effect...`);
  }
}
