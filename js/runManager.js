import { state, resetSession } from './state.js';
import { CARD_POOL } from './constants.js';
import { cardInventory, getRandomCardType, CARD_TYPES } from './cardSystem.js';
import { difficultyScaler, calculateDifficulty } from './difficultyScaler.js';
import { shopSystem } from './shopSystem.js';
import { synergySystem } from './synergySystem.js';
import { bossSystem } from './bossSystem.js';
import { playerProgression } from './playerProgression.js';

export class RunManager {
  constructor() {
    this.runState = {
      runSeed: 0,
      level: 1,
      difficulty: 1,
      cardsOwned: [],
      comboRecord: 0,
      runScore: 0,
      isActive: false,
      levelStartTime: 0,
      levelTargetScore: 1000
    };
    this.rng = null;
  }

  // Seeded random number generator
  seedRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Initialize RNG with current seed
  initRNG() {
    this.rngState = this.runState.runSeed;
  }

  // Get next random number using seed
  random() {
    this.rngState = (this.rngState * 9301 + 49297) % 233280;
    return this.rngState / 233280;
  }

  // Generate deterministic run seed
  generateRunSeed() {
    return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
  }

  startRun() {
    // Generate new run seed
    this.runState.runSeed = this.generateRunSeed();
    this.initRNG();
    
    // Reset run state
    this.runState.level = 1;
    this.runState.difficulty = 1;
    this.runState.cardsOwned = [];
    this.runState.comboRecord = 0;
    this.runState.runScore = 0;
    this.runState.isActive = true;
    this.runState.levelStartTime = Date.now();
    this.runState.levelTargetScore = 1000;

    // Clear and reset card inventory
    cardInventory.clearModifiers();
    
    // Reset and initialize difficulty system
    difficultyScaler.reset();
    const initialDifficulty = calculateDifficulty(1);
    difficultyScaler.applyDifficultyModifiers(initialDifficulty);
    
    // Reset game session but preserve run data
    resetSession();
    
    // Award starting cards
    this.awardStartingCards();
    
    console.log(`🎮 Run Started! Seed: ${this.runState.runSeed}, Level: ${this.runState.level}`);
    this.showRunStartNotification();
    
    return this.runState;
  }

  updateRun() {
    if (!this.runState.isActive) return;

    // Update run score with current session score
    this.runState.runScore = Math.max(this.runState.runScore, state.score);
    this.runState.comboRecord = Math.max(this.runState.comboRecord, state.combo);

    // Check level completion
    if (this.shouldAdvanceLevel()) {
      this.advanceLevel();
    }

    // Check run failure conditions
    if (this.shouldEndRun()) {
      this.endRun();
    }
  }

  shouldAdvanceLevel() {
    // Get current difficulty settings
    const difficulty = difficultyScaler.getCurrentDifficulty();
    const scoreThreshold = difficulty ? difficulty.scoreThreshold : this.runState.levelTargetScore * this.runState.level;
    
    // Advance level based on score threshold or time
    const timeInLevel = Date.now() - this.runState.levelStartTime;
    
    return state.score >= scoreThreshold || timeInLevel > 120000; // 2 minutes max per level
  }

  shouldEndRun() {
    // End run on game over or if player chooses to end
    return state.gameOver || this.runState.level > 10; // Max 10 levels per run
  }

  advanceLevel() {
    this.runState.level++;
    this.runState.difficulty = Math.min(5, 1 + (this.runState.level - 1) * 0.5);
    this.runState.levelStartTime = Date.now();
    
    // Calculate and apply new difficulty
    const difficulty = calculateDifficulty(this.runState.level);
    difficultyScaler.applyDifficultyModifiers(difficulty);
    
    console.log(`📈 Level ${this.runState.level}! Difficulty: ${difficultyScaler.getDifficultyDescription(difficulty)}`);
    
    // Check if shop should appear
    if (shopSystem.shouldShowShop(this.runState.level)) {
      // Show shop instead of immediately continuing
      shopSystem.openShop(this.runState.runSeed, this.runState.level);
    } else {
      // Award cards for level completion
      this.awardLevelCards();
      
      // Reset board but preserve cards
      this.resetLevel();
      
      this.showLevelUpNotification();
    }
  }

  resetLevel() {
    // Reset game state but preserve run progress
    const currentRunScore = this.runState.runScore;
    const currentCardsOwned = [...this.runState.cardsOwned];
    
    resetSession();
    
    // Restore run data
    this.runState.runScore = currentRunScore;
    this.runState.cardsOwned = currentCardsOwned;
    
    // Apply difficulty modifiers
    this.applyDifficultyModifiers();
    
    // Generate new board for this level
    this.generateLevelBoard();
  }

  applyDifficultyModifiers() {
    // Calculate difficulty for current level
    const difficulty = calculateDifficulty(this.runState.level);
    difficultyScaler.applyDifficultyModifiers(difficulty);
    
    // Store difficulty multiplier for display
    this.runState.difficulty = difficulty.totalDifficultyScore / 50; // Normalize for display
  }

