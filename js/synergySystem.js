import { cardInventory } from './cardSystem.js';
import { state } from './state.js';

// Synergy definitions registry
const SYNERGY_REGISTRY = {
  // Movement & Physics Synergies
  MAGNETIC_CHAOS: {
    id: 'MAGNETIC_CHAOS',
    name: 'Magnetic Chaos',
    description: 'Magnet Field + Chaos Field → Chaos pulls floaties toward center',
    requiredCards: ['MAGNET_FIELD', 'CHAOS_FIELD'],
    effects: {
      magneticChaos: true,
      chaosFieldStrength: 2.0 // Double chaos effect
    },
    icon: '🧲⚡'
  },

  SLOW_PRECISION: {
    id: 'SLOW_PRECISION',
    name: 'Slow Precision',
    description: 'Slow Motion + Chain Boost → Combo thresholds reduced by 2 instead of 1',
    requiredCards: ['SLOW_MOTION', 'CHAIN_BOOST'],
    effects: {
      comboThresholdReduction: 1, // Additional reduction (stacks with base)
      precisionBonus: true
    },
    icon: '🐌🎯'
  },

  // Scoring Synergies
  GOLDEN_MULTIPLIER: {
    id: 'GOLDEN_MULTIPLIER',
    name: 'Golden Multiplier',
    description: 'Golden Touch + Triple Score → Rare floaties give 5x score instead of 3x',
    requiredCards: ['GOLDEN_TOUCH', 'TRIPLE_SCORE'],
    effects: {
      rareScoreMultiplier: 5,
      goldenMultiplier: true
    },
    icon: '✨💰'
  },

  BONUS_HUNTER_SUPREME: {
    id: 'BONUS_HUNTER_SUPREME',
    name: 'Bonus Hunter Supreme',
    description: 'Bonus Hunter + Lucky Spawn → All bonus events trigger rare floatie spawns',
    requiredCards: ['BONUS_HUNTER', 'LUCKY_SPAWN'],
    effects: {
      bonusSpawnsRare: true,
      bonusMultiplier: 0.5 // Additional 50% bonus multiplier
    },
    icon: '🎯🍀'
  },

  // Combo & Chain Synergies
  CHAIN_LIGHTNING_MASTER: {
    id: 'CHAIN_LIGHTNING_MASTER',
    name: 'Chain Lightning Master',
    description: 'Chain Lightning + Combo Master → Type chains trigger at 2 instead of 4',
    requiredCards: ['CHAIN_LIGHTNING', 'COMBO_MASTER'],
    effects: {
      typeChainThreshold: 2,
      lightningMaster: true
    },
    icon: '⚡🔗'
  },

  DOUBLE_CHAIN_POWER: {
    id: 'DOUBLE_CHAIN_POWER',
    name: 'Double Chain Power',
    description: 'Double Pop + Chain Boost → Each pop counts as 3 pops for combos',
    requiredCards: ['DOUBLE_POP', 'CHAIN_BOOST'],
    effects: {
      triplePopCount: true,
      chainPowerBonus: true
    },
    icon: '2️⃣⚡'
  },

  // Spawn & Luck Synergies
  SPAWN_CONTROL_MASTER: {
    id: 'SPAWN_CONTROL_MASTER',
    name: 'Spawn Control Master',
    description: 'Spawn Control + Card Magnet → Reduced spawns but guaranteed card drops',
    requiredCards: ['SPAWN_CONTROL', 'CARD_MAGNET'],
    effects: {
      guaranteedCardDrops: true,
      spawnRateReduction: 0.5 // Additional 50% reduction
    },
    icon: '🎮🧲'
  },

  RAINBOW_LUCK: {
    id: 'RAINBOW_LUCK',
    name: 'Rainbow Luck',
    description: 'Lucky Spawn + Golden Touch → 25% chance for rainbow floaties (worth 10x)',
    requiredCards: ['LUCKY_SPAWN', 'GOLDEN_TOUCH'],
    effects: {
      rainbowSpawnChance: 0.25,
      rainbowScoreMultiplier: 10
    },
    icon: '🌈🍀'
  },

  // Special Effect Synergies
  TIME_SHIELD: {
    id: 'TIME_SHIELD',
    name: 'Time Shield',
    description: 'Time Warp + Shield Generator → Time moves 75% slower and +2 shields',
    requiredCards: ['TIME_WARP', 'SHIELD_GENERATOR'],
    effects: {
      timeMultiplier: 0.25, // Additional 25% time reduction
      survivalShield: 2 // Additional shields
    },
    icon: '⏰🛡️'
  },

  MAGNETIC_COLLECTOR: {
    id: 'MAGNETIC_COLLECTOR',
    name: 'Magnetic Collector',
    description: 'Magnet Field + Card Magnet → Floaties pulled toward center drop more cards',
    requiredCards: ['MAGNET_FIELD', 'CARD_MAGNET'],
    effects: {
      magneticCardBonus: true,
      extraCardChance: 0.3 // Additional 30% card chance
    },
    icon: '🧲🎴'
  }
};

