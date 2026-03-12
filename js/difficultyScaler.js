import { runManager } from './runManager.js';

// Difficulty scaling configuration
const DIFFICULTY_CONFIG = {
  // Spawn rate scaling (floaties per second multiplier)
  spawnRate: {
    base: 1.0,
    increment: 0.1,
    maxMultiplier: 3.0,
    curve: 'exponential' // linear, exponential, logarithmic
  },
  
  // Rare floatie chance scaling (percentage increase)
  rareFloatieChance: {
    base: 0.05, // 5% base chance
    increment: 0.02, // +2% per level
    maxChance: 0.4, // 40% max chance
    curve: 'linear'
  },
  
  // Board density scaling (number of floaties on screen)
  boardDensity: {
    base: 27, // Starting floaties
    increment: 2, // +2 floaties per level
    maxDensity: 50, // Maximum floaties
    curve: 'logarithmic'
  },
  
  // Movement speed scaling
  movementSpeed: {
    base: 1.0,
    increment: 0.05,
    maxMultiplier: 2.0,
    curve: 'linear'
  },
  
  // Score threshold scaling for level advancement
  scoreThreshold: {
    base: 1000,
    multiplier: 1.5, // Each level requires 50% more score
    curve: 'exponential'
  }
};

export class DifficultyScaler {
  constructor() {
    this.currentDifficulty = null;
    this.levelModifiers = new Map();
  }

  // Main difficulty calculation function
  calculateDifficulty(level) {
    // Use run seed for deterministic scaling variations
    const seed = runManager.isRunActive() ? runManager.getCurrentSeed() : Date.now();
    const levelSeed = this.generateLevelSeed(seed, level);
    
    const difficulty = {
      level: level,
      seed: levelSeed,
      spawnRate: this.calculateSpawnRate(level, levelSeed),
      rareFloatieChance: this.calculateRareFloatieChance(level, levelSeed),
      boardDensity: this.calculateBoardDensity(level, levelSeed),
      movementSpeed: this.calculateMovementSpeed(level, levelSeed),
      scoreThreshold: this.calculateScoreThreshold(level, levelSeed),
      // Derived values
      totalDifficultyScore: 0
    };
    
    // Calculate overall difficulty score for display
    difficulty.totalDifficultyScore = this.calculateTotalDifficulty(difficulty);
    
    this.currentDifficulty = difficulty;
    return difficulty;
  }

  // Generate deterministic seed for each level
  generateLevelSeed(runSeed, level) {
    // Combine run seed with level for deterministic but varied scaling
    return (runSeed * 31 + level * 17) % 1000000;
  }

  // Seeded random number generator for difficulty variations
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Calculate spawn rate scaling
  calculateSpawnRate(level, seed) {
    const config = DIFFICULTY_CONFIG.spawnRate;
    let multiplier;
    
    switch (config.curve) {
      case 'exponential':
        multiplier = config.base * Math.pow(1 + config.increment, level - 1);
        break;
      case 'logarithmic':
        multiplier = config.base + config.increment * Math.log(level);
        break;
      default: // linear
        multiplier = config.base + (level - 1) * config.increment;
    }
    
    // Add small random variation based on seed (±5%)
    const variation = (this.seededRandom(seed) - 0.5) * 0.1;
    multiplier *= (1 + variation);
    
    return Math.min(multiplier, config.maxMultiplier);
  }

  // Calculate rare floatie chance scaling
  calculateRareFloatieChance(level, seed) {
    const config = DIFFICULTY_CONFIG.rareFloatieChance;
    let chance;
    
    switch (config.curve) {
      case 'exponential':
        chance = config.base * Math.pow(1.2, level - 1);
        break;
      case 'logarithmic':
        chance = config.base + config.increment * Math.log(level + 1);
        break;
      default: // linear
        chance = config.base + (level - 1) * config.increment;
    }
    
    // Add seed-based variation (±10%)
    const variation = (this.seededRandom(seed + 100) - 0.5) * 0.2;
    chance *= (1 + variation);
    
    return Math.min(chance, config.maxChance);
  }

