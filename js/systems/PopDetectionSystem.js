/**
 * POP DETECTION SYSTEM - Handles floatie removal and pop events
 * 
 * Features:
 * - Tap pop detection and removal
 * - Chain pop validation and removal
 * - Pop effects (particles, sound, haptics)
 * - Safe floatie removal from gameState
 * - Event emission for other systems
 * 
 * Lifecycle:
 * - init: Initialize system
 * - update: Not used (event-driven)
 * - onEvent: Handle floatieTapped and chainPop events
 * 
 * Listens to:
 * - floatie:tap (from InputSystem) → single floatie pop
 * - chain:pop (from InputSystem) → chain of floaties pop
 * 
 * Emits events:
 * - floatie:popped (floatie, points, combo)
 * - chain:popResolved (chainSelection, family, totalPoints)
 * - spawnParticles (x, y, type, count)
 * - popSound (x, y)
 * - hapticFeedback (intensity)
 */

import { TIMINGS } from '../timing.js';

export class PopDetectionSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.playArea = null;
    this.popSoundElement = null;
    this.lastPopTime = 0;
    this.popCooldown = 50; // ms between pops
  }

  /**
   * Initialize pop detection system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    this.playArea = document.getElementById('playArea');

    if (!this.playArea) {
      console.warn('⚠️ PlayArea element not found');
      return;
    }

    console.log('✅ PopDetectionSystem initialized');
  }

  /**
   * Update pop detection system
   */
  update(deltaTime, gameState) {
    // Pop detection is event-driven, no continuous update needed
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState || gameState.paused || gameState.gameOver) return;

    if (eventName === 'floatie:tap') {
      this.handleFloatieTap(data, gameState);
    } else if (eventName === 'chain:pop') {
      this.handleChainPop(data, gameState);
    }
  }

  /**
   * Handle single floatie tap
   * @param {Object} data - Event data {floatie, x, y}
   * @param {Object} gameState - Centralized game state
   */
  handleFloatieTap(data, gameState) {
    const { floatie, x, y } = data;

    if (!floatie || !floatie.isActive) return;

    // Prevent rapid successive pops
    const now = performance.now();
    if (now - this.lastPopTime < this.popCooldown) return;
    this.lastPopTime = now;

    // Remove floatie safely
    const removed = this.removeFloatie(floatie.id, gameState);
    if (!removed) return;

    // Trigger pop effects
    this.triggerPopEffects(floatie, x, y, gameState);

    // Emit pop event
    this.systemManager.emit('floatie:popped', {
      floatie,
      family: floatie.family,
      isRare: floatie.isRare,
      position: { x, y }
    });

    console.log(`👋 Floatie popped: ${floatie.family}`);
  }

  /**
   * Handle chain pop
   * @param {Object} data - Event data {chainSelection, family}
   * @param {Object} gameState - Centralized game state
   */
  handleChainPop(data, gameState) {
    const { chainSelection, family } = data;

    if (!chainSelection || chainSelection.length < 2) {
      console.warn('⚠️ Invalid chain: less than 2 floaties');
      return;
    }

    // Validate all floaties are same family
    const validChain = this.validateChain(chainSelection, family);
    if (!validChain) {
      console.warn('⚠️ Invalid chain: mixed families');
      return;
    }

    // Calculate center position for effects
    const centerX = chainSelection.reduce((sum, f) => sum + f.x, 0) / chainSelection.length;
    const centerY = chainSelection.reduce((sum, f) => sum + f.y, 0) / chainSelection.length;

    // Lock input during chain resolution
    gameState.input.locked = true;
    console.log('🔒 Input locked for chain resolution');

    // Pop floaties sequentially with 30-50ms delay between each
    this.popChainSequentially(chainSelection, family, centerX, centerY, gameState);

    console.log(`🔗 Chain popping: ${chainSelection.length} ${family} floaties (sequential)`);
  }

  /**
   * Pop chain floaties sequentially with delays
   * @param {Array} chainSelection - Array of floaties to pop
   * @param {string} family - Floatie family
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {Object} gameState - Centralized game state
   */
  popChainSequentially(chainSelection, family, centerX, centerY, gameState) {
    const actionQueue = this.systemManager.getSystem('ActionQueueSystem');
    
    if (!actionQueue) {
      // Fallback: pop all at once if no action queue
      const removedCount = this.removeChain(chainSelection, gameState);
      this.systemManager.emit('chain:popResolved', {
        chainSelection,
        family,
        count: removedCount,
        centerPosition: { x: centerX, y: centerY }
      });
      return;
    }

    // Enqueue each floatie pop with sequential delays
    for (let i = 0; i < chainSelection.length; i++) {
      const floatie = chainSelection[i];
      const delay = i * TIMINGS.POP_DELAY;

      // Enqueue pop action for this floatie
      actionQueue.enqueueAction('popFloatie', {
        floatie,
        family,
        index: i,
        total: chainSelection.length,
        centerX,
        centerY
      }, delay);
    }

    // Emit chain pop resolved after all floaties are popped
    const totalDelay = chainSelection.length * TIMINGS.POP_DELAY + TIMINGS.CHAIN_RESOLUTION_GAP;
    actionQueue.enqueueAction('chainPopComplete', {
      chainSelection,
      family,
      count: chainSelection.length,
      centerPosition: { x: centerX, y: centerY }
    }, totalDelay);
  }

  /**
   * Validate chain - all floaties must be same family
   * @param {Array} chainSelection - Array of floaties
   * @param {string} family - Expected family
   * @returns {boolean} True if valid
   */
  validateChain(chainSelection, family) {
    if (!Array.isArray(chainSelection) || chainSelection.length < 2) {
      return false;
    }

    // Check all floaties are same family
    return chainSelection.every(floatie => {
      return floatie && 
             floatie.isActive && 
             (floatie.family === family || floatie.type === family);
    });
  }

  /**
   * Find floatie by ID
   * @param {string} id - Floatie ID
   * @param {Object} gameState - Centralized game state
   * @returns {Object|null} Floatie object or null
   */
  findFloatieById(id, gameState) {
    if (!gameState || !gameState.floats) return null;

    return gameState.floats.find(floatie => floatie.id === id) || null;
  }

  /**
   * Remove single floatie safely from gameState
   * @param {string} id - Floatie ID
   * @param {Object} gameState - Centralized game state
   * @returns {boolean} True if removed successfully
   */
  removeFloatie(id, gameState) {
    if (!gameState || !gameState.floats) return false;

    // Find floatie
    const floatie = this.findFloatieById(id, gameState);
    if (!floatie) return false;

    // Mark as inactive
    floatie.isActive = false;

    // Remove DOM element
    if (floatie.el && floatie.el.parentElement) {
      floatie.el.remove();
    }

    // Remove from floats array
    gameState.floats = gameState.floats.filter(f => f.id !== id);

    return true;
  }

  /**
   * Remove chain of floaties safely from gameState
   * @param {Array} chainSelection - Array of floaties to remove
   * @param {Object} gameState - Centralized game state
   * @returns {number} Number of floaties removed
   */
  removeChain(chainSelection, gameState) {
    if (!gameState || !gameState.floats || !Array.isArray(chainSelection)) {
      return 0;
    }

    let removedCount = 0;

    // Remove each floatie in chain
    for (const floatie of chainSelection) {
      if (floatie && floatie.id) {
        const removed = this.removeFloatie(floatie.id, gameState);
        if (removed) removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Trigger pop effects (particles, haptics)
   * @param {Object} floatie - Floatie object
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} gameState - Centralized game state
   */
  triggerPopEffects(floatie, x, y, gameState) {
    const priorityEvent = this.systemManager.getSystem('PriorityEventSystem');
    const actionQueue = this.systemManager.getSystem('ActionQueueSystem');
    if (!actionQueue) return;

    // HIGH priority: particles appear immediately
    actionQueue.enqueueAction('spawnParticles', {
      x,
      y,
      type: floatie.family,
      count: floatie.isRare ? 20 : 10,
      color: this.getFamilyColor(floatie.family),
      isRare: floatie.isRare
    }, 0);

    // MEDIUM priority: haptic and sound slightly delayed
    if (priorityEvent) {
      priorityEvent.emitMedium('hapticFeedback', {
        intensity: floatie.isRare ? 'strong' : 'medium',
        duration: floatie.isRare ? TIMINGS.HAPTIC_RARE_DURATION : TIMINGS.HAPTIC_NORMAL_DURATION
      });

      priorityEvent.emitMedium('playSound', {
        sound: 'pop',
        volume: 0.3
      });
    } else {
      actionQueue.enqueueAction('triggerHaptic', {
        intensity: floatie.isRare ? 'strong' : 'medium',
        duration: floatie.isRare ? TIMINGS.HAPTIC_RARE_DURATION : TIMINGS.HAPTIC_NORMAL_DURATION
      }, TIMINGS.HAPTIC_NORMAL_DURATION);

      actionQueue.enqueueAction('playSound', {
        sound: 'pop',
        volume: 0.3
      }, TIMINGS.HAPTIC_NORMAL_DURATION);
    }
  }

  /**
   * Get color for floatie family
   * @param {string} family - Floatie family
   * @returns {string} Color hex code
   */
  getFamilyColor(family) {
    const colors = {
      jelly: '#ff69b4',
      coral: '#ff8c00',
      pearl: '#f0f8ff',
      star: '#ffd700',
      rainbow: '#ff00ff',
      bomb: '#000000'
    };
    return colors[family] || '#ffffff';
  }

  /**
   * Get floatie statistics
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Statistics
   */
  getStats(gameState) {
    if (!gameState || !gameState.floats) {
      return { totalFloaties: 0, activeFloaties: 0, rareFloaties: 0 };
    }

    const totalFloaties = gameState.floats.length;
    const activeFloaties = gameState.floats.filter(f => f.isActive).length;
    const rareFloaties = gameState.floats.filter(f => f.isRare && f.isActive).length;

    return { totalFloaties, activeFloaties, rareFloaties };
  }
}