export class SynergySystem {
  constructor() {
    this.activeSynergies = new Map();
    this.synergyEffects = new Map();
    this.lastCardCheck = '';
    this.updateCounter = 0;
  }

  // Check for synergies among active cards
  checkSynergies() {
    const activeCards = cardInventory.getActiveCards();
    const cardTypes = activeCards.map(card => {
      // Find card type from card name
      return Object.keys(CARD_TYPES).find(type => 
        CARD_TYPES[type].name === card.name
      );
    }).filter(Boolean);

    // Create a hash of active cards for efficient comparison
    const cardHash = cardTypes.sort().join(',');
    
    // Only recalculate if cards have changed
    if (cardHash === this.lastCardCheck) {
      return this.activeSynergies;
    }
    
    this.lastCardCheck = cardHash;
    this.activeSynergies.clear();
    this.synergyEffects.clear();

    // Check each synergy
    Object.values(SYNERGY_REGISTRY).forEach(synergy => {
      if (this.hasSynergyCards(cardTypes, synergy.requiredCards)) {
        this.activeSynergies.set(synergy.id, synergy);
        
        // Apply synergy effects
        Object.entries(synergy.effects).forEach(([effect, value]) => {
          if (this.synergyEffects.has(effect)) {
            // Stack effects appropriately
            const current = this.synergyEffects.get(effect);
            this.synergyEffects.set(effect, this.stackSynergyEffect(effect, current, value));
          } else {
            this.synergyEffects.set(effect, value);
          }
        });
      }
    });

    return this.activeSynergies;
  }

  // Check if player has required cards for synergy
  hasSynergyCards(playerCards, requiredCards) {
    return requiredCards.every(required => playerCards.includes(required));
  }

  // Stack synergy effects appropriately
  stackSynergyEffect(effect, current, newValue) {
    const additiveEffects = [
      'comboThresholdReduction', 'bonusMultiplier', 'extraCardChance',
      'survivalShield', 'spawnRateReduction'
    ];
    
    const multiplicativeEffects = [
      'chaosFieldStrength', 'rareScoreMultiplier', 'rainbowScoreMultiplier'
    ];

    if (additiveEffects.includes(effect)) {
      return current + newValue;
    } else if (multiplicativeEffects.includes(effect)) {
      return current * newValue;
    } else {
      // Boolean or replacement effects
      return newValue;
    }
  }

  // Get synergy effect value
  getSynergyEffect(effect) {
    return this.synergyEffects.get(effect) || this.getDefaultSynergyValue(effect);
  }

  // Get default values for synergy effects
  getDefaultSynergyValue(effect) {
    const defaults = {
      magneticChaos: false,
      chaosFieldStrength: 1,
      comboThresholdReduction: 0,
      precisionBonus: false,
      rareScoreMultiplier: 1,
      goldenMultiplier: false,
      bonusSpawnsRare: false,
      bonusMultiplier: 0,
      typeChainThreshold: 6,
      lightningMaster: false,
      triplePopCount: false,
      chainPowerBonus: false,
      guaranteedCardDrops: false,
      spawnRateReduction: 0,
      rainbowSpawnChance: 0,
      rainbowScoreMultiplier: 1,
      timeMultiplier: 0,
      survivalShield: 0,
      magneticCardBonus: false,
      extraCardChance: 0
    };
    return defaults[effect] || 0;
  }

  // Check if synergy is active
  hasSynergy(synergyId) {
    return this.activeSynergies.has(synergyId);
  }

  // Get all active synergies
  getActiveSynergies() {
    return Array.from(this.activeSynergies.values());
  }

  // Apply synergy effects to game mechanics (called during game update)
  applySynergyEffects() {
    // Only update every few frames for performance
    this.updateCounter++;
    if (this.updateCounter % 3 !== 0) return;

    // Apply movement synergies
    this.applyMovementSynergies();
    
    // Apply spawn synergies
    this.applySpawnSynergies();
  }

