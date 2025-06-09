/* --------------------------------------------------------------------
 *  src/powerups/index.js - Power-Up Module Exports
 * ------------------------------------------------------------------ */

// Base power-up system
export { BasePowerUp } from './basePowerUp.js';

// Individual power-ups
export { ElectroStack, electroStack } from './electroStack.js';
export { powerUpRegistry } from './powerUpRegistry.js';
export { StormBlock, stormBlock } from './stormBlock.js';

// Registry system
import { powerUpRegistry as registry } from './powerUpRegistry.js';

// Convenience exports for easy access
export const powerUps = {
  storm: () => import('./stormBlock.js').then(m => m.stormBlock),
  electro: () => import('./electroStack.js').then(m => m.electroStack)
};

/**
 * Initialize the power-up system
 * This should be called once during game initialization
 */
export function initializePowerUps() {
  console.log('🔌 Power-Up system initialized');

  // The registry is automatically initialized when imported
  // This function is here for explicit initialization if needed

  return registry;
}
