import { state } from './state.js';
import { HUMAN, ANIMALS } from './constants.js';

// Card definitions with passive effects
export const CARD_TYPES = {
  // Pop Enhancement Cards
  DOUBLE_POP: {
    name: "Double Pop",
    description: "Each pop counts as two pops",
    rarity: "common",
    effect: "doublePopCount",
    value: true
  },
  TRIPLE_SCORE: {
    name: "Triple Score",
    description: "All scores are tripled",
    rarity: "rare",
    effect: "scoreMultiplier",
    value: 3
  },
  BONUS_HUNTER: {
    name: "Bonus Hunter",
    description: "All bonus events give +50% more points",
    rarity: "uncommon",
    effect: "bonusMultiplier",
    value: 1.5
  },

  // Movement & Physics Cards
  MAGNET_FIELD: {
    name: "Magnet Field",
    description: "Floaties drift toward center",
    rarity: "uncommon",
    effect: "magneticField",
    value: 0.02
  },
  SLOW_MOTION: {
    name: "Slow Motion",
    description: "All floaties move 30% slower",
    rarity: "common",
    effect: "speedReduction",
    value: 0.7
  },
  CHAOS_FIELD: {
    name: "Chaos Field",
    description: "Floaties change direction randomly",
    rarity: "rare",
    effect: "chaosField",
    value: 0.01
  },

  // Combo & Chain Cards
  CHAIN_BOOST: {
    name: "Chain Boost",
    description: "Combo thresholds lowered by 1",
    rarity: "common",
    effect: "comboThresholdReduction",
    value: 1
  },
  COMBO_MASTER: {
    name: "Combo Master",
    description: "Combo multiplier starts at 2x instead of 1x",
    rarity: "uncommon",
    effect: "baseComboMultiplier",
    value: 2
  },
  CHAIN_LIGHTNING: {
    name: "Chain Lightning",
    description: "Type chains trigger at 4 instead of 6",
    rarity: "rare",
    effect: "typeChainThreshold",
    value: 4
  },

  // Spawn & Luck Cards
  LUCKY_SPAWN: {
    name: "Lucky Spawn",
    description: "Rare floatie chance +15%",
    rarity: "uncommon",
    effect: "rareSpawnBonus",
    value: 0.15
  },
  GOLDEN_TOUCH: {
    name: "Golden Touch",
    description: "All floaties have 10% chance to be rare",
    rarity: "rare",
    effect: "goldenTouch",
    value: 0.1
  },
  SPAWN_CONTROL: {
    name: "Spawn Control",
    description: "Floaties spawn 25% less frequently",
    rarity: "common",
    effect: "spawnRateReduction",
    value: 0.75
  },

  // Special Effect Cards
  TIME_WARP: {
    name: "Time Warp",
    description: "Level timer moves 50% slower",
    rarity: "rare",
    effect: "timeMultiplier",
    value: 0.5
  },
  SHIELD_GENERATOR: {
    name: "Shield Generator",
    description: "First 3 missed clicks don't end survival runs",
    rarity: "epic",
    effect: "survivalShield",
    value: 3
  },
  CARD_MAGNET: {
    name: "Card Magnet",
    description: "50% chance to get extra card on level up",
    rarity: "uncommon",
    effect: "extraCardChance",
    value: 0.5
  }
};

// Card rarity weights for random selection
const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 12,
  epic: 3
};

export class CardInventory {
  constructor() {
    this.activeModifiers = new Map();
  }

  // Add card to inventory and activate its effect
  addCard(cardType) {
    const card = CARD_TYPES[cardType];
    if (!card) return false;

    // Add to active modifiers
    if (this.activeModifiers.has(card.effect)) {
      // Stack certain effects
      if (this.isStackableEffect(card.effect)) {
        const current = this.activeModifiers.get(card.effect);
        this.activeModifiers.set(card.effect, this.stackEffect(card.effect, current, card.value));
      }
    } else {
      this.activeModifiers.set(card.effect, card.value);
    }

    return true;
  }

  // Check if effect can stack
  isStackableEffect(effect) {
    const stackableEffects = [
      'scoreMultiplier', 'bonusMultiplier', 'speedReduction', 
      'comboThresholdReduction', 'rareSpawnBonus', 'magneticField'
    ];
    return stackableEffects.includes(effect);
  }

  // Stack effects appropriately
  stackEffect(effect, current, newValue) {
    switch (effect) {
      case 'scoreMultiplier':
      case 'bonusMultiplier':
        return current * newValue; // Multiplicative
      case 'speedReduction':
        return current * newValue; // Multiplicative (slower)
      case 'comboThresholdReduction':
      case 'rareSpawnBonus':
      case 'magneticField':
        return current + newValue; // Additive
      default:
        return newValue; // Replace
    }
  }

  // Get modifier value
  getModifier(effect) {
    return this.activeModifiers.get(effect) || this.getDefaultValue(effect);
  }