  // Apply movement-related synergies
  applyMovementSynergies() {
    if (!this.hasSynergy('MAGNETIC_CHAOS')) return;

    state.floats.forEach(floatie => {
      if (Math.random() < 0.1) { // 10% chance per frame
        const playArea = document.getElementById('playArea');
        if (playArea) {
          const centerX = playArea.clientWidth / 2;
          const centerY = playArea.clientHeight / 2;
          
          const deltaX = centerX - floatie.x;
          const deltaY = centerY - floatie.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          if (distance > 50) { // Only apply if not too close to center
            const strength = this.getSynergyEffect('chaosFieldStrength') * 0.02;
            floatie.vx += (deltaX / distance) * strength;
            floatie.vy += (deltaY / distance) * strength;
          }
        }
      }
    });
  }

  // Apply spawn-related synergies
  applySpawnSynergies() {
    // Rainbow spawn synergy
    if (this.hasSynergy('RAINBOW_LUCK')) {
      state.floats.forEach(floatie => {
        if (!floatie.isRainbow && Math.random() < this.getSynergyEffect('rainbowSpawnChance') / 1000) {
          this.convertToRainbow(floatie);
        }
      });
    }
  }

  // Convert floatie to rainbow floatie
  convertToRainbow(floatie) {
    floatie.isRainbow = true;
    floatie.el.classList.add('rainbow');
    floatie.el.style.background = 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)';
    floatie.el.style.backgroundSize = '200% 200%';
    floatie.el.style.animation = 'rainbow-pulse 2s ease-in-out infinite';
  }

  // Get modified combo thresholds with synergies
  getModifiedComboThresholds() {
    const baseThresholds = cardInventory.getModifier('comboThresholdReduction');
    const synergyReduction = this.getSynergyEffect('comboThresholdReduction');
    const totalReduction = baseThresholds + synergyReduction;
    
    let typeChainThreshold = this.getSynergyEffect('typeChainThreshold');
    if (typeChainThreshold === 6) { // Default value, apply normal reduction
      typeChainThreshold = Math.max(2, 6 - totalReduction);
    }
    
    return {
      itemChainThreshold: Math.max(1, 3 - totalReduction),
      typeChainThreshold: typeChainThreshold
    };
  }

  // Get modified pop count with synergies
  getModifiedPopCount() {
    if (this.getSynergyEffect('triplePopCount')) {
      return 3;
    }
    return cardInventory.getModifier('doublePopCount') ? 2 : 1;
  }

  // Get modified score with synergies
  getModifiedScore(baseScore, isBonus = false, isRare = false, isRainbow = false) {
    let modifiedScore = baseScore;
    
    // Apply base card multipliers
    modifiedScore *= cardInventory.getModifier('scoreMultiplier');
    
    // Apply synergy multipliers
    if (isRainbow) {
      modifiedScore *= this.getSynergyEffect('rainbowScoreMultiplier');
    } else if (isRare && this.getSynergyEffect('goldenMultiplier')) {
      modifiedScore *= this.getSynergyEffect('rareScoreMultiplier');
    }
    
    // Apply bonus multipliers
    if (isBonus) {
      const baseBonus = cardInventory.getModifier('bonusMultiplier');
      const synergyBonus = this.getSynergyEffect('bonusMultiplier');
      modifiedScore *= (baseBonus + synergyBonus);
    }
    
    return Math.floor(modifiedScore);
  }

  // Show synergy notification
  showSynergyNotification(synergy) {
    const notification = document.createElement('div');
    notification.className = 'synergy-notification';
    notification.innerHTML = `
      <div class="synergy-icon">${synergy.icon}</div>
      <div class="synergy-text">
        <div class="synergy-name">${synergy.name}</div>
        <div class="synergy-desc">${synergy.description}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  // Get synergy registry for external access
  getSynergyRegistry() {
    return SYNERGY_REGISTRY;
  }

  // Reset synergy system
  reset() {
    this.activeSynergies.clear();
    this.synergyEffects.clear();
    this.lastCardCheck = '';
    this.updateCounter = 0;
  }
}

// Global synergy system instance
export const synergySystem = new SynergySystem();

// Import CARD_TYPES for synergy checking
import { CARD_TYPES } from './cardSystem.js';