  awardStartingCards() {
    // Award 3 random starting cards
    const startingCardCount = 3;
    for (let i = 0; i < startingCardCount; i++) {
      this.awardRandomCard();
    }
  }

  awardLevelCards() {
    // Award 1-2 cards per level based on performance
    const cardsToAward = this.runState.level % 2 === 0 ? 2 : 1;
    for (let i = 0; i < cardsToAward; i++) {
      this.awardRandomCard();
    }
  }

  awardRandomCard() {
    // Use seeded random to select card type
    const cardType = getRandomCardType(() => this.random());
    const card = CARD_TYPES[cardType];
    
    if (!card) return null;
    
    // Add to owned cards list
    this.runState.cardsOwned.push({
      type: cardType,
      name: card.name,
      description: card.description,
      rarity: card.rarity
    });
    
    // Activate card effect
    cardInventory.addCard(cardType);
    
    // Check for new synergies
    const previousSynergies = synergySystem.getActiveSynergies().length;
    synergySystem.checkSynergies();
    const newSynergies = synergySystem.getActiveSynergies();
    
    // Show synergy notification if new synergy activated
    if (newSynergies.length > previousSynergies) {
      const latestSynergy = newSynergies[newSynergies.length - 1];
      synergySystem.showSynergyNotification(latestSynergy);
    }
    
    return card;
  }

  endRun() {
    this.runState.isActive = false;
    
    // Close shop if open
    if (shopSystem.isShopOpen()) {
      shopSystem.hideShopUI();
    }
    
    // Clean up boss system
    bossSystem.reset();
    
    // Clear card effects and synergies
    cardInventory.clearModifiers();
    synergySystem.reset();
    
    const runSummary = {
      seed: this.runState.runSeed,
      finalLevel: this.runState.level,
      finalScore: this.runState.runScore,
      comboRecord: this.runState.comboRecord,
      cardsCollected: this.runState.cardsOwned.length,
      difficulty: this.runState.difficulty
    };
    
    // Update player progression
    const newUnlocks = playerProgression.completeRun(runSummary);
    
    console.log('🏁 Run Ended!', runSummary);
    this.showRunEndNotification(runSummary, newUnlocks);
    
    return runSummary;
  }

  // Get seeded random floatie type
  getRandomFloatieType(floatieTypes) {
    const randomIndex = Math.floor(this.random() * floatieTypes.length);
    return floatieTypes[randomIndex];
  }

  generateLevelBoard() {
    // Generate procedural board for current level
    const playArea = document.getElementById('playArea');
    if (playArea) {
      const board = boardGenerator.generateBoard(this.runState.runSeed, this.runState.level, playArea);
      
      // Clear existing floaties and spawn from board
      import('./game.js').then(gameModule => {
        import('./main.js').then(mainModule => {
          // Access popFloat function from main module scope
          const popFloat = window.popFloatHandler || (() => {});
          gameModule.spawnFromBoard(playArea, popFloat, board.floaties);
          
          // Check if boss should spawn
          if (bossSystem.shouldSpawnBoss(this.runState.level)) {
            setTimeout(() => {
              bossSystem.spawnBoss(this.runState.level, playArea);
            }, 2000); // Delay boss spawn by 2 seconds
          }
        });
      });
      
      console.log(`🎲 Generated board: ${board.floaties.length} floaties, ${board.clusters.length} clusters`);
    }
  }
  showRunStartNotification() {
    this.showNotification(`🎮 Run ${this.runState.runSeed} Started!\nLevel 1 • Target: ${this.runState.levelTargetScore} points`, 'run-start');
  }

  showLevelUpNotification() {
    const newCard = this.runState.cardsOwned[this.runState.cardsOwned.length - 1];
    const difficulty = difficultyScaler.getCurrentDifficulty();
    const difficultyDesc = difficultyScaler.getDifficultyDescription(difficulty);
    
    const cardText = newCard ? `\n🎴 ${newCard.name}\n${newCard.description}` : '';
    const difficultyText = `\nDifficulty: ${difficultyDesc}`;
    
    this.showNotification(`📈 Level ${this.runState.level}!${difficultyText}${cardText}`, 'level-up');
  }

  showRunEndNotification(summary, newUnlocks = []) {
    const unlockText = newUnlocks.length > 0 ? `\n🎉 ${newUnlocks.length} new unlocks!` : '';
    const message = `🏁 Run Complete!\nSeed: ${summary.seed}\nLevel: ${summary.finalLevel}\nScore: ${summary.finalScore.toLocaleString()}\nCards: ${summary.cardsCollected}${unlockText}`;
    this.showNotification(message, 'run-end');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `run-notification ${type}`;
    notification.innerHTML = message.replace(/\n/g, '<br>');
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Notification helpers
  getCurrentRun() {
    return { ...this.runState };
  }

  isRunActive() {
    return this.runState.isActive;
  }

  getCurrentSeed() {
    return this.runState.runSeed;
  }

  getDifficultyMultiplier() {
    return this.runState.difficulty;
  }
}

// Global run manager instance
export const runManager = new RunManager();