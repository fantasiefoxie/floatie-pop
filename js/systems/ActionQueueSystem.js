/**
 * ACTION QUEUE SYSTEM - Sequences gameplay effects with timing
 *
 * Features:
 * - Queues actions for delayed execution
 * - Processes queue sequentially
 * - Prevents simultaneous system updates
 * - Creates polished effect chains
 *
 * Lifecycle:
 * - init: Initialize queue
 * - update: Process queue based on delays
 * - onEvent: Handle action enqueue events
 *
 * Emits events:
 * - action:executed (when action completes)
 */

export class ActionQueueSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.queue = [];
    this.processing = false;
    this.actionIdCounter = 0;
  }

  /**
   * Initialize action queue system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    // Initialize action queue in game state
    gameState.actionQueue = [];
    this.queue = [];
    this.processing = false;
    this.actionIdCounter = 0;

    console.log('✅ ActionQueueSystem initialized');
  }

  /**
   * Update action queue - process pending actions
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const now = Date.now();

    // Process all actions that are ready
    for (let i = 0; i < this.queue.length; i++) {
      const action = this.queue[i];
      
      if (action.executed) continue;

      // Check if action delay has elapsed
      if (now >= action.scheduledTime) {
        action.executed = true;
        this.executeAction(action, gameState);
      }
    }

    // Remove executed actions from queue
    this.queue = this.queue.filter(action => !action.executed);
    
    // Check if queue is now empty - unlock input
    if (this.queue.length === 0 && gameState.input && gameState.input.locked) {
      gameState.input.locked = false;
      console.log('🔓 Input unlocked - action queue empty');
    }
    
    this.processing = false;

    // Update gameState.actionQueue for debugging
    gameState.actionQueue = [...this.queue];
  }

  /**
   * Execute a single action
   * @param {Object} action - Action to execute
   * @param {Object} gameState - Centralized game state
   */
  executeAction(action, gameState) {
    console.log(`⚡ Executing action: ${action.type} (delay: ${action.delay}ms)`);

    switch (action.type) {
      case 'updateCombo':
        this.executeUpdateCombo(action.payload, gameState);
        break;
      case 'updateScore':
        this.executeUpdateScore(action.payload, gameState);
        break;
      case 'generateCard':
        this.executeGenerateCard(action.payload, gameState);
        break;
      case 'spawnParticles':
        this.executeSpawnParticles(action.payload, gameState);
        break;
      case 'spawnScoreText':
        this.executeSpawnScoreText(action.payload, gameState);
        break;
      case 'triggerHaptic':
        this.executeTriggerHaptic(action.payload, gameState);
        break;
      case 'playSound':
        this.executePlaySound(action.payload, gameState);
        break;
      case 'cardEffect':
        this.executeCardEffect(action.payload, gameState);
        break;
      case 'popFloatie':
        this.executePopFloatie(action.payload, gameState);
        break;
      case 'chainPopComplete':
        this.executeChainPopComplete(action.payload, gameState);
        break;
      case 'updateComboMultiplier':
        this.executeUpdateComboMultiplier(action.payload, gameState);
        break;
      case 'revealCard':
        this.executeRevealCard(action.payload, gameState);
        break;
      default:
        console.warn(`⚠️ Unknown action type: ${action.type}`);
    }

    // Emit action executed event
    this.systemManager.emit('action:executed', {
      actionId: action.id,
      type: action.type,
      timestamp: Date.now()
    });
  }

  /**
   * Execute combo update
   */
  executeUpdateCombo(payload, gameState) {
    const { floatie, family, isRare } = payload;
    
    if (!gameState.combo) return;

    // Check if same family as last pop
    if (family === gameState.combo.lastFamily) {
      gameState.combo.current++;
    } else {
      gameState.combo.current = 1;
    }

    gameState.combo.lastFamily = family;
    gameState.combo.multiplier = this.calculateMultiplier(gameState.combo.current);

    // Emit combo updated
    this.systemManager.emit('combo:updated', {
      current: gameState.combo.current,
      multiplier: gameState.combo.multiplier,
      lastFamily: family,
      isRare
    });

    // Check milestones
    if (gameState.combo.current === 5) {
      this.systemManager.emit('combo:milestoneSmall', {
        comboCount: 5,
        family,
        isRare
      });
    } else if (gameState.combo.current === 8) {
      this.systemManager.emit('combo:milestoneLarge', {
        comboCount: 8,
        family,
        isRare
      });
    }
  }

  /**
   * Execute score update
   */
  executeUpdateScore(payload, gameState) {
    const { comboMultiplier, isRare, position } = payload;
    
    if (!gameState.score) return;

    // Calculate score
    const baseScore = 10;
    let scoreGain = baseScore * comboMultiplier;

    if (isRare) {
      scoreGain += 200;
    }

    gameState.score.total += scoreGain;
    gameState.score.lastGain = scoreGain;

    // Emit score updated
    this.systemManager.emit('score:updated', {
      total: gameState.score.total,
      lastGain: scoreGain
    });

    // Queue score text spawn
    this.enqueueAction('spawnScoreText', {
      value: scoreGain,
      position
    }, 50);
  }

  /**
   * Execute card generation
   */
  executeGenerateCard(payload, gameState) {
    if (!gameState.cards) return;

    // Check if should generate card (every 5 pops)
    if (gameState.cards.popCounter % 5 === 0) {
      // Get DeterministicCardSystem to generate the card
      const cardSystem = this.systemManager.getSystem('DeterministicCardSystem');
      if (cardSystem && cardSystem.generateCard) {
        cardSystem.generateCard(gameState);
      }
    }
  }

  /**
   * Execute particle spawn
   */
  executeSpawnParticles(payload, gameState) {
    const { x, y, type, count, color, isRare } = payload;

    this.systemManager.emit('spawnParticles', {
      x, y, type, count, color, isRare
    });
  }

  /**
   * Execute score text spawn
   */
  executeSpawnScoreText(payload, gameState) {
    const { value, position } = payload;

    this.systemManager.emit('score:spawnText', {
      value,
      position
    });
  }

  /**
   * Execute haptic feedback
   */
  executeTriggerHaptic(payload, gameState) {
    const { intensity, duration } = payload;

    this.systemManager.emit('hapticFeedback', {
      intensity,
      duration
    });
  }

  /**
   * Execute sound playback
   */
  executePlaySound(payload, gameState) {
    const { sound, volume } = payload;

    this.systemManager.emit('playSound', {
      sound,
      volume
    });
  }

  /**
   * Execute card effect
   */
  executeCardEffect(payload, gameState) {
    const { cardId, cardType } = payload;

    this.systemManager.emit('card:activated', {
      cardId,
      cardType
    });
  }

  /**
   * Calculate combo multiplier
   */
  calculateMultiplier(comboCount) {
    if (comboCount >= 7) return 4;
    if (comboCount >= 5) return 3;
    if (comboCount >= 3) return 2;
    return 1;
  }

  /**
   * Enqueue an action for delayed execution
   * @param {string} type - Action type
   * @param {Object} payload - Action data
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Action ID
   */
  enqueueAction(type, payload, delay = 0) {
    const action = {
      id: this.actionIdCounter++,
      type,
      payload,
      delay,
      scheduledTime: Date.now() + delay,
      executed: false
    };

    this.queue.push(action);
    
    // Also update gameState for debugging
    if (this.systemManager.gameState) {
      this.systemManager.gameState.actionQueue = [...this.queue];
    }

    return action.id;
  }

  /**
   * Clear all pending actions
   */
  clearQueue() {
    this.queue = [];
    this.processing = false;
    
    if (this.systemManager.gameState) {
      this.systemManager.gameState.actionQueue = [];
    }
  }

  /**
   * Get queue length
   * @returns {number} Number of pending actions
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Get queue info for debugging
   * @returns {Object} Queue statistics
   */
  getQueueInfo() {
    const now = Date.now();
    const ready = this.queue.filter(a => now >= a.scheduledTime).length;
    const pending = this.queue.length - ready;

    return {
      total: this.queue.length,
      ready,
      pending,
      nextAction: this.queue[0] ? {
        type: this.queue[0].type,
        delay: this.queue[0].delay
      } : null
    };
  }

  /**
   * Execute pop floatie action
   * @param {Object} payload - Action payload
   * @param {Object} gameState - Centralized game state
   */
  executePopFloatie(payload, gameState) {
    const { floatie, family, index, total, centerX, centerY } = payload;

    if (!floatie || !floatie.isActive) return;

    // Get PopDetectionSystem to handle the pop
    const popSystem = this.systemManager.getSystem('PopDetectionSystem');
    if (!popSystem) return;

    // Remove the floatie
    popSystem.removeFloatie(floatie.id, gameState);

    // Trigger pop effects
    popSystem.triggerPopEffects(floatie, floatie.x, floatie.y, gameState);

    // Emit floatie popped event for combo/score tracking
    this.systemManager.emit('floatie:popped', {
      floatie,
      family,
      isRare: floatie.isRare,
      position: { x: floatie.x, y: floatie.y },
      chainIndex: index,
      chainTotal: total
    });

    console.log(`🎯 Chain pop ${index + 1}/${total}: ${family}`);
  }

  /**
   * Execute chain pop complete action
   * @param {Object} payload - Action payload
   * @param {Object} gameState - Centralized game state
   */
  executeChainPopComplete(payload, gameState) {
    const { chainSelection, family, count, centerPosition } = payload;

    // Emit chain pop resolved event
    this.systemManager.emit('chain:popResolved', {
      chainSelection,
      family,
      count,
      centerPosition
    });

    // Unlock input after chain completes
    if (gameState.input) {
      gameState.input.locked = false;
      console.log('🔓 Input unlocked - chain complete');
    }

    console.log(`✅ Chain complete: ${count} ${family} floaties`);
  }

  /**
   * Execute combo multiplier update
   * @param {Object} payload - Action payload
   * @param {Object} gameState - Centralized game state
   */
  executeUpdateComboMultiplier(payload, gameState) {
    const { multiplier, current, lastFamily, isRare } = payload;

    // Update combo multiplier in game state
    if (gameState.combo) {
      gameState.combo.multiplier = multiplier;
    }

    // Emit combo resolved event (multiplier now applied)
    this.systemManager.emit('combo:resolved', {
      current,
      multiplier,
      lastFamily,
      isRare
    });

    console.log(`✅ Combo resolved: ${current}x (Multiplier: ${multiplier}x)`);
  }

  /**
   * Execute reveal card action
   * @param {Object} payload - Action payload
   * @param {Object} gameState - Centralized game state
   */
  executeRevealCard(payload, gameState) {
    const { card } = payload;

    // Get DeterministicCardSystem to reveal the card
    const cardSystem = this.systemManager.getSystem('DeterministicCardSystem');
    if (cardSystem && cardSystem.revealCard) {
      cardSystem.revealCard(card, gameState);
    }
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    // Action queue is event-driven via enqueueAction
  }
}
