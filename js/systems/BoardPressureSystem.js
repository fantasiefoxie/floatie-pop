/**
 * BOARD PRESSURE SYSTEM - Gradually increases board density and tension
 * 
 * Features:
 * - Progressive pressure level increases
 * - Spawn rate acceleration with pressure
 * - Density monitoring and overcrowding detection
 * - Run failure conditions
 * - Visual warning events
 * 
 * Lifecycle:
 * - init: Initialize pressure state
 * - update: Track pressure timer, check density
 * - onEvent: Handle game state changes
 * 
 * Listens to:
 * - game:started (reset pressure)
 * - floatie:popped (reduce pressure slightly)
 * 
 * Emits events:
 * - pressure:levelChanged (level, spawnMultiplier)
 * - board:overcrowded (floatieCount, densityLimit)
 * - run:failed (reason)
 * 
 * Pressure Scaling:
 * - Every 20 seconds: pressure.level++
 * - spawnMultiplier = 1 + (level * 0.1)
 * - densityLimit decreases slightly with pressure
 */

export class BoardPressureSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.pressureInterval = 20000; // 20 seconds
    this.overcrowdingThreshold = 3000; // 3 seconds of overcrowding
    this.overcrowdingTimer = 0;
    this.isOvercrowded = false;
    this.lastPressureLevel = 0;
  }

  /**
   * Initialize board pressure system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    if (!gameState.pressure) {
      gameState.pressure = {
        level: 0,
        spawnMultiplier: 1,
        densityLimit: 50,
        pressureTimer: 0
      };
    }

    this.overcrowdingTimer = 0;
    this.isOvercrowded = false;
    this.lastPressureLevel = 0;

    console.log('✅ BoardPressureSystem initialized');
  }

  /**
   * Update board pressure system
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (!gameState.run.active || !gameState.pressure) return;

    // Increment pressure timer
    gameState.pressure.pressureTimer += deltaTime;

    // Check for pressure level increase
    this.checkPressureProgression(gameState);

    // Monitor board density
    this.monitorBoardDensity(gameState);

    // Check for run failure
    this.checkRunFailure(gameState);
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState) return;

    if (eventName === 'game:started') {
      this.resetPressure(gameState);
    } else if (eventName === 'floatie:popped') {
      this.handleFloatiePopped(gameState);
    }
  }

  /**
   * Check for pressure level increase
   * @param {Object} gameState - Centralized game state
   */
  checkPressureProgression(gameState) {
    const pressureLevel = Math.floor(gameState.pressure.pressureTimer / this.pressureInterval);

    if (pressureLevel > gameState.pressure.level) {
      gameState.pressure.level = pressureLevel;

      // Calculate new spawn multiplier
      const newMultiplier = this.calculateSpawnMultiplier(pressureLevel);
      gameState.pressure.spawnMultiplier = newMultiplier;

      // Decrease density limit slightly
      gameState.pressure.densityLimit = Math.max(
        30,
        50 - (pressureLevel * 2)
      );

      // Emit event
      this.systemManager.emit('pressure:levelChanged', {
        level: pressureLevel,
        spawnMultiplier: newMultiplier,
        densityLimit: gameState.pressure.densityLimit
      });

      console.log(`📈 Pressure Level: ${pressureLevel}`);
      console.log(`   Spawn Multiplier: ${newMultiplier.toFixed(2)}x`);
      console.log(`   Density Limit: ${gameState.pressure.densityLimit}`);
    }
  }

  /**
   * Calculate spawn multiplier based on pressure level
   * @param {number} level - Pressure level
   * @returns {number} Spawn multiplier
   */
  calculateSpawnMultiplier(level) {
    // spawnMultiplier = 1 + (level * 0.1)
    return 1 + (level * 0.1);
  }

  /**
   * Monitor board density for overcrowding
   * @param {Object} gameState - Centralized game state
   */
  monitorBoardDensity(gameState) {
    if (!gameState.floats) return;

    const activeFloaties = gameState.floats.filter(f => f.isActive).length;
    const densityLimit = gameState.pressure.densityLimit;

    // Check if overcrowded
    if (activeFloaties >= densityLimit) {
      if (!this.isOvercrowded) {
        this.isOvercrowded = true;
        this.overcrowdingTimer = 0;

        // Emit overcrowded event
        this.systemManager.emit('board:overcrowded', {
          floatieCount: activeFloaties,
          densityLimit,
          pressure: gameState.pressure.level
        });

        console.warn(`⚠️ Board overcrowded: ${activeFloaties}/${densityLimit}`);
      }

      // Increment overcrowding timer
      this.overcrowdingTimer += 16; // Approximate frame time
    } else {
      // Reset overcrowding state
      if (this.isOvercrowded) {
        this.isOvercrowded = false;
        this.overcrowdingTimer = 0;

        console.log(`✅ Board density normalized: ${activeFloaties}/${densityLimit}`);
      }
    }
  }

  /**
   * Check for run failure condition
   * @param {Object} gameState - Centralized game state
   */
  checkRunFailure(gameState) {
    if (!this.isOvercrowded) return;

    // If overcrowded for too long, fail the run
    if (this.overcrowdingTimer >= this.overcrowdingThreshold) {
      this.systemManager.emit('run:failed', {
        reason: 'board_overcrowded',
        duration: this.overcrowdingTimer,
        pressure: gameState.pressure.level
      });

      console.error(`💀 Run failed: Board overcrowded for ${this.overcrowdingTimer}ms`);
    }
  }

  /**
   * Handle floatie popped event - reduce pressure slightly
   * @param {Object} gameState - Centralized game state
   */
  handleFloatiePopped(gameState) {
    if (!gameState.pressure) return;

    // Reduce overcrowding timer when floaties are popped
    if (this.isOvercrowded) {
      this.overcrowdingTimer = Math.max(0, this.overcrowdingTimer - 100);
    }
  }

  /**
   * Reset pressure to initial state
   * @param {Object} gameState - Centralized game state
   */
  resetPressure(gameState) {
    gameState.pressure = {
      level: 0,
      spawnMultiplier: 1,
      densityLimit: 50,
      pressureTimer: 0
    };

    this.overcrowdingTimer = 0;
    this.isOvercrowded = false;
    this.lastPressureLevel = 0;

    console.log('🔄 Pressure reset');
  }

  /**
   * Get pressure info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Pressure information
   */
  getPressureInfo(gameState) {
    if (!gameState.pressure) {
      return {
        level: 0,
        spawnMultiplier: 1,
        densityLimit: 50,
        timeToNextLevel: 0,
        isOvercrowded: false
      };
    }

    const timeElapsed = gameState.pressure.pressureTimer;
    const nextLevelTime = (gameState.pressure.level + 1) * this.pressureInterval;
    const timeToNextLevel = Math.max(0, nextLevelTime - timeElapsed);

    return {
      level: gameState.pressure.level,
      spawnMultiplier: gameState.pressure.spawnMultiplier.toFixed(2),
      densityLimit: gameState.pressure.densityLimit,
      timeToNextLevel: Math.ceil(timeToNextLevel / 1000),
      isOvercrowded: this.isOvercrowded,
      overcrowdingDuration: this.overcrowdingTimer
    };
  }

  /**
   * Get board density percentage
   * @param {Object} gameState - Centralized game state
   * @returns {number} Density percentage (0-100)
   */
  getBoardDensityPercent(gameState) {
    if (!gameState.floats || !gameState.pressure) return 0;

    const activeFloaties = gameState.floats.filter(f => f.isActive).length;
    const densityLimit = gameState.pressure.densityLimit;

    return Math.min(100, (activeFloaties / densityLimit) * 100);
  }

  /**
   * Get pressure intensity (0-1)
   * @param {Object} gameState - Centralized game state
   * @returns {number} Intensity value
   */
  getPressureIntensity(gameState) {
    if (!gameState.pressure) return 0;

    // Intensity increases with pressure level
    // Max intensity at level 10
    return Math.min(1, gameState.pressure.level / 10);
  }

  /**
   * Get time until next pressure level
   * @param {Object} gameState - Centralized game state
   * @returns {number} Time in milliseconds
   */
  getTimeToNextLevel(gameState) {
    if (!gameState.pressure) return this.pressureInterval;

    const nextLevelTime = (gameState.pressure.level + 1) * this.pressureInterval;
    const timeElapsed = gameState.pressure.pressureTimer;

    return Math.max(0, nextLevelTime - timeElapsed);
  }

  /**
   * Get pressure scaling info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Scaling information
   */
  getScalingInfo(gameState) {
    const levels = [];

    for (let i = 0; i <= 10; i++) {
      levels.push({
        level: i,
        spawnMultiplier: (1 + (i * 0.1)).toFixed(2),
        densityLimit: Math.max(30, 50 - (i * 2)),
        timeSeconds: i * 20
      });
    }

    return {
      pressureInterval: this.pressureInterval / 1000,
      overcrowdingThreshold: this.overcrowdingThreshold / 1000,
      levels
    };
  }

  /**
   * Manually increase pressure (for testing)
   * @param {Object} gameState - Centralized game state
   * @param {number} levels - Number of levels to increase
   */
  increasePressure(gameState, levels = 1) {
    gameState.pressure.pressureTimer += levels * this.pressureInterval;
    this.checkPressureProgression(gameState);

    console.log(`🔧 Pressure increased by ${levels} level(s)`);
  }

  /**
   * Get overcrowding status
   * @returns {Object} Overcrowding status
   */
  getOvercrowdingStatus() {
    return {
      isOvercrowded: this.isOvercrowded,
      duration: this.overcrowdingTimer,
      threshold: this.overcrowdingThreshold,
      percentToFailure: (this.overcrowdingTimer / this.overcrowdingThreshold) * 100
    };
  }

  /**
   * Validate pressure state
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Validation result
   */
  validatePressureState(gameState) {
    const issues = [];

    if (!gameState.pressure) {
      issues.push('Pressure state not initialized');
    }

    if (gameState.pressure.level < 0) {
      issues.push('Invalid pressure level (< 0)');
    }

    if (gameState.pressure.spawnMultiplier < 1) {
      issues.push('Invalid spawn multiplier (< 1)');
    }

    if (gameState.pressure.densityLimit < 30) {
      issues.push('Density limit too low (< 30)');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
