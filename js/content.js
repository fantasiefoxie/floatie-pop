// Floatie type definitions with visual and gameplay properties
export const FLOATIE_TYPES = {
  jelly: {
    color: "#6ec6ff",
    radius: 28,
    rarity: "common",
    weight: 40,
    drift: 0.12
  },
  coral: {
    color: "#ff8a65",
    radius: 30,
    rarity: "common",
    weight: 35,
    clusterBias: 0.2
  },
  pearl: {
    color: "#f5f5f5",
    radius: 26,
    rarity: "rare",
    weight: 20,
    scoreBonus: 20
  },
  star: {
    color: "#ffd54f",
    radius: 30,
    rarity: "rare",
    weight: 15,
    chainBoost: 1
  },
  anemone: {
    color: "#ce93d8",
    radius: 29,
    rarity: "rare",
    weight: 10,
    comboBoost: 0.5
  }
};

// Card type definitions with rarity and descriptions
export const CARD_TYPES = {
  shuffleRow: {
    rarity: "common",
    description: "Shuffle a row of floaties",
    weight: 40
  },
  spawnFamily: {
    rarity: "common",
    description: "Spawn 5 floaties of one family",
    weight: 35
  },
  clearCluster: {
    rarity: "rare",
    description: "Clear floaties in a radius",
    weight: 20
  },
  magnetizeFamily: {
    rarity: "rare",
    description: "Pull same-family floaties together",
    weight: 15
  },
  doubleNextCombo: {
    rarity: "legendary",
    description: "Next combo multiplier doubled",
    weight: 5
  }
};

// Rarity distribution weights for card generation
export const RARITY_WEIGHTS = {
  common: 70,
  rare: 25,
  legendary: 5
};

// Gameplay constants
export const GAMEPLAY_CONSTANTS = {
  // Board dimensions
  boardWidth: 400,
  boardHeight: 600,
  boardPadding: 20,

  // Floatie physics
  maxFloaties: 50,
  spawnRate: 0.8,
  separationForce: 0.15,
  driftDecay: 0.95,
  boundaryDamping: 0.8,

  // Combo system
  comboThresholds: [
    { pops: 0, multiplier: 1 },
    { pops: 3, multiplier: 2 },
    { pops: 5, multiplier: 3 },
    { pops: 7, multiplier: 4 }
  ],

  // Card system
  popsPerCard: 5,
  maxCardsInHand: 3,

  // Scoring
  baseScore: 10,
  chainBonus: 5,
  comboMilestone: 100,

  // Difficulty scaling
  difficultyFormula: (level) => 1 + (level * 0.15),

  // Board pressure
  pressureInterval: 20000, // ms
  pressureSpawnMultiplier: (level) => 1 + (level * 0.1),
  pressureDensityLimit: (level) => 50 - (level * 2),

  // Run progression
  popsPerLevel: 25,

  // Mobile
  touchTargetSize: 48,
  swipeThreshold: 50
};
