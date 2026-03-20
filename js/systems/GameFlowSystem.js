/**
 * GAME FLOW SYSTEM - Manages game lifecycle and state transitions
 * 
 * Features:
 * - Manages game states (menu, playing, paused, gameover)
 * - Handles game start, pause, resume, and end transitions
 * - Resets gameplay systems on new run
 * - Prevents gameplay updates when not playing
 * - Tracks run duration
 * 
 * Lifecycle:
 * - init: Initialize flow state
 * - update: Track run time, prevent updates if not playing
 * - onEvent: Handle game control events
 * 
 * Listens to:
 * - game:start (from main)
 * - game:reset (from main)
 * 
 * Emits events:
 * - flow:stateChanged (newState, oldState)
 * - game:started (timestamp)
 * - game:paused (timestamp)
 * - game:resumed (timestamp)
 * - game:over (score, combo, time)
 * 
 * State Transitions:
 * menu → playing (startGame)
 * playing → paused (pauseGame)
 * paused → playing (resumeGame)
 * playing → gameover (endGame)
 * gameover → menu (restart)
 */

export class GameFlowSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.previousState = null;
    this.pausedTime = 0;
  }

  /**
   * Initialize game flow system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    if (!gameState.flow) {
      gameState.flow = {
        state: 'menu',
        runStartTime: 0,
        gameOver: false
      };
    }

    this.previousState = gameState.flow.state;
    this.pausedTime = 0;

    console.log('✅ GameFlowSystem initialized');
  }

  /**
   * Update game flow system
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (!gameState.flow) return;

    // Track run time if playing
    if (gameState.flow.state === 'playing' && gameState.flow.runStartTime > 0) {
      gameState.survivalTime = Date.now() - gameState.flow.runStartTime;
    }

    // Prevent gameplay updates if not playing
    if (gameState.flow.state !== 'playing') {
      gameState.paused = true;
    } else {
      gameState.paused = false;
    }
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState) return;

    if (eventName === 'game:start') {
      this.startGame(gameState);
    } else if (eventName === 'game:reset') {
      this.resetGame(gameState);
    }
  }

  /**
   * Start a new game
   * @param {Object} gameState - Centralized game state
   */
  startGame(gameState) {
    // Reset score
    gameState.score = {
      total: 0,
      lastGain: 0
    };

    // Reset combo
    gameState.combo = {
      current: 0,
      multiplier: 1,
      lastFamily: null
    };

    // Reset card state
    gameState.cards = {
      popCounter: 0,
      deck: [],
      activeCards: [],
      hand: []
    };

    // Reset render state
    gameState.render = {
      particles: [],
      floatingText: [],
      animations: []
    };

    // Clear floaties
    gameState.floats.forEach(f => {
      if (f.el) f.el.remove();
    });
    gameState.floats = [];

    // Reset survival time
    gameState.survivalTime = 0;

    // Reset game over state
    gameState.gameOver = false;
    gameState.flow.gameOver = false;
    gameState.flow.state = 'playing';

    // Set run start time
    gameState.flow.runStartTime = Date.now();

    // Set paused to false immediately
    gameState.paused = false;

    // Change state
    this.changeState(gameState, 'playing');

    // Emit event
    this.systemManager.emit('flow:stateChanged', {
      newState: 'playing',
      oldState: this.previousState
    });

    this.systemManager.emit('game:started', {
      timestamp: gameState.flow.runStartTime,
      mode: gameState.gameMode
    });

    console.log('🎮 Game started - flow.state:', gameState.flow.state);
  }

  /**
   * Pause the game
   * @param {Object} gameState - Centralized game state
   */
  pauseGame(gameState) {
    if (gameState.flow.state !== 'playing') {
      console.warn('⚠️ Cannot pause - game not playing');
      return;
    }

    this.pausedTime = Date.now();
    this.changeState(gameState, 'paused');

    // Emit event
    this.systemManager.emit('flow:stateChanged', {
      newState: 'paused',
      oldState: 'playing'
    });

    this.systemManager.emit('game:paused', {
      timestamp: this.pausedTime,
      score: gameState.score.total,
      combo: gameState.combo.current
    });

    console.log('⏸️ Game paused');
  }

  /**
   * Resume the game
   * @param {Object} gameState - Centralized game state
   */
  resumeGame(gameState) {
    if (gameState.flow.state !== 'paused') {
      console.warn('⚠️ Cannot resume - game not paused');
      return;
    }

    // Adjust run start time to account for pause duration
    const pauseDuration = Date.now() - this.pausedTime;
    gameState.flow.runStartTime += pauseDuration;

    this.changeState(gameState, 'playing');

    // Emit event
    this.systemManager.emit('flow:stateChanged', {
      newState: 'playing',
      oldState: 'paused'
    });

    this.systemManager.emit('game:resumed', {
      timestamp: Date.now(),
      score: gameState.score.total,
      combo: gameState.combo.current
    });

    console.log('▶️ Game resumed');
  }

  /**
   * End the game
   * @param {Object} gameState - Centralized game state
   */
  endGame(gameState) {
    if (gameState.flow.state === 'gameover') {
      console.warn('⚠️ Game already over');
      return;
    }

    // Update high score
    if (gameState.score.total > gameState.highScore) {
      gameState.highScore = gameState.score.total;
    }

    this.changeState(gameState, 'gameover');
    gameState.flow.gameOver = true;

    // Emit event
    this.systemManager.emit('flow:stateChanged', {
      newState: 'gameover',
      oldState: gameState.flow.state
    });

    this.systemManager.emit('game:over', {
      score: gameState.score.total,
      combo: gameState.combo.current,
      time: gameState.survivalTime,
      mode: gameState.gameMode,
      highScore: gameState.highScore
    });

    console.log('💀 Game over');
  }

  /**
   * Restart the game
   * @param {Object} gameState - Centralized game state
   */
  restartGame(gameState) {
    // Reset all gameplay systems
    this.resetGame(gameState);

    // Start new run
    this.startGame(gameState);

    console.log('🔄 Game restarted');
  }

  /**
   * Reset game to menu state
   * @param {Object} gameState - Centralized game state
   */
  resetGame(gameState) {
    // Clear floaties
    gameState.floats.forEach(f => {
      if (f.el) f.el.remove();
    });
    gameState.floats = [];

    // Reset all gameplay state
    gameState.score = {
      total: 0,
      lastGain: 0
    };

    gameState.combo = {
      current: 0,
      multiplier: 1,
      lastFamily: null
    };

    gameState.cards = {
      popCounter: 0,
      deck: [],
      activeCards: [],
      hand: []
    };

    gameState.render = {
      particles: [],
      floatingText: [],
      animations: []
    };

    gameState.survivalTime = 0;
    gameState.flow.gameOver = false;
    gameState.flow.runStartTime = 0;

    this.changeState(gameState, 'menu');

    // Emit event
    this.systemManager.emit('flow:stateChanged', {
      newState: 'menu',
      oldState: this.previousState
    });

    console.log('🔄 Game reset to menu');
  }

  /**
   * Change game state
   * @param {Object} gameState - Centralized game state
   * @param {string} newState - New state
   */
  changeState(gameState, newState) {
    const validStates = ['menu', 'playing', 'paused', 'gameover'];

    if (!validStates.includes(newState)) {
      console.warn(`⚠️ Invalid state: ${newState}`);
      return;
    }

    this.previousState = gameState.flow.state;
    gameState.flow.state = newState;

    console.log(`📊 State: ${this.previousState} → ${newState}`);
  }

  /**
   * Get current game state
   * @param {Object} gameState - Centralized game state
   * @returns {string} Current state
   */
  getCurrentState(gameState) {
    return gameState.flow?.state || 'menu';
  }

  /**
   * Check if game is playing
   * @param {Object} gameState - Centralized game state
   * @returns {boolean} True if playing
   */
  isPlaying(gameState) {
    return gameState.flow?.state === 'playing';
  }

  /**
   * Check if game is paused
   * @param {Object} gameState - Centralized game state
   * @returns {boolean} True if paused
   */
  isPaused(gameState) {
    return gameState.flow?.state === 'paused';
  }

  /**
   * Check if game is over
   * @param {Object} gameState - Centralized game state
   * @returns {boolean} True if game over
   */
  isGameOver(gameState) {
    return gameState.flow?.state === 'gameover';
  }

  /**
   * Get run duration
   * @param {Object} gameState - Centralized game state
   * @returns {number} Duration in milliseconds
   */
  getRunDuration(gameState) {
    if (gameState.flow.runStartTime === 0) return 0;

    if (gameState.flow.state === 'playing') {
      return Date.now() - gameState.flow.runStartTime;
    }

    return gameState.survivalTime;
  }

  /**
   * Get flow info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Flow info
   */
  getFlowInfo(gameState) {
    return {
      state: gameState.flow.state,
      isPlaying: this.isPlaying(gameState),
      isPaused: this.isPaused(gameState),
      isGameOver: this.isGameOver(gameState),
      runDuration: this.getRunDuration(gameState),
      runStartTime: gameState.flow.runStartTime
    };
  }
}
