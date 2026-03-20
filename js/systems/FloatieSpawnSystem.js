/**
 * FLOATIE SPAWN SYSTEM - Centralized floatie spawning with deterministic RNG
 * 
 * Features:
 * - Deterministic spawning using runSeed
 * - Weighted RNG for floatie families
 * - Rare floatie probability support
 * - Collision avoidance and minimum spacing
 * - Spawn from board edges (bottom priority)
 * 
 * Lifecycle:
 * - init: Initialize seeded RNG using runSeed
 * - update: Maintain floatie density, spawn when needed
 * - onEvent: Handle game start/reset events
 * 
 * Listens to:
 * - game:start (from main)
 * - game:reset (from main)
 * - floatie:popped (from PopDetectionSystem)
 * 
 * Emits events:
 * - floatie:spawned (floatie, family, isRare)
 */

import { ALL } from '../constants.js';

// Floatie family definitions
const FLOATIE_FAMILIES = {
  jelly: { emoji: '🪼', color: '#ff69b4', rarity: 'common' },
  coral: { emoji: '🪸', color: '#ff8c00', rarity: 'common' },
  pearl: { emoji: '🦪', color: '#f0f8ff', rarity: 'common' },
  star: { emoji: '⭐', color: '#ffd700', rarity: 'uncommon' },
  rainbow: { emoji: '🌈', color: 'rainbow', rarity: 'rare' },
  bomb: { emoji: '💣', color: '#000000', rarity: 'rare' }
};

/**
 * Weighted Random Number Generator
 * Uses seeded RNG for deterministic results
 */
class WeightedRNG {
  constructor(seed) {
    this.seed = seed;
    this.state = seed;
  }

  /**
   * Generate next random number [0, 1)
   */
  next() {
    this.state = (this.state * 9301 + 49297) % 233280;
    return this.state / 233280;
  }

  /**
   * Select from weighted options
   * @param {Object} weights - { option: weight, ... }
   * @returns {string} Selected option
   */
  selectWeighted(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = this.next() * total;

    for (const [option, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return option;
      }
    }

    // Fallback to first option
    return Object.keys(weights)[0];
  }

  /**
   * Generate random integer in range [min, max)
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate random float in range [min, max)
   */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }
}

