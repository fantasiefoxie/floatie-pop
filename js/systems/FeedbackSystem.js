/**
 * FEEDBACK SYSTEM - Displays gameplay messages and notifications
 *
 * Features:
 * - Combo notifications
 * - Card ready alerts
 * - Milestone celebrations
 * - Failure warnings
 * - Floating text messages
 *
 * Message Types:
 * - combo: Combo multiplier notifications
 * - card: Card generation alerts
 * - milestone: Achievement celebrations
 * - warning: Failure/danger warnings
 * - info: General information
 *
 * Lifecycle:
 * - init: Initialize feedback state
 * - update: Update message positions and lifetime
 * - onEvent: Listen to gameplay events
 *
 * Emits events:
 * - showMessage (text, position, type)
 */

import { TIMINGS } from '../timing.js';

export class FeedbackSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.messageTemplates = {
      combo: {
        2: 'Combo x2!',
        3: 'Combo x3!',
        4: 'Combo x4!',
        5: 'Big Combo!',
        6: 'Combo x6!',
        7: 'Combo x7!',
        8: 'MEGA COMBO!'
      },
      card: 'Card Ready!',
      milestone: 'Awesome!',
      runFailed: 'Board Full!'
    };
  }

  /**
   * Initialize feedback system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    // Initialize feedback state
    if (!gameState.feedback) {
      gameState.feedback = {
        messages: []
      };
    }

    // Listen to gameplay events
    this.systemManager.on('combo:updated', (data) => {
      this.handleComboUpdated(data, gameState);
    });

    this.systemManager.on('card:generated', (data) => {
      this.handleCardGenerated(data, gameState);
    });

    this.systemManager.on('combo:milestoneSmall', (data) => {
      this.handleComboMilestone(data, gameState, 'small');
    });

    this.systemManager.on('combo:milestoneLarge', (data) => {
      this.handleComboMilestone(data, gameState, 'large');
    });

    this.systemManager.on('run:failed', (data) => {
      this.handleRunFailed(data, gameState);
    });

    console.log('✅ FeedbackSystem initialized');
  }

  /**
   * Update feedback system - update message positions and lifetime
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (!gameState.feedback || !gameState.feedback.messages) return;

    const messages = gameState.feedback.messages;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      
      // Decrease lifetime
      msg.life -= deltaTime;
      
      // Float upward
      msg.position.y -= msg.floatSpeed || TIMINGS.FEEDBACK_FLOAT_SPEED;
      
      // Fade out in last 30% of life
      if (msg.life < 300) {
        msg.alpha = msg.life / 300;
      }
      
      // Remove expired messages
      if (msg.life <= 0) {
        messages.splice(i, 1);
      }
    }
  }

  /**
   * Handle combo updated event
   * @param {Object} data - Event data
   * @param {Object} gameState - Centralized game state
   */
  handleComboUpdated(data, gameState) {
    const { current, multiplier, lastFamily, isRare } = data;
    
    // Only show feedback for combos 2+
    if (current < 2) return;
    
    // Get combo text from template
    const text = this.messageTemplates.combo[current] || `Combo x${current}!`;
    
    // Emit show message event (position will be center by default)
    this.systemManager.emit('showMessage', {
      text,
      type: 'combo',
      multiplier,
      isRare
    });
  }

  /**
   * Handle card generated event
   * @param {Object} data - Event data
   * @param {Object} gameState - Centralized game state
   */
  handleCardGenerated(data, gameState) {
    const { card } = data;
    
    this.systemManager.emit('showMessage', {
      text: this.messageTemplates.card,
      type: 'card',
      rarity: card?.rarity || 'common'
    });
  }

  /**
   * Handle combo milestone event
   * @param {Object} data - Event data
   * @param {Object} gameState - Centralized game state
   * @param {string} size - Milestone size (small/large)
   */
  handleComboMilestone(data, gameState, size) {
    const { comboCount, family, isRare } = data;
    
    const text = size === 'large' ? '🔥 MEGA COMBO! 🔥' : '✨ Big Combo! ✨';
    
    this.systemManager.emit('showMessage', {
      text,
      type: 'milestone',
      size,
      isRare
    });
  }

  /**
   * Handle run failed event
   * @param {Object} data - Event data
   * @param {Object} gameState - Centralized game state
   */
  handleRunFailed(data, gameState) {
    const { reason } = data;
    
    let text = this.messageTemplates.runFailed;
    if (reason === 'boardOvercrowded') {
      text = 'Board Full!';
    } else if (reason === 'timeLimit') {
      text = 'Time\'s Up!';
    }
    
    this.systemManager.emit('showMessage', {
      text,
      type: 'warning',
      reason
    });
  }

  /**
   * Show a feedback message
   * @param {string} text - Message text
   * @param {Object} position - Position {x, y}
   * @param {string} type - Message type (combo, card, milestone, warning, info)
   * @param {Object} options - Additional options
   * @returns {Object} Message object
   */
  showMessage(text, position = { x: window.innerWidth / 2, y: window.innerHeight / 2 }, type = 'info', options = {}) {
    const message = {
      id: Date.now(),
      text,
      position: { ...position },
      type,
      life: options.life || TIMINGS.FEEDBACK_DEFAULT_LIFE,
      alpha: 1,
      floatSpeed: options.floatSpeed || TIMINGS.FEEDBACK_FLOAT_SPEED,
      scale: options.scale || 1,
      color: this.getMessageColor(type, options),
      ...options
    };

    // Add to gameState
    if (this.systemManager.gameState && this.systemManager.gameState.feedback) {
      this.systemManager.gameState.feedback.messages.push(message);
    }

    return message;
  }

  /**
   * Get color for message type
   * @param {string} type - Message type
   * @param {Object} options - Additional options
   * @returns {string} Color hex code
   */
  getMessageColor(type, options = {}) {
    const colors = {
      combo: '#00ff88',      // Green
      card: '#ffd700',       // Gold
      milestone: '#ff69b4',  // Pink
      warning: '#ff4444',    // Red
      info: '#00ffff'        // Cyan
    };

    // Override with options
    if (options.color) return options.color;
    if (options.isRare) return '#ffd700'; // Gold for rare
    if (options.multiplier >= 4) return '#ff69b4'; // Pink for high combo

    return colors[type] || colors.info;
  }

  /**
   * Clear all messages
   * @param {Object} gameState - Centralized game state
   */
  clearMessages(gameState) {
    if (gameState.feedback) {
      gameState.feedback.messages = [];
    }
  }

  /**
   * Clear messages by type
   * @param {string} type - Message type to clear
   * @param {Object} gameState - Centralized game state
   */
  clearByType(type, gameState) {
    if (gameState.feedback) {
      gameState.feedback.messages = gameState.feedback.messages.filter(
        msg => msg.type !== type
      );
    }
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    // Events are handled via systemManager.on()
  }
}
