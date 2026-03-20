/**
 * COMBO SYSTEM - Tracks consecutive pops and manages combo multipliers
 * 
 * Features:
 * - Tracks consecutive pops of same floatie family
 * - Calculates combo multiplier based on combo count
 * - Emits milestone events at specific combo counts
 * - Event-driven architecture (no direct state modification)
 * 
 * Lifecycle:
 * - init: Initialize system
 * - update: Not used (event-driven)
 * - onEvent: Handle floatiePopped events
 * 
 * Listens to:
 * - floatie:popped (from PopDetectionSystem)
 * 
 * Emits events:
 * - combo:updated (current, multiplier, lastFamily)
 * - combo:milestoneSmall (at combo.current == 5)
 * - combo:milestoneLarge (at combo.current == 8)
 */

export class ComboSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.milestoneTriggered = new Set(); // Track triggered milestones
    this.comboTimer = 0;
    this.comboTimeout = 3000; // Combo breaks after 3 seconds without pops
  }

  /**
   * Initialize combo system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    // Initialize combo state if not already done
    if (!gameState.combo) {
      gameState.combo = {
        current: 0,
        multiplier: 1,
        lastFamily: null
      };
    }

    this.comboTimer = 0;
    this.milestoneTriggered.clear();
    console.log('✅ ComboSystem initialized');
  }

  /**
   * Update combo system - track combo timeout
   */
  update(deltaTime, gameState) {
    if (gameState.paused || gameState.gameOver) return;

    // Only track combo timer if combo is active
    if (gameState.combo.current > 0) {
      this.comboTimer += deltaTime;

      // Reset combo if timeout exceeded
      if (this.comboTimer >= this.comboTimeout) {
        this.resetCombo(gameState);
        this.comboTimer = 0;
      }
    }
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState || gameState.paused || gameState.gameOver) return;

    if (eventName === 'floatie:popped') {
      this.handleFloatiePopped(data, gameState);
    }
  }

  /**
   * Handle floatie popped event
   * @param {Object} data - Event data {floatie, family, isRare, position}
   * @param {Object} gameState - Centralized game state
   */
  handleFloatiePopped(data, gameState) {
    const { floatie, family, isRare } = data;

    if (!floatie || !family) return;

    // Reset combo timer
    this.comboTimer = 0;

    // 1. Check if same family as last pop
    if (family === gameState.combo.lastFamily) {
      // Increase combo
      gameState.combo.current++;
    } else {
      // Reset combo to 1 (this is the first of new family)
      gameState.combo.current = 1;
    }

    // 3. Update lastFamily
    gameState.combo.lastFamily = family;

    // 2. Update multiplier based on combo count
    gameState.combo.multiplier = this.calculateMultiplier(gameState.combo.current);

    // 4. Emit combo updated event
    this.systemManager.emit('combo:updated', {
      current: gameState.combo.current,
      multiplier: gameState.combo.multiplier,
      lastFamily: gameState.combo.lastFamily,
      isRare
    });

    // 5. Check for milestone events
    this.checkMilestones(gameState.combo.current, family, isRare);

    console.log(`🔥 Combo: ${gameState.combo.current}x (${family}) - Multiplier: ${gameState.combo.multiplier}x`);
  }

  /**
   * Calculate multiplier based on combo count
   * @param {number} comboCount - Current combo count
   * @returns {number} Multiplier value
   */
  calculateMultiplier(comboCount) {
    if (comboCount >= 7) return 4;
    if (comboCount >= 5) return 3;
    if (comboCount >= 3) return 2;
    return 1;
  }

  /**
   * Check for milestone events
   * @param {number} comboCount - Current combo count
   * @param {string} family - Floatie family
   * @param {boolean} isRare - Is floatie rare
   */
  checkMilestones(comboCount, family, isRare) {
    // Milestone at combo 5
    if (comboCount === 5 && !this.milestoneTriggered.has(5)) {
      this.milestoneTriggered.add(5);
      this.systemManager.emit('combo:milestoneSmall', {
        comboCount: 5,
        family,
        isRare
      });
      console.log('🎯 Combo Milestone Small: 5x combo!');
    }

    // Milestone at combo 8
    if (comboCount === 8 && !this.milestoneTriggered.has(8)) {
      this.milestoneTriggered.add(8);
      this.systemManager.emit('combo:milestoneLarge', {
        comboCount: 8,
        family,
        isRare
      });
      console.log('🎯 Combo Milestone Large: 8x combo!');
    }

    // Reset milestone tracking when combo breaks
    // (This will be handled by checking if we're starting a new combo)
  }

  /**
   * Reset combo (called when combo breaks)
   * @param {Object} gameState - Centralized game state
   */
  resetCombo(gameState) {
    gameState.combo.current = 0;
    gameState.combo.multiplier = 1;
    gameState.combo.lastFamily = null;
    this.milestoneTriggered.clear();

    this.systemManager.emit('combo:reset', {
      reason: 'combo_broken'
    });

    console.log('💔 Combo reset');
  }

  /**
   * Get current combo info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Combo info
   */
  getComboInfo(gameState) {
    if (!gameState || !gameState.combo) {
      return {
        current: 0,
        multiplier: 1,
        lastFamily: null
      };
    }

    return {
      current: gameState.combo.current,
      multiplier: gameState.combo.multiplier,
      lastFamily: gameState.combo.lastFamily,
      nextMilestone: this.getNextMilestone(gameState.combo.current)
    };
  }

  /**
   * Get next milestone combo count
   * @param {number} currentCombo - Current combo count
   * @returns {number} Next milestone or null
   */
  getNextMilestone(currentCombo) {
    if (currentCombo < 5) return 5;
    if (currentCombo < 8) return 8;
    return null; // No more milestones defined
  }

  /**
   * Get multiplier for specific combo count
   * @param {number} comboCount - Combo count
   * @returns {number} Multiplier
   */
  getMultiplierForCombo(comboCount) {
    return this.calculateMultiplier(comboCount);
  }
}