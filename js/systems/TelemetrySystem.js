/**
 * TELEMETRY SYSTEM - Records gameplay metrics during each run
 * 
 * Features:
 * - Tracks run lifecycle events
 * - Records gameplay metrics (pops, combos, cards, pressure)
 * - Maintains rolling history of last 50 runs
 * - Stores data in localStorage
 * - Generates debug reports
 * 
 * Lifecycle:
 * - init: Initialize telemetry state
 * - update: Not used (event-driven)
 * - onEvent: Track all gameplay events
 * 
 * Listens to:
 * - run:started (from RunManagerSystem)
 * - run:ended (from RunManagerSystem)
 * - floatie:popped (from PopDetectionSystem)
 * - combo:updated (from ComboSystem)
 * - card:generated (from DeterministicCardSystem)
 * - card:activated (from CardExecutionSystem)
 * - pressure:levelChanged (from BoardPressureSystem)
 * - run:failed (from BoardPressureSystem)
 * 
 * Storage:
 * - localStorage key: "floatieRunHistory"
 * - Maintains last 50 runs
 * - Each run includes: duration, pops, maxCombo, cards, pressure, failure reason
 */

export class TelemetrySystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.maxHistorySize = 50;
    this.storageKey = 'floatieRunHistory';
  }

  /**
   * Initialize telemetry system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    if (!gameState.telemetry) {
      gameState.telemetry = {
        runStartTime: 0,
        popCount: 0,
        maxCombo: 0,
        cardsGenerated: 0,
        cardsUsed: 0,
        pressurePeak: 0,
        runDuration: 0,
        failureReason: null
      };
    }

    console.log('✅ TelemetrySystem initialized');
  }

  /**
   * Update telemetry system
   */
  update(deltaTime, gameState) {
    // Telemetry system is event-driven, no continuous update needed
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState) return;

    switch (eventName) {
      case 'run:started':
        this.handleRunStarted(gameState, data);
        break;
      case 'run:ended':
        this.handleRunEnded(gameState, data);
        break;
      case 'floatie:popped':
        this.handleFloatiePopped(gameState, data);
        break;
      case 'combo:updated':
        this.handleComboUpdated(gameState, data);
        break;
      case 'card:generated':
        this.handleCardGenerated(gameState, data);
        break;
      case 'card:activated':
        this.handleCardActivated(gameState, data);
        break;
      case 'pressure:levelChanged':
        this.handlePressureLevelChanged(gameState, data);
        break;
      case 'run:failed':
        this.handleRunFailed(gameState, data);
        break;
    }
  }

  /**
   * Handle run started event
   * @param {Object} gameState - Centralized game state
   * @param {Object} data - Event data
   */
  handleRunStarted(gameState, data) {
    gameState.telemetry.runStartTime = Date.now();
    gameState.telemetry.popCount = 0;
    gameState.telemetry.maxCombo = 0;
    gameState.telemetry.cardsGenerated = 0;
    gameState.telemetry.cardsUsed = 0;
    gameState.telemetry.pressurePeak = 0;
    gameState.telemetry.runDuration = 0;
    gameState.telemetry.failureReason = null;

    console.log('📊 Telemetry: Run started');
  }

  /**
   * Handle run ended event
   * @param {Object} gameState - Centralized game state
   * @param {Object} data - Event data
   */
  handleRunEnded(gameState, data) {
    // Calculate run duration
    gameState.telemetry.runDuration = Date.now() - gameState.telemetry.runStartTime;

    // Create run summary
    const runSummary = {
      timestamp: new Date().toISOString(),
      duration: gameState.telemetry.runDuration,
      popCount: gameState.telemetry.popCount,
      maxCombo: gameState.telemetry.maxCombo,
      cardsGenerated: gameState.telemetry.cardsGenerated,
      cardsUsed: gameState.telemetry.cardsUsed,
      pressurePeak: gameState.telemetry.pressurePeak,
      failureReason: gameState.telemetry.failureReason,
      score: data?.score || gameState.score.total,
      level: data?.level || gameState.run.level
    };

    // Save to history
    this.saveRunToHistory(runSummary);

    console.log('📊 Telemetry: Run ended');
    console.log('   Duration:', Math.floor(gameState.telemetry.runDuration / 1000) + 's');
    console.log('   Pops:', gameState.telemetry.popCount);
    console.log('   Max Combo:', gameState.telemetry.maxCombo);
    console.log('   Cards Used:', gameState.telemetry.cardsUsed);
  }

  /**
   * Handle floatie popped event
   * @param {Object} gameState - Centralized game state
   * @param {Object} data - Event data
   */
  handleFloatiePopped(gameState, data) {
    gameState.telemetry.popCount++;
  }

  /**
   * Handle combo updated event
   * @param {Object} gameState - Centralized game state
   * @param {Object} data - Event data
   */
  handleComboUpdated(gameState, data) {
    if (data.current > gameState.telemetry.maxCombo) {
      gameState.telemetry.maxCombo = data.current;
    }
  }

  /**
   * Handle card generated event
   * @param {Object} gameState - Centralized game state
   * @param {Object} data - Event data
   */
  handleCardGenerated(gameState, data) {
    gameState.telemetry.cardsGenerated++;
  }

  /**
   * Handle card activated event
   * @param {Object} gameState - Centralized game state
   * @param {Object} data - Event data
   */
  handleCardActivated(gameState, data) {
    gameState.telemetry.cardsUsed++;
  }

  /**
   * Handle pressure level changed event
   * @param {Object} gameState - Centralized game state
   * @param {Object} data - Event data
   */
  handlePressureLevelChanged(gameState, data) {
    if (data.level > gameState.telemetry.pressurePeak) {
      gameState.telemetry.pressurePeak = data.level;
    }
  }

  /**
   * Handle run failed event
   * @param {Object} gameState - Centralized game state
   * @param {Object} data - Event data
   */
  handleRunFailed(gameState, data) {
    gameState.telemetry.failureReason = data.reason || 'unknown';

    console.log('📊 Telemetry: Run failed -', data.reason);
  }

  /**
   * Save run to history
   * @param {Object} runSummary - Run summary data
   */
  saveRunToHistory(runSummary) {
    try {
      // Load existing history
      const history = this.loadRunHistory();

      // Add new run
      history.push(runSummary);

      // Keep only last 50 runs
      while (history.length > this.maxHistorySize) {
        history.shift();
      }

      // Save to localStorage
      const historyJSON = JSON.stringify(history);
      localStorage.setItem(this.storageKey, historyJSON);

      console.log(`💾 Run saved to history (${history.length}/${this.maxHistorySize})`);
    } catch (e) {
      // Handle localStorage quota exceeded
      if (e.name === 'QuotaExceededError') {
        console.warn('⚠️ LocalStorage quota exceeded, clearing old data...');
        this.clearRunHistory();
        // Try saving just this run
        try {
          localStorage.setItem(this.storageKey, JSON.stringify([runSummary]));
        } catch (e2) {
          console.error('❌ Failed to save run after cleanup:', e2.message);
        }
      } else {
        console.warn('⚠️ Failed to save run history:', e.message);
      }
    }
  }

  /**
   * Load run history from localStorage
   * @returns {Array} Run history
   */
  loadRunHistory() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('⚠️ Failed to load run history:', e.message);
      return [];
    }
  }

  /**
   * Get run history
   * @returns {Array} Run history
   */
  getRunHistory() {
    return this.loadRunHistory();
  }

  /**
   * Get run statistics
   * @returns {Object} Statistics
   */
  getRunStatistics() {
    const history = this.loadRunHistory();

    if (history.length === 0) {
      return {
        totalRuns: 0,
        averageDuration: 0,
        averagePopCount: 0,
        averageMaxCombo: 0,
        averageCardsUsed: 0,
        averagePressurePeak: 0,
        mostCommonFailure: null
      };
    }

    // Calculate averages
    const totalDuration = history.reduce((sum, run) => sum + run.duration, 0);
    const totalPops = history.reduce((sum, run) => sum + run.popCount, 0);
    const totalMaxCombo = history.reduce((sum, run) => sum + run.maxCombo, 0);
    const totalCardsUsed = history.reduce((sum, run) => sum + run.cardsUsed, 0);
    const totalPressure = history.reduce((sum, run) => sum + run.pressurePeak, 0);

    // Find most common failure reason
    const failureReasons = {};
    history.forEach(run => {
      if (run.failureReason) {
        failureReasons[run.failureReason] = (failureReasons[run.failureReason] || 0) + 1;
      }
    });

    let mostCommonFailure = null;
    let maxCount = 0;
    for (const [reason, count] of Object.entries(failureReasons)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonFailure = reason;
      }
    }

    return {
      totalRuns: history.length,
      averageDuration: Math.floor(totalDuration / history.length),
      averagePopCount: Math.floor(totalPops / history.length),
      averageMaxCombo: Math.floor(totalMaxCombo / history.length),
      averageCardsUsed: Math.floor(totalCardsUsed / history.length),
      averagePressurePeak: Math.floor(totalPressure / history.length),
      mostCommonFailure,
      failureReasons
    };
  }

  /**
   * Print telemetry report to console
   */
  printTelemetryReport() {
    const stats = this.getRunStatistics();
    const history = this.loadRunHistory();

    console.log('\n' + '='.repeat(60));
    console.log('📊 TELEMETRY REPORT');
    console.log('='.repeat(60));

    if (history.length === 0) {
      console.log('No runs recorded yet.');
      console.log('='.repeat(60) + '\n');
      return;
    }

    console.log(`\n📈 STATISTICS (${stats.totalRuns} runs)`);
    console.log('-'.repeat(60));
    console.log(`Average Duration:      ${Math.floor(stats.averageDuration / 1000)}s`);
    console.log(`Average Pop Count:     ${stats.averagePopCount}`);
    console.log(`Average Max Combo:     ${stats.averageMaxCombo}x`);
    console.log(`Average Cards Used:    ${stats.averageCardsUsed}`);
    console.log(`Average Pressure Peak: ${stats.averagePressurePeak}`);

    console.log(`\n❌ FAILURE REASONS`);
    console.log('-'.repeat(60));
    if (stats.mostCommonFailure) {
      console.log(`Most Common: ${stats.mostCommonFailure}`);
      for (const [reason, count] of Object.entries(stats.failureReasons)) {
        const percentage = ((count / stats.totalRuns) * 100).toFixed(1);
        console.log(`  ${reason}: ${count} (${percentage}%)`);
      }
    } else {
      console.log('No failures recorded.');
    }

    console.log(`\n🏆 BEST RUNS`);
    console.log('-'.repeat(60));

    // Best combo
    const bestCombo = history.reduce((best, run) => 
      run.maxCombo > best.maxCombo ? run : best
    );
    console.log(`Best Combo:     ${bestCombo.maxCombo}x (${Math.floor(bestCombo.duration / 1000)}s)`);

    // Most pops
    const mostPops = history.reduce((best, run) => 
      run.popCount > best.popCount ? run : best
    );
    console.log(`Most Pops:      ${mostPops.popCount} (${Math.floor(mostPops.duration / 1000)}s)`);

    // Longest run
    const longest = history.reduce((best, run) => 
      run.duration > best.duration ? run : best
    );
    console.log(`Longest Run:    ${Math.floor(longest.duration / 1000)}s (${longest.popCount} pops)`);

    // Highest pressure
    const highestPressure = history.reduce((best, run) => 
      run.pressurePeak > best.pressurePeak ? run : best
    );
    console.log(`Highest Pressure: Level ${highestPressure.pressurePeak}`);

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Clear run history
   */
  clearRunHistory() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('🗑️ Run history cleared');
    } catch (e) {
      console.warn('⚠️ Failed to clear run history:', e.message);
    }
  }

  /**
   * Export run history as JSON
   * @returns {string} JSON string
   */
  exportRunHistory() {
    const history = this.loadRunHistory();
    return JSON.stringify(history, null, 2);
  }

  /**
   * Get recent runs
   * @param {number} count - Number of recent runs to get
   * @returns {Array} Recent runs
   */
  getRecentRuns(count = 10) {
    const history = this.loadRunHistory();
    return history.slice(-count).reverse();
  }

  /**
   * Get run by index
   * @param {number} index - Run index
   * @returns {Object|null} Run data
   */
  getRunByIndex(index) {
    const history = this.loadRunHistory();
    if (index < 0 || index >= history.length) return null;
    return history[index];
  }

  /**
   * Get runs filtered by failure reason
   * @param {string} reason - Failure reason
   * @returns {Array} Filtered runs
   */
  getRunsByFailureReason(reason) {
    const history = this.loadRunHistory();
    return history.filter(run => run.failureReason === reason);
  }

  /**
   * Get runs with minimum combo
   * @param {number} minCombo - Minimum combo
   * @returns {Array} Filtered runs
   */
  getRunsWithMinCombo(minCombo) {
    const history = this.loadRunHistory();
    return history.filter(run => run.maxCombo >= minCombo);
  }

  /**
   * Validate telemetry state
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Validation result
   */
  validateTelemetryState(gameState) {
    const issues = [];

    if (!gameState.telemetry) {
      issues.push('Telemetry state not initialized');
    }

    if (gameState.telemetry.popCount < 0) {
      issues.push('Invalid popCount (< 0)');
    }

    if (gameState.telemetry.maxCombo < 0) {
      issues.push('Invalid maxCombo (< 0)');
    }

    if (gameState.telemetry.cardsGenerated < 0) {
      issues.push('Invalid cardsGenerated (< 0)');
    }

    if (gameState.telemetry.cardsUsed < 0) {
      issues.push('Invalid cardsUsed (< 0)');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
