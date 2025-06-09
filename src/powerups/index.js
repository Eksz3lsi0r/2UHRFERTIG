/* --------------------------------------------------------------------
 *  src/powerups/index.js - Power-Up Module Exports
 * ------------------------------------------------------------------ */

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = false;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

// Base power-up system
export { BasePowerUp } from './basePowerUp.js';

// Individual power-ups
export { ElectroStack, electroStack } from './electroStack.js';
export { ExtendBlock, extendBlock } from './extendBlock.js';
export { powerUpRegistry } from './powerUpRegistry.js';
export { StormBlock, stormBlock } from './stormBlock.js';

// Registry system
import { powerUpRegistry as registry } from './powerUpRegistry.js';

// Convenience exports for easy access
export const powerUps = {
  storm: () => import('./stormBlock.js').then(m => m.stormBlock),
  electro: () => import('./electroStack.js').then(m => m.electroStack),
  extend: () => import('./extendBlock.js').then(m => m.extendBlock)
};

/**
 * Initialize the power-up system
 * This should be called once during game initialization
 */
export function initializePowerUps() {
  debugLog('🔌 Power-Up system initialized');

  // The registry is automatically initialized when imported
  // This function is here for explicit initialization if needed

  return registry;
}
