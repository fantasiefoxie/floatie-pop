import { ALL, FOOD, FLOWERS, HUMAN, ANIMALS } from './constants.js';
import { state } from './state.js';
import { cat, rv } from './utils.js';
import { difficultyScaler } from './difficultyScaler.js';
import { cardInventory, shouldBeRareFloatie } from './cardSystem.js';

// Board generation configuration
const BOARD_CONFIG = {
  // Cluster generation settings
  clusters: {
    minClusters: 2,
    maxClusters: 6,
    minClusterSize: 3,
    maxClusterSize: 8,
    clusterRadius: 80,
    clusterSpread: 0.7 // How tightly packed clusters are
  },
  
  // Family distribution weights
  familyWeights: {
    food: 0.3,
    flower: 0.25,
    human: 0.25,
    animal: 0.2
  },
  
  // Positioning constraints
  positioning: {
    edgeBuffer: 50, // Minimum distance from edges
    minDistance: 35, // Minimum distance between floaties
    maxAttempts: 100 // Maximum placement attempts per floatie
  },
  
  // Level-based modifiers
  levelModifiers: {
    clusterComplexity: 0.1, // Increases cluster count per level
    familyMixing: 0.05, // Increases mixed families per level
    rareFloatieBonus: 0.02 // Increases rare floatie chance per level
  }
};

export class BoardGenerator {
  constructor() {
    this.rngState = 0;
    this.currentSeed = 0;
    this.currentLevel = 0;
    this.generatedBoard = null;
  }

  // Seeded random number generator
  seededRandom(seed) {
    this.rngState = (this.rngState * 9301 + 49297) % 233280;
    return this.rngState / 233280;
  }

  // Initialize RNG with combined seed
  initRNG(seed, level) {
    this.currentSeed = seed;
    this.currentLevel = level;
    // Combine seed and level for deterministic but varied generation
    this.rngState = (seed * 31 + level * 17) % 233280;
  }

  // Main board generation function
  generateBoard(seed, level, playArea) {
    this.initRNG(seed, level);
    
    const difficulty = difficultyScaler.getCurrentDifficulty();
    const boardDensity = difficulty ? difficulty.boardDensity : 27;
    
    const board = {
      seed: seed,
      level: level,
      density: boardDensity,
      floaties: [],
      clusters: [],
      familyDistribution: this.calculateFamilyDistribution(level),
      areaWidth: playArea.clientWidth,
      areaHeight: playArea.clientHeight
    };

    // Generate clusters first
    board.clusters = this.generateClusters(board);
    
    // Place floaties in clusters
    this.placeClusterFloaties(board);
    
    // Fill remaining spots with scattered floaties
    this.placeScatteredFloaties(board);
    
    // Apply level-specific modifications
    this.applyLevelModifications(board);
    
    this.generatedBoard = board;
    return board;
  }

  // Calculate family distribution based on level
  calculateFamilyDistribution(level) {
    const base = { ...BOARD_CONFIG.familyWeights };
    const levelMod = BOARD_CONFIG.levelModifiers.familyMixing * level;
    
    // Gradually increase rare families (human/animal) at higher levels
    base.human += levelMod * 0.5;
    base.animal += levelMod * 0.5;
    base.food -= levelMod * 0.3;
    base.flower -= levelMod * 0.2;
    
    // Normalize to ensure sum = 1
    const total = Object.values(base).reduce((sum, val) => sum + val, 0);
    Object.keys(base).forEach(key => base[key] /= total);
    
    return base;
  }

  // Generate cluster positions and properties
  generateClusters(board) {
    const config = BOARD_CONFIG.clusters;
    const levelComplexity = BOARD_CONFIG.levelModifiers.clusterComplexity * board.level;
    
    const clusterCount = Math.floor(
      config.minClusters + 
      (config.maxClusters - config.minClusters) * this.seededRandom() +
      levelComplexity
    );

    const clusters = [];
    const families = ['food', 'flower', 'human', 'animal'];
    
    for (let i = 0; i < clusterCount; i++) {
      const cluster = {
        id: i,
        centerX: config.edgeBuffer + this.seededRandom() * (board.areaWidth - 2 * config.edgeBuffer),
        centerY: config.edgeBuffer + this.seededRandom() * (board.areaHeight - 2 * config.edgeBuffer),
        radius: config.clusterRadius * (0.7 + this.seededRandom() * 0.6),
        family: families[Math.floor(this.seededRandom() * families.length)],
        size: Math.floor(
          config.minClusterSize + 
          this.seededRandom() * (config.maxClusterSize - config.minClusterSize)
        ),
        spread: config.clusterSpread * (0.8 + this.seededRandom() * 0.4),
        floaties: []
      };
      
      clusters.push(cluster);
    }
    
    return clusters;
  }