  // Get default values for effects
  getDefaultValue(effect) {
    const defaults = {
      doublePopCount: false,
      scoreMultiplier: 1,
      bonusMultiplier: 1,
      magneticField: 0,
      speedReduction: 1,
      chaosField: 0,
      comboThresholdReduction: 0,
      baseComboMultiplier: 1,
      typeChainThreshold: 6,
      rareSpawnBonus: 0,
      goldenTouch: 0,
      spawnRateReduction: 1,
      timeMultiplier: 1,
      survivalShield: 0,
      extraCardChance: 0
    };
    return defaults[effect] || 0;
  }

  // Check if modifier is active
  hasModifier(effect) {
    return this.activeModifiers.has(effect);
  }

  // Clear all modifiers (for run end)
  clearModifiers() {
    this.activeModifiers.clear();
  }

  // Get all active cards for display
  getActiveCards() {
    const activeCards = [];
    for (const [effect, value] of this.activeModifiers) {
      const cardType = Object.keys(CARD_TYPES).find(key => 
        CARD_TYPES[key].effect === effect
      );
      if (cardType) {
        activeCards.push({
          ...CARD_TYPES[cardType],
          currentValue: value
        });
      }
    }
    return activeCards;
  }
}

// Global card inventory instance
export const cardInventory = new CardInventory();

// Utility functions for card selection
export function getRandomCardType(rng) {
  // Calculate total weight
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  const randomValue = rng() * totalWeight;
  
  let currentWeight = 0;
  let selectedRarity = 'common';
  
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    currentWeight += weight;
    if (randomValue <= currentWeight) {
      selectedRarity = rarity;
      break;
    }
  }
  
  // Get cards of selected rarity
  const cardsOfRarity = Object.keys(CARD_TYPES).filter(key => 
    CARD_TYPES[key].rarity === selectedRarity
  );
  
  if (cardsOfRarity.length === 0) return 'DOUBLE_POP'; // Fallback
  
  const randomIndex = Math.floor(rng() * cardsOfRarity.length);
  return cardsOfRarity[randomIndex];
}

// Apply card modifiers to game mechanics
export function applyCardModifiers() {
  // Apply movement modifiers to existing floaties
  state.floats.forEach(floatie => {
    applyMovementModifiers(floatie);
  });
}

export function applyMovementModifiers(floatie) {
  const magnetStrength = cardInventory.getModifier('magneticField');
  const chaosStrength = cardInventory.getModifier('chaosField');
  
  // Magnetic field effect
  if (magnetStrength > 0) {
    const playArea = document.getElementById('playArea');
    if (playArea) {
      const centerX = playArea.clientWidth / 2;
      const centerY = playArea.clientHeight / 2;
      
      const deltaX = centerX - floatie.x;
      const deltaY = centerY - floatie.y;
      
      floatie.vx += deltaX * magnetStrength;
      floatie.vy += deltaY * magnetStrength;
    }
  }
  
  // Chaos field effect
  if (chaosStrength > 0 && Math.random() < chaosStrength) {
    floatie.vx += (Math.random() - 0.5) * 2;
    floatie.vy += (Math.random() - 0.5) * 2;
  }
}

// Check if floatie should be rare based on cards
export function shouldBeRareFloatie(baseType, rng) {
  const rareBonus = cardInventory.getModifier('rareSpawnBonus');
  const goldenTouch = cardInventory.getModifier('goldenTouch');
  
  // Add difficulty-based rare chance
  const difficultyRareChance = state.difficultyRareChance || 0.05;
  
  // Base rare chance
  const isBaseRare = HUMAN.includes(baseType) || ANIMALS.includes(baseType);
  
  // Golden touch effect
  if (goldenTouch > 0 && rng() < goldenTouch) {
    return true;
  }
  
  // Difficulty + lucky spawn bonus
  const totalRareChance = difficultyRareChance + rareBonus;
  if (!isBaseRare && rng() < totalRareChance) {
    return true;
  }
  
  return isBaseRare;
}

// Get modified combo thresholds
export function getModifiedComboThresholds() {
  const reduction = cardInventory.getModifier('comboThresholdReduction');
  const typeChainThreshold = cardInventory.getModifier('typeChainThreshold');
  
  return {
    itemChainThreshold: Math.max(1, 3 - reduction),
    typeChainThreshold: Math.max(2, typeChainThreshold - reduction)
  };
}

// Get modified score with card multipliers
export function getModifiedScore(baseScore, isBonus = false) {
  let modifiedScore = baseScore;
  
  // Apply score multiplier
  modifiedScore *= cardInventory.getModifier('scoreMultiplier');
  
  // Apply bonus multiplier if it's a bonus event
  if (isBonus) {
    modifiedScore *= cardInventory.getModifier('bonusMultiplier');
  }
  
  return Math.floor(modifiedScore);
}

// Get modified pop count
export function getModifiedPopCount() {
  return cardInventory.getModifier('doublePopCount') ? 2 : 1;
}