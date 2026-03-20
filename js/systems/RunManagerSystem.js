/**
 * RUN MANAGER SYSTEM - Controls seeded runs and difficulty progression
 * 
 * Features:
 * - Deterministic seed generation for reproducible runs
 * - Level progression based on floatie pops
 * - Difficulty scaling with each level
 * - Run state management
 * - Difficulty parameter adjustment
 * 
 * Lifecycle:
 * - init: Initialize run state
 * - update: Check level progression and run end conditions
 * - onEvent: Track floatie pops for level progression
 * 
 * Listens to:
 * - floatie:popped (from PopDetectionSystem)
 * - game:started (from GameFlowSystem)
 * 
 * Emits events:
 * - run:started (seed, level, difficulty)
 * - run:levelAdvanced (level, difficulty)
 * - run:ended (level, score, pops)
 * 
 * Difficulty Scaling:
 * - difficulty = 1 + (level * 0.15)
 * - spawnRate increases with difficulty
 * - rareFloatieChance increases with difficulty
 * - boardDensity increases with difficulty
 */

export class RunManagerSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.popsPerLevel = 25;
    this.maxBoardDensity = 50;
    this.baseSpawnRate = 1.0;
    this.baseRareChance = 0.05;
    this.baseBoardDensity = 27;
  }

  /**
   * Initialize run manager system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    if (!gameState.run) {
      gameState.run = {
        active: false,
        seed: 0,
        level: 1,
        difficulty: 1,
        startTime: 0,
        popsThisLevel: 0
      };
    }

    console.log('✅ RunManagerSystem initialized');
  }

  /**
   * Update run manager system
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (!gameState.run.active) return;

    // Check for level advancement
    if (gameState.run.popsThisLevel >= this.popsPerLevel) {
      this.advanceLevel(gameState);
    }

    // Check for run end conditions
    if (this.shouldEndRun(gameState)) {
      this.endRun(gameState);
    }
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState) return;

    if (eventName === 'floatie:popped') {
      this.handleFloatiePopped(gameState);
    } else if (eventName === 'game:start') {
      this.startRun(gameState);
    }
  }

  /**
   * Start a new run
   * @param {Object} gameState - Centralized game state
   */
  startRun(gameState) {
    // Generate deterministic seed
    const seed = this.generateSeed();

    // Initialize run state
    gameState.run.active = true;
    gameState.run.seed = seed;
    gameState.run.level = 1;
    gameState.run.difficulty = 1;
    gameState.run.startTime = Date.now();
    gameState.run.popsThisLevel = 0;

    // Store seed for other systems
    gameState.runSeed = seed;

    // Apply initial difficulty
    this.applyDifficulty(gameState, 1);

    // Emit event
    this.systemManager.emit('run:started', {
      seed,
      level: 1,
      difficulty: 1
    });

    console.log(`🎮 Run started (Seed: ${seed})`);
  }

  /**
   * Generate deterministic seed
   * @returns {number} Seed value
   */
  generateSeed() {
    // Use timestamp as base for deterministic but unique seeds
    const timestamp = Date.now();
    
    // Mix timestamp with a prime number for better distribution
    const seed = (timestamp * 73856093) ^ (timestamp >> 16);
    
    return Math.abs(seed) % 2147483647; // Keep within 32-bit range
  }

  /**
   * Handle floatie popped event
   * @param {Object} gameState - Centralized game state
   */
  handleFloatiePopped(gameState) {
    if (!gameState.run.active) return;

    gameState.run.popsThisLevel++;

    console.log(`📊 Pops this level: ${gameState.run.popsThisLevel}/${this.popsPerLevel}`);
  }

  /**
   * Advance to next level
   * @param {Object} gameState - Centralized game state
   */
  advanceLevel(gameState) {
    gameState.run.level++;
    gameState.run.popsThisLevel = 0;

    // Calculate new difficulty
    const newDifficulty = this.calculateDifficulty(gameState.run.level);
    gameState.run.difficulty = newDifficulty;

    // Apply difficulty scaling
    this.applyDifficulty(gameState, newDifficulty);

    // Emit event
    this.systemManager.emit('run:levelAdvanced', {
      level: gameState.run.level,
      difficulty: newDifficulty,
      score: gameState.score.total
    });

    console.log(`⬆️ Level Advanced: ${gameState.run.level} (Difficulty: ${newDifficulty.toFixed(2)})`);
  }

  /**
   * Calculate difficulty for a given level
   * @param {number} level - Level number
   * @returns {number} Difficulty multiplier
   */
  calculateDifficulty(level) {
    // difficulty = 1 + (level * 0.15)
    return 1 + (level * 0.15);
  }

  /**
   * Apply difficulty scaling to game parameters
   * @param {Object} gameState - Centralized game state
   * @param {number} difficulty - Difficulty multiplier
   */
  applyDifficulty(gameState, difficulty) {
    // Scale spawn rate
    gameState.difficultySpawnRate = this.baseSpawnRate * difficulty;

    // Scale rare floatie chance
    gameState.difficultyRareChance = this.baseRareChance + (difficulty * 0.02);

    // Scale board density
    gameState.difficultyBoardDensity = Math.floor(
      this.baseBoardDensity + (difficulty * 3)
    );

    // Clamp board density to max
    gameState.difficultyBoardDensity = Math.min(
      gameState.difficultyBoardDensity,
      this.maxBoardDensity
    );

    // Scale movement speed
    gameState.difficultyMovementSpeed = 1 + (difficulty * 0.1);

    console.log(`📈 Difficulty applied: ${difficulty.toFixed(2)}`);
    console.log(`   Spawn Rate: ${gameState.difficultySpawnRate.toFixed(2)}x`);
    console.log(`   Rare Chance: ${(gameState.difficultyRareChance * 100).toFixed(1)}%`);
    console.log(`   Board Density: ${gameState.difficultyBoardDensity}`);
  }

  /**
   * Check if run should end
   * @param {Object} gameState - Centralized game state
   * @returns {boolean} True if run should end
   */
  shouldEndRun(gameState) {
    if (!gameState.floats) return false;

    // Check if board is overcrowded
    const activeFloaties = gameState.floats.filter(f => f.isActive).length;
    if (activeFloaties >= this.maxBoardDensity) {
      console.warn('⚠️ Board overcrowded - run ending');
      return true;
    }

    // Optional: Check max run time (e.g., 30 minutes)
    const maxRunTime = 30 * 60 * 1000; // 30 minutes
    const runDuration = Date.now() - gameState.run.startTime;
    if (runDuration > maxRunTime) {
      console.warn('⚠️ Max run time exceeded - run ending');
      return true;
    }

    return false;
  }

  /**
   * End the current run
   * @param {Object} gameState - Centralized game state
   */
  endRun(gameState) {
    if (!gameState.run.active) return;

    gameState.run.active = false;

    const runDuration = Date.now() - gameState.run.startTime;
    const minutes = Math.floor(runDuration / 60000);
    const seconds = Math.floor((runDuration % 60000) / 1000);

    // Emit event
    this.systemManager.emit('run:ended', {
      level: gameState.run.level,
      difficulty: gameState.run.difficulty,
      score: gameState.score.total,
      pops: gameState.run.popsThisLevel,
      duration: runDuration,
      seed: gameState.run.seed
    });

    console.log(`🏁 Run ended`);
    console.log(`   Level: ${gameState.run.level}`);
    console.log(`   Score: ${gameState.score.total}`);
    console.log(`   Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
  }

  /**
   * Get run info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Run information
   */
  getRunInfo(gameState) {
    if (!gameState.run) {
      return {
        active: false,
        level: 0,
        difficulty: 0,
        popsThisLevel: 0
      };
    }

    const runDuration = gameState.run.active
      ? Date.now() - gameState.run.startTime
      : 0;

    return {
      active: gameState.run.active,
      seed: gameState.run.seed,
      level: gameState.run.level,
      difficulty: gameState.run.difficulty.toFixed(2),
      popsThisLevel: gameState.run.popsThisLevel,
      popsToNextLevel: this.popsPerLevel - gameState.run.popsThisLevel,
      duration: runDuration,
      startTime: gameState.run.startTime
    };
  }

  /**
   * Get difficulty info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Difficulty parameters
   */
  getDifficultyInfo(gameState) {
    return {
      spawnRate: gameState.difficultySpawnRate.toFixed(2),
      rareChance: (gameState.difficultyRareChance * 100).toFixed(1),
      boardDensity: gameState.difficultyBoardDensity,
      movementSpeed: gameState.difficultyMovementSpeed.toFixed(2)
    };
  }

  /**
   * Get level progression info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Level progression
   */
  getLevelProgress(gameState) {
    const progress = (gameState.run.popsThisLevel / this.popsPerLevel) * 100;

    return {
      level: gameState.run.level,
      popsThisLevel: gameState.run.popsThisLevel,
      popsPerLevel: this.popsPerLevel,
      progress: Math.min(progress, 100),
      nextLevelAt: this.popsPerLevel
    };
  }

  /**
   * Manually set difficulty (for testing)
   * @param {Object} gameState - Centralized game state
   * @param {number} level - Level to set
   */
  setLevel(gameState, level) {
    gameState.run.level = level;
    gameState.run.popsThisLevel = 0;

    const difficulty = this.calculateDifficulty(level);
    gameState.run.difficulty = difficulty;

    this.applyDifficulty(gameState, difficulty);

    console.log(`🔧 Level set to ${level} (Difficulty: ${difficulty.toFixed(2)})`);
  }

  /**
   * Get seed for reproducible runs
   * @param {Object} gameState - Centralized game state
   * @returns {number} Current run seed
   */
  getSeed(gameState) {
    return gameState.run.seed;
  }

  /**
   * Validate run state
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Validation result
   */
  validateRunState(gameState) {
    const issues = [];

    if (!gameState.run) {
      issues.push('Run state not initialized');
    }

    if (gameState.run.level < 1) {
      issues.push('Invalid level (< 1)');
    }

    if (gameState.run.difficulty < 1) {
      issues.push('Invalid difficulty (< 1)');
    }

    if (gameState.run.popsThisLevel < 0) {
      issues.push('Invalid popsThisLevel (< 0)');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
