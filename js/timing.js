/**
 * TIMING CONFIGURATION - Centralized timing constants for all systems
 *
 * All systems must use these constants instead of hardcoded delays.
 * This ensures consistent timing across the entire game and makes
 * balancing easier.
 *
 * Usage:
 * import { TIMINGS } from './timing.js';
 *
 * actionQueue.enqueueAction('popFloatie', data, TIMINGS.POP_DELAY);
 */

export const TIMINGS = {
  // === BASE TIMING ===
  // Minimum frame time (60fps)
  TAP_RESPONSE: 16,
  
  // === POP TIMING ===
  // Delay between each floatie pop in a chain (ms)
  POP_DELAY: 40,
  
  // === COMBO TIMING ===
  // Delay before combo count updates (ms)
  COMBO_BUILD_DELAY: 60,
  
  // Delay before combo milestone triggers (ms)
  COMBO_MILESTONE_DELAY: 80,
  
  // Combo breaks after this time without pops (ms)
  COMBO_TIMEOUT: 3000,
  
  // === SCORE TIMING ===
  // Delay before score update (ms)
  SCORE_DELAY: 50,
  
  // Floating score text lifetime (ms)
  SCORE_TEXT_LIFE: 1000,
  
  // === CARD TIMING ===
  // Delay before card generation after pop threshold (ms)
  CARD_TRIGGER_DELAY: 100,
  
  // Delay before card is revealed and added to hand (ms)
  CARD_REVEAL_DELAY: 180,
  
  // === ACTION QUEUE TIMING ===
  // Spacing between actions in queue (ms)
  ACTION_SPACING: 40,
  
  // Gap between chain pop resolution (ms)
  CHAIN_RESOLUTION_GAP: 80,
  
  // Priority event delays (ms)
  PRIORITY_HIGH_DELAY: 0,
  PRIORITY_MEDIUM_DELAY_MIN: 50,
  PRIORITY_MEDIUM_DELAY_MAX: 100,
  PRIORITY_LOW_DELAY_MIN: 100,
  PRIORITY_LOW_DELAY_MAX: 200,
  
  // === INPUT LOCKING ===
  // Minimum input lock duration (ms)
  INPUT_LOCK_MIN: 120,
  
  // Maximum input lock duration (ms)
  INPUT_LOCK_MAX: 400,
  
  // === FEEDBACK TIMING ===
  // Default message lifetime (ms)
  FEEDBACK_DEFAULT_LIFE: 1500,
  
  // Combo feedback lifetime (ms)
  FEEDBACK_COMBO_LIFE: 2000,
  
  // Milestone feedback lifetime (ms)
  FEEDBACK_MILESTONE_LIFE: 2500,
  
  // Warning feedback lifetime (ms)
  FEEDBACK_WARNING_LIFE: 2000,
  
  // Message float speed (pixels per frame)
  FEEDBACK_FLOAT_SPEED: 1.5,
  
  // === INPUT TIMING ===
  // Minimum touch target size (pixels)
  TOUCH_TARGET_SIZE: 48,
  
  // Maximum distance between chain floaties (pixels)
  CHAIN_DISTANCE: 80,
  
  // === PARTICLE TIMING ===
  // Particle lifetime (ms)
  PARTICLE_LIFE: 600,
  
  // === HAPTIC TIMING ===
  // Haptic feedback duration for normal pop (ms)
  HAPTIC_NORMAL_DURATION: 30,
  
  // Haptic feedback duration for rare pop (ms)
  HAPTIC_RARE_DURATION: 50,
  
  // === SPAWN TIMING ===
  // Initial spawn interval (ms)
  SPAWN_INTERVAL: 2000,
  
  // Maximum floaties on board
  MAX_FLOATIES: 40,
  
  // === PRESSURE TIMING ===
  // Pressure level increase interval (ms)
  PRESSURE_INTERVAL: 20000,
  
  // Overcrowding failure threshold (ms)
  OVERCROWDING_THRESHOLD: 3000,
  
  // === RENDER TIMING ===
  // Floating text fade start (ms before end)
  FLOATING_TEXT_FADE_START: 300,
  
  // Combo pulse animation speed
  COMBO_PULSE_SPEED: 0.01,
  
  // Chain pop complete delay (ms)
  CHAIN_POP_COMPLETE_DELAY: 250
};

/**
 * Get random delay within a range
 * @param {number} min - Minimum delay (ms)
 * @param {number} max - Maximum delay (ms)
 * @returns {number} Random delay value
 */
export function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get medium priority delay (50-100ms random)
 * @returns {number} Delay value
 */
export function getMediumPriorityDelay() {
  return randomDelay(TIMINGS.PRIORITY_MEDIUM_DELAY_MIN, TIMINGS.PRIORITY_MEDIUM_DELAY_MAX);
}

/**
 * Get low priority delay (100-200ms random)
 * @returns {number} Delay value
 */
export function getLowPriorityDelay() {
  return randomDelay(TIMINGS.PRIORITY_LOW_DELAY_MIN, TIMINGS.PRIORITY_LOW_DELAY_MAX);
}

/**
 * Get pop delay for chain
 * @returns {number} Delay value
 */
export function getPopDelay() {
  return TIMINGS.POP_DELAY;
}