  // Calculate board density scaling
  calculateBoardDensity(level, seed) {
    const config = DIFFICULTY_CONFIG.boardDensity;
    let density;
    
    switch (config.curve) {
      case 'exponential':
        density = config.base + config.increment * Math.pow(1.1, level - 1);
        break;
      case 'logarithmic':
        density = config.base + config.increment * Math.log(level + 2) * 2;
        break;
      default: // linear
        density = config.base + (level - 1) * config.increment;
    }
    
    // Add seed-based variation (±2 floaties)
    const variation = Math.floor((this.seededRandom(seed + 200) - 0.5) * 4);
    density += variation;
    
    return Math.min(Math.max(density, config.base), config.maxDensity);
  }

  // Calculate movement speed scaling
  calculateMovementSpeed(level, seed) {
    const config = DIFFICULTY_CONFIG.movementSpeed;
    let speed;
    
    switch (config.curve) {
      case 'exponential':
        speed = config.base * Math.pow(1 + config.increment, level - 1);
        break;
      case 'logarithmic':
        speed = config.base + config.increment * Math.log(level + 1);
        break;
      default: // linear
        speed = config.base + (level - 1) * config.increment;
    }
    
    // Add seed-based variation (±3%)
    const variation = (this.seededRandom(seed + 300) - 0.5) * 0.06;
    speed *= (1 + variation);
    
    return Math.min(speed, config.maxMultiplier);
  }

  // Calculate score threshold for level advancement
  calculateScoreThreshold(level, seed) {
    const config = DIFFICULTY_CONFIG.scoreThreshold;
    let threshold;
    
    switch (config.curve) {
      case 'exponential':
        threshold = config.base * Math.pow(config.multiplier, level - 1);
        break;
      default:
        threshold = config.base * Math.pow(config.multiplier, level - 1);
    }
    
    // Round to nearest 100 for clean numbers
    return Math.round(threshold / 100) * 100;
  }

  // Calculate overall difficulty score for display
  calculateTotalDifficulty(difficulty) {
    const spawnWeight = difficulty.spawnRate * 30;
    const rareWeight = difficulty.rareFloatieChance * 100;
    const densityWeight = (difficulty.boardDensity - 27) * 2;
    const speedWeight = difficulty.movementSpeed * 20;
    
    return Math.round(spawnWeight + rareWeight + densityWeight + speedWeight);
  }

  // Get current difficulty
  getCurrentDifficulty() {
    return this.currentDifficulty;
  }

  // Apply difficulty modifiers to game state
  applyDifficultyModifiers(difficulty) {
    if (!difficulty) return;
    
    // Store difficulty modifiers in game state for other systems to use
    const state = await import('./state.js').then(m => m.state);
    
    state.difficultySpawnRate = difficulty.spawnRate;
    state.difficultyRareChance = difficulty.rareFloatieChance;
    state.difficultyBoardDensity = Math.floor(difficulty.boardDensity);
    state.difficultyMovementSpeed = difficulty.movementSpeed;
    state.difficultyScoreThreshold = difficulty.scoreThreshold;
    
    // Update existing multipliers
    state.spawnRateMultiplier = difficulty.spawnRate;
    state.speedMultiplier = difficulty.movementSpeed;
  }

  // Get difficulty description for UI
  getDifficultyDescription(difficulty) {
    if (!difficulty) return "Normal";
    
    const score = difficulty.totalDifficultyScore;
    
    if (score < 50) return "Easy";
    if (score < 100) return "Normal";
    if (score < 150) return "Hard";
    if (score < 200) return "Very Hard";
    if (score < 250) return "Extreme";
    return "Nightmare";
  }

  // Get difficulty color for UI
  getDifficultyColor(difficulty) {
    if (!difficulty) return "#ffffff";
    
    const score = difficulty.totalDifficultyScore;
    
    if (score < 50) return "#00ff88";   // Green
    if (score < 100) return "#ffaa00";  // Orange
    if (score < 150) return "#ff7aa2";  // Pink
    if (score < 200) return "#ff4d88";  // Red
    if (score < 250) return "#aa44ff";  // Purple
    return "#ff0044";                   // Dark Red
  }

  // Preview next level difficulty
  previewNextLevel(currentLevel) {
    return this.calculateDifficulty(currentLevel + 1);
  }

  // Reset difficulty system
  reset() {
    this.currentDifficulty = null;
    this.levelModifiers.clear();
  }
}

// Global difficulty scaler instance
export const difficultyScaler = new DifficultyScaler();

// Utility function for easy access
export function calculateDifficulty(level) {
  return difficultyScaler.calculateDifficulty(level);
}

// Export configuration for external access
export { DIFFICULTY_CONFIG };