  // Place floaties within clusters
  placeClusterFloaties(board) {
    const familyFloaties = {
      food: FOOD,
      flower: FLOWERS,
      human: HUMAN,
      animal: ANIMALS
    };

    board.clusters.forEach(cluster => {
      const availableTypes = familyFloaties[cluster.family];
      
      for (let i = 0; i < cluster.size; i++) {
        const angle = (i / cluster.size) * Math.PI * 2 + this.seededRandom() * 0.5;
        const distance = this.seededRandom() * cluster.radius * cluster.spread;
        
        const x = cluster.centerX + Math.cos(angle) * distance;
        const y = cluster.centerY + Math.sin(angle) * distance;
        
        // Ensure within bounds
        const clampedX = Math.max(40, Math.min(x, board.areaWidth - 40));
        const clampedY = Math.max(40, Math.min(y, board.areaHeight - 40));
        
        const floatieType = availableTypes[Math.floor(this.seededRandom() * availableTypes.length)];
        const isRare = this.shouldBeRareFloatie(floatieType);
        
        const floatie = {
          type: floatieType,
          x: clampedX,
          y: clampedY,
          vx: rv(false) * (state.speedMultiplier || 1) * (state.difficultyMovementSpeed || 1),
          vy: rv(false) * (state.speedMultiplier || 1) * (state.difficultyMovementSpeed || 1),
          isRare: isRare,
          clusterId: cluster.id,
          family: cluster.family,
          isClusterMember: true
        };
        
        cluster.floaties.push(floatie);
        board.floaties.push(floatie);
      }
    });
  }

