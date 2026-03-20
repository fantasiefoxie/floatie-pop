/**
 * PHYSICS SYSTEM - Handles floatie movement and collisions
 * 
 * Lifecycle:
 * - init: Initialize system
 * - update: Update floatie positions and handle collisions
 * - onEvent: Handle physics-related events
 * 
 * Emits events:
 * - physics:updated (floatieCount)
 */

export class PhysicsSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.playArea = null;
  }

  /**
   * Initialize physics system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    this.playArea = document.getElementById('playArea');

    if (!this.playArea) {
      console.warn('⚠️ PlayArea element not found');
      return;
    }

    console.log('✅ PhysicsSystem initialized');
  }

  /**
   * Update physics - handle boundary collisions only
   * Note: Floatie movement is handled by BoardStabilitySystem
   */
  update(deltaTime, gameState) {
    if (gameState.paused || gameState.gameOver) return;

    if (!this.playArea) return;

    const bounds = {
      left: 0,
      top: 0,
      right: this.playArea.clientWidth - 40,
      bottom: this.playArea.clientHeight - 40
    };

    // Only handle boundary bouncing, not movement
    // Movement is handled by BoardStabilitySystem
    for (const floatie of gameState.floats) {
      if (!floatie.isActive || !floatie.el) continue;

      // Simple boundary bounce (no position update)
      if (floatie.x < bounds.left || floatie.x > bounds.right) {
        floatie.vx *= -1;
      }
      if (floatie.y < bounds.top || floatie.y > bounds.bottom) {
        floatie.vy *= -1;
      }
    }

    // Emit event
    this.systemManager.emit('physics:updated', {
      floatieCount: gameState.floats.length
    });
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    // Physics system can listen to other events if needed
  }
}
