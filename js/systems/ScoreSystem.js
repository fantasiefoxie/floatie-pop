/**
 * SCORE SYSTEM - Converts floatie pops and combo multipliers into player score
 * 
 * Features:
 * - Calculates score from floatie pops with combo multiplier
 * - Awards bonuses for chain pops and combo milestones
 * - Awards bonus for rare floaties
 * - Emits scoreUpdated and spawnScoreText events
 * - Event-driven architecture (no direct rendering)
 * 
 * Lifecycle:
 * - init: Initialize system
 * - update: Not used (event-driven)
 * - onEvent: Handle floatiePopped, chainPopResolved, comboMilestoneSmall, comboMilestoneLarge events
 * 
 * Listens to:
 * - floatie:popped (from PopDetectionSystem)
 * - chain:popResolved (from PopDetectionSystem)
 * - combo:milestoneSmall (from ComboSystem)
 * - combo:milestoneLarge (from ComboSystem)
 * 
 * Emits events:
 * - score:updated (total, lastGain)
 * - score:spawnText (value, position)
 */

export class ScoreSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.baseScore = 10;
  }

  /**
   * Initialize score system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    if (!gameState.score) {
      gameState.score = {
        total: 0,
        lastGain: 0
      };
    }
    console.log('✅ ScoreSystem initialized');
  }

  /**
   * Update score system
   */
  update(deltaTime, gameState) {
    // Score system is event-driven, no continuous update needed
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState || gameState.paused || gameState.gameOver) return;

    if (eventName === 'floatie:popped') {
      this.handleFloatiePopped(data, gameState);
    } else if (eventName === 'chain:popResolved') {
      this.handleChainPopResolved(data, gameState);
    } else if (eventName === 'combo:milestoneSmall') {
      this.handleMilestoneSmall(data, gameState);
    } else if (eventName === 'combo:milestoneLarge') {
      this.handleMilestoneLarge(data, gameState);
    }
  }

  /**
   * Handle floatie popped event
   * @param {Object} data - Event data {floatie, family, isRare, position}
   * @param {Object} gameState - Centralized game state
   */
  handleFloatiePopped(data, gameState) {
    const { isRare, position } = data;

    // Calculate base score with combo multiplier
    let scoreGain = this.baseScore * gameState.combo.multiplier;

    // Add rare floatie bonus
    if (isRare) {
      scoreGain += 200;
    }

    // Update score
    gameState.score.total += scoreGain;
    gameState.score.lastGain = scoreGain;

    // Emit score updated event
    this.systemManager.emit('score:updated', {
      total: gameState.score.total,
      lastGain: scoreGain
    });

    // Emit score text spawn event for visual feedback
    if (position) {
      this.systemManager.emit('score:spawnText', {
        value: scoreGain,
        position: { x: position.x, y: position.y }
      });
    }

    console.log(`💰 Score: +${scoreGain} (Total: ${gameState.score.total})`);
  }

  /**
   * Handle chain pop resolved event
   * @param {Object} data - Event data {chainLength, positions}
   * @param {Object} gameState - Centralized game state
   */
  handleChainPopResolved(data, gameState) {
    const chainBonus = 50;
    gameState.score.total += chainBonus;
    gameState.score.lastGain = chainBonus;

    // Emit score updated event
    this.systemManager.emit('score:updated', {
      total: gameState.score.total,
      lastGain: chainBonus
    });

    // Emit score text spawn event at first position if available
    if (data.positions && data.positions.length > 0) {
      this.systemManager.emit('score:spawnText', {
        value: chainBonus,
        position: { x: data.positions[0].x, y: data.positions[0].y }
      });
    }

    console.log(`⛓️ Chain Bonus: +${chainBonus} (Total: ${gameState.score.total})`);
  }

  /**
   * Handle combo milestone small event
   * @param {Object} data - Event data {comboCount, family, isRare}
   * @param {Object} gameState - Centralized game state
   */
  handleMilestoneSmall(data, gameState) {
    const milestoneBonus = 100;
    gameState.score.total += milestoneBonus;
    gameState.score.lastGain = milestoneBonus;

    // Emit score updated event
    this.systemManager.emit('score:updated', {
      total: gameState.score.total,
      lastGain: milestoneBonus
    });

    // Emit score text spawn event
    this.systemManager.emit('score:spawnText', {
      value: milestoneBonus,
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    });

    console.log(`🎯 Milestone Small: +${milestoneBonus} (Total: ${gameState.score.total})`);
  }

  /**
   * Handle combo milestone large event
   * @param {Object} data - Event data {comboCount, family, isRare}
   * @param {Object} gameState - Centralized game state
   */
  handleMilestoneLarge(data, gameState) {
    const milestoneBonus = 250;
    gameState.score.total += milestoneBonus;
    gameState.score.lastGain = milestoneBonus;

    // Emit score updated event
    this.systemManager.emit('score:updated', {
      total: gameState.score.total,
      lastGain: milestoneBonus
    });

    // Emit score text spawn event
    this.systemManager.emit('score:spawnText', {
      value: milestoneBonus,
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    });

    console.log(`🎯 Milestone Large: +${milestoneBonus} (Total: ${gameState.score.total})`);
  }

  /**
   * Get current score info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Score info
   */
  getScoreInfo(gameState) {
    if (!gameState || !gameState.score) {
      return {
        total: 0,
        lastGain: 0
      };
    }

    return {
      total: gameState.score.total,
      lastGain: gameState.score.lastGain
    };
  }
}