  // Place scattered floaties to fill remaining density
  placeScatteredFloaties(board) {
    const remainingCount = board.density - board.floaties.length;
    const config = BOARD_CONFIG.positioning;
    
    for (let i = 0; i < remainingCount; i++) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < config.maxAttempts) {
        const x = config.edgeBuffer + this.seededRandom() * (board.areaWidth - 2 * config.edgeBuffer);
        const y = config.edgeBuffer + this.seededRandom() * (board.areaHeight - 2 * config.edgeBuffer);
        
        // Check minimum distance from existing floaties
        const tooClose = board.floaties.some(existing => {
          const dx = x - existing.x;
          const dy = y - existing.y;
          return Math.sqrt(dx * dx + dy * dy) < config.minDistance;
        });
        
        if (!tooClose) {
          const floatieType = this.selectRandomFloatieType(board.familyDistribution);
          const isRare = this.shouldBeRareFloatie(floatieType);
          
          const floatie = {
            type: floatieType,
            x: x,
            y: y,
            vx: rv(false) * (state.speedMultiplier || 1) * (state.difficultyMovementSpeed || 1),
            vy: rv(false) * (state.speedMultiplier || 1) * (state.difficultyMovementSpeed || 1),
            isRare: isRare,
            clusterId: -1,
            family: cat(floatieType),
            isClusterMember: false
          };
          
          board.floaties.push(floatie);
          placed = true;
        }
        
        attempts++;
      }
    }
  }

  // Select random floatie type based on family distribution
  selectRandomFloatieType(distribution) {
    const random = this.seededRandom();
    let cumulative = 0;
    
    for (const [family, weight] of Object.entries(distribution)) {
      cumulative += weight;
      if (random <= cumulative) {
        const familyFloaties = {
          food: FOOD,
          flower: FLOWERS,
          human: HUMAN,
          animal: ANIMALS
        };
        
        const types = familyFloaties[family];
        return types[Math.floor(this.seededRandom() * types.length)];
      }
    }
    
    // Fallback
    return ALL[Math.floor(this.seededRandom() * ALL.length)];
  }

  // Check if floatie should be rare (considering cards and difficulty)
  shouldBeRareFloatie(floatieType) {
    const baseRare = HUMAN.includes(floatieType) || ANIMALS.includes(floatieType);
    const levelBonus = BOARD_CONFIG.levelModifiers.rareFloatieBonus * this.currentLevel;
    const difficultyBonus = (state.difficultyRareChance || 0.05) - 0.05;
    const cardBonus = cardInventory.getModifier('rareSpawnBonus');
    const goldenTouch = cardInventory.getModifier('goldenTouch');
    
    if (baseRare) return true;
    
    // Golden touch effect
    if (goldenTouch > 0 && this.seededRandom() < goldenTouch) {
      return true;
    }
    
    // Combined bonuses
    const totalRareChance = levelBonus + difficultyBonus + cardBonus;
    return this.seededRandom() < totalRareChance;
  }

  // Apply level-specific modifications
  applyLevelModifications(board) {
    // Higher levels might have more mixed clusters
    if (this.currentLevel > 5) {
      this.addMixedClusters(board);
    }
    
    // Add special formations at certain levels
    if (this.currentLevel % 5 === 0) {
      this.addSpecialFormations(board);
    }
  }

  // Add mixed family clusters at higher levels
  addMixedClusters(board) {
    const mixChance = Math.min(0.3, (this.currentLevel - 5) * 0.05);
    
    board.clusters.forEach(cluster => {
      if (this.seededRandom() < mixChance) {
        // Replace some floaties with different family types
        const mixCount = Math.floor(cluster.size * 0.3);
        const otherFamilies = ['food', 'flower', 'human', 'animal'].filter(f => f !== cluster.family);
        
        for (let i = 0; i < mixCount && i < cluster.floaties.length; i++) {
          const floatie = cluster.floaties[i];
          const newFamily = otherFamilies[Math.floor(this.seededRandom() * otherFamilies.length)];
          
          const familyFloaties = {
            food: FOOD,
            flower: FLOWERS,
            human: HUMAN,
            animal: ANIMALS
          };
          
          const newTypes = familyFloaties[newFamily];
          floatie.type = newTypes[Math.floor(this.seededRandom() * newTypes.length)];
          floatie.family = newFamily;
        }
      }
    });
  }

  // Add special formations (lines, circles, etc.)
  addSpecialFormations(board) {
    // Add a special formation every 5 levels
    const formationType = Math.floor(this.seededRandom() * 2);
    
    if (formationType === 0) {
      this.addLineFormation(board);
    } else {
      this.addCircleFormation(board);
    }
  }

  // Add line formation
  addLineFormation(board) {
    const startX = 100 + this.seededRandom() * (board.areaWidth - 200);
    const startY = 100 + this.seededRandom() * (board.areaHeight - 200);
    const angle = this.seededRandom() * Math.PI * 2;
    const length = 150;
    const floatieCount = 5;
    
    const sameType = ALL[Math.floor(this.seededRandom() * ALL.length)];
    
    for (let i = 0; i < floatieCount; i++) {
      const progress = i / (floatieCount - 1);
      const x = startX + Math.cos(angle) * length * progress;
      const y = startY + Math.sin(angle) * length * progress;
      
      if (x > 40 && x < board.areaWidth - 40 && y > 40 && y < board.areaHeight - 40) {
        const floatie = {
          type: sameType,
          x: x,
          y: y,
          vx: rv(false) * (state.speedMultiplier || 1),
          vy: rv(false) * (state.speedMultiplier || 1),
          isRare: this.shouldBeRareFloatie(sameType),
          clusterId: -2,
          family: cat(sameType),
          isClusterMember: false,
          isSpecialFormation: true
        };
        
        board.floaties.push(floatie);
      }
    }
  }

  // Add circle formation
  addCircleFormation(board) {
    const centerX = 150 + this.seededRandom() * (board.areaWidth - 300);
    const centerY = 150 + this.seededRandom() * (board.areaHeight - 300);
    const radius = 60;
    const floatieCount = 6;
    
    const sameType = ALL[Math.floor(this.seededRandom() * ALL.length)];
    
    for (let i = 0; i < floatieCount; i++) {
      const angle = (i / floatieCount) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (x > 40 && x < board.areaWidth - 40 && y > 40 && y < board.areaHeight - 40) {
        const floatie = {
          type: sameType,
          x: x,
          y: y,
          vx: rv(false) * (state.speedMultiplier || 1),
          vy: rv(false) * (state.speedMultiplier || 1),
          isRare: this.shouldBeRareFloatie(sameType),
          clusterId: -3,
          family: cat(sameType),
          isClusterMember: false,
          isSpecialFormation: true
        };
        
        board.floaties.push(floatie);
      }
    }
  }

  // Get current generated board
  getCurrentBoard() {
    return this.generatedBoard;
  }

  // Get board statistics for debugging
  getBoardStats(board) {
    if (!board) return null;
    
    const familyCount = {};
    const rareCount = board.floaties.filter(f => f.isRare).length;
    const clusterCount = board.clusters.length;
    
    board.floaties.forEach(floatie => {
      familyCount[floatie.family] = (familyCount[floatie.family] || 0) + 1;
    });
    
    return {
      totalFloaties: board.floaties.length,
      familyDistribution: familyCount,
      rareFloaties: rareCount,
      clusters: clusterCount,
      seed: board.seed,
      level: board.level
    };
  }
}

// Global board generator instance
export const boardGenerator = new BoardGenerator();

// Main function for external use
export function generateBoard(seed, level, playArea) {
  return boardGenerator.generateBoard(seed, level, playArea);
}