export class FloatieSpawnSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.playArea = null;
    this.rng = null;
    this.spawnTimer = 0;
    this.spawnCount = 0;
    this.minSpacing = 60; // Minimum distance between floaties
  }

  /**
   * Initialize spawn system with seeded RNG
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    this.playArea = document.getElementById('playArea');

    if (!this.playArea) {
      console.warn('⚠️ PlayArea element not found');
      return;
    }

    // Initialize with placeholder seed - will be set properly on game:start
    this.rng = new WeightedRNG(Date.now());
    this.spawnTimer = 0;
    this.spawnCount = 0;

    console.log(`✅ FloatieSpawnSystem initialized (seed pending)`);
  }

  /**
   * Initialize RNG with proper runSeed
   * @param {Object} gameState - Centralized game state
   */
  initializeRNG(gameState) {
    const runSeed = gameState.runSeed || Date.now();
    this.rng = new WeightedRNG(runSeed);
    console.log(`🎲 FloatieSpawnSystem RNG initialized (seed: ${runSeed})`);
  }

  /**
   * Update spawn system - maintain floatie density
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (gameState.paused || gameState.gameOver) return;

    // Get target density from difficulty or config
    let maxFloaties = gameState.difficultyBoardDensity || gameState.spawnConfig.maxFloaties;

    // Apply pressure spawn multiplier (increases density limit with pressure)
    if (gameState.pressure && gameState.pressure.spawnMultiplier) {
      maxFloaties = Math.floor(maxFloaties * gameState.pressure.spawnMultiplier);
    }

    // Clamp to reasonable limits
    maxFloaties = Math.min(maxFloaties, 80); // Absolute maximum

    // Spawn floaties to maintain density
    while (gameState.floats.length < maxFloaties) {
      this.spawnFloatie(gameState);
    }
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    if (eventName === 'game:start') {
      this.handleGameStart(data);
    } else if (eventName === 'game:reset') {
      this.handleGameReset(data);
    }
  }

  /**
   * Handle game start event
   */
  handleGameStart(data) {
    const gameState = this.systemManager.gameState;
    if (!gameState) return;

    // Initialize RNG with proper runSeed from RunManagerSystem
    this.initializeRNG(gameState);

    // Spawn initial floaties
    const initialCount = gameState.difficultyBoardDensity || gameState.spawnConfig.maxFloaties;
    for (let i = 0; i < initialCount; i++) {
      this.spawnFloatie(gameState);
    }

    console.log(`🌊 Spawned ${initialCount} initial floaties`);
  }

  /**
   * Handle game reset event
   */
  handleGameReset(data) {
    const gameState = this.systemManager.gameState;
    if (!gameState) return;

    // Clear existing floaties
    gameState.floats.forEach(f => {
      if (f.el) f.el.remove();
    });
    gameState.floats = [];

    // Spawn new floaties
    const initialCount = gameState.difficultyBoardDensity || gameState.spawnConfig.maxFloaties;
    for (let i = 0; i < initialCount; i++) {
      this.spawnFloatie(gameState);
    }
  }

  /**
   * Spawn a single floatie
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Spawned floatie object
   */
  spawnFloatie(gameState) {
    // Select family using weighted RNG
    const family = this.rng.selectWeighted(gameState.spawnConfig.spawnWeights);

    // Determine if rare
    const rareChance = gameState.difficultyRareChance || 0.05;
    const isRare = this.rng.next() < rareChance;

    // Get spawn position
    const position = this.getSpawnPosition(gameState);
    if (!position) {
      console.warn('⚠️ Could not find valid spawn position');
      return null;
    }

    // Create floatie object
    const floatie = {
      id: `floatie-${this.spawnCount++}`,
      family,
      type: family,
      x: position.x,
      y: position.y,
      vx: this.rng.nextFloat(-2, 2),
      vy: this.rng.nextFloat(-2, 2),
      radius: 20,
      visualRadius: 20,
      interactionRadius: 30,
      isRare,
      isActive: true,
      el: null
    };

    // Create DOM element
    const el = document.createElement('div');
    el.className = `float floatie-${family}`;
    el.id = floatie.id;
    el.textContent = FLOATIE_FAMILIES[family].emoji;
    el.style.cssText = `
      position: absolute;
      left: ${floatie.x}px;
      top: ${floatie.y}px;
      font-size: 40px;
      cursor: pointer;
      z-index: 15;
      user-select: none;
      touch-action: none;
      transition: none;
      ${isRare ? 'filter: brightness(1.5) drop-shadow(0 0 10px gold);' : ''}
    `;

    this.playArea.appendChild(el);
    floatie.el = el;

    // Add to game state
    gameState.floats.push(floatie);

    // Emit event
    this.systemManager.emit('floatie:spawned', {
      floatie,
      family,
      isRare
    });

    return floatie;
  }

  /**
   * Get valid spawn position avoiding collisions
   * Priority: bottom edge > random edge > random position
   * @param {Object} gameState - Centralized game state
   * @returns {Object|null} Position {x, y} or null if no valid position
   */
  getSpawnPosition(gameState) {
    const playArea = this.playArea;
    const width = playArea.clientWidth;
    const height = playArea.clientHeight;
    const padding = 40;
    const maxAttempts = 10;

    // Try to spawn from bottom edge first (60% chance)
    if (this.rng.next() < 0.6) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const x = this.rng.nextFloat(padding, width - padding);
        const y = height - padding;

        if (this.isValidPosition(x, y, gameState)) {
          return { x, y };
        }
      }
    }

    // Try random edge (top, left, right)
    const edges = ['top', 'left', 'right'];
    for (const edge of edges) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let x, y;

        switch (edge) {
          case 'top':
            x = this.rng.nextFloat(padding, width - padding);
            y = padding;
            break;
          case 'left':
            x = padding;
            y = this.rng.nextFloat(padding, height - padding);
            break;
          case 'right':
            x = width - padding;
            y = this.rng.nextFloat(padding, height - padding);
            break;
        }

        if (this.isValidPosition(x, y, gameState)) {
          return { x, y };
        }
      }
    }

    // Fallback: random position anywhere
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = this.rng.nextFloat(padding, width - padding);
      const y = this.rng.nextFloat(padding, height - padding);

      if (this.isValidPosition(x, y, gameState)) {
        return { x, y };
      }
    }

    return null;
  }

  /**
   * Check if position is valid (no collision, within bounds)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} gameState - Centralized game state
   * @returns {boolean} True if position is valid
   */
  isValidPosition(x, y, gameState) {
    const playArea = this.playArea;
    const width = playArea.clientWidth;
    const height = playArea.clientHeight;
    const padding = 40;

    // Check bounds
    if (x < padding || x > width - padding || y < padding || y > height - padding) {
      return false;
    }

    // Check collision with existing floaties
    for (const floatie of gameState.floats) {
      if (!floatie.isActive) continue;

      const distance = Math.sqrt(
        Math.pow(x - floatie.x, 2) +
        Math.pow(y - floatie.y, 2)
      );

      if (distance < this.minSpacing) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get floatie family info
   * @param {string} family - Family name
   * @returns {Object} Family info
   */
  getFamilyInfo(family) {
    return FLOATIE_FAMILIES[family] || FLOATIE_FAMILIES.jelly;
  }

  /**
   * Get spawn statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      spawnCount: this.spawnCount,
      rngState: this.rng?.state || 0
    };
  }
}
