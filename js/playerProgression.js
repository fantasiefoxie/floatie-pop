import { ALL, FOOD, FLOWERS, HUMAN, ANIMALS } from './constants.js';
import { CARD_TYPES } from './cardSystem.js';

// Unlockable floatie types with score requirements
const UNLOCKABLE_FLOATIES = {
  // Tier 1 - Basic unlocks (0-10k score)
  GOLDEN_STAR: {
    emoji: '⭐',
    name: 'Golden Star',
    family: 'special',
    unlockScore: 1000,
    description: 'A shimmering star that grants bonus points',
    rarity: 'uncommon',
    scoreMultiplier: 1.5
  },
  
  RAINBOW_HEART: {
    emoji: '💖',
    name: 'Rainbow Heart',
    family: 'special',
    unlockScore: 2500,
    description: 'A colorful heart that spreads love and combos',
    rarity: 'uncommon',
    comboBonus: true
  },

  CRYSTAL_GEM: {
    emoji: '💎',
    name: 'Crystal Gem',
    family: 'special',
    unlockScore: 5000,
    description: 'A precious gem worth significant points',
    rarity: 'rare',
    scoreMultiplier: 2.0
  },

  // Tier 2 - Advanced unlocks (10k-50k score)
  FIRE_PHOENIX: {
    emoji: '🔥',
    name: 'Fire Phoenix',
    family: 'mythical',
    unlockScore: 10000,
    description: 'A blazing phoenix that ignites nearby floaties',
    rarity: 'rare',
    chainReaction: true
  },

  ICE_CRYSTAL: {
    emoji: '❄️',
    name: 'Ice Crystal',
    family: 'mythical',
    unlockScore: 15000,
    description: 'A frozen crystal that slows time briefly',
    rarity: 'rare',
    timeEffect: true
  },

  LIGHTNING_BOLT: {
    emoji: '⚡',
    name: 'Lightning Bolt',
    family: 'mythical',
    unlockScore: 25000,
    description: 'Electric energy that chains between floaties',
    rarity: 'epic',
    chainLightning: true
  },

  VOID_ORB: {
    emoji: '🌑',
    name: 'Void Orb',
    family: 'mythical',
    unlockScore: 40000,
    description: 'A mysterious orb that absorbs other floaties',
    rarity: 'epic',
    absorption: true
  },

  // Tier 3 - Master unlocks (50k+ score)
  COSMIC_SPIRAL: {
    emoji: '🌀',
    name: 'Cosmic Spiral',
    family: 'cosmic',
    unlockScore: 50000,
    description: 'A swirling galaxy that warps space around it',
    rarity: 'epic',
    spaceWarp: true
  },

  DIVINE_CROWN: {
    emoji: '👑',
    name: 'Divine Crown',
    family: 'cosmic',
    unlockScore: 75000,
    description: 'The ultimate floatie that rules over all others',
    rarity: 'legendary',
    royalPower: true
  },

  INFINITY_SYMBOL: {
    emoji: '∞',
    name: 'Infinity Symbol',
    family: 'cosmic',
    unlockScore: 100000,
    description: 'Represents endless possibilities and maximum power',
    rarity: 'legendary',
    infinitePower: true
  }
};

// Unlockable cards with score requirements
const UNLOCKABLE_CARDS = {
  // Advanced cards unlocked through progression
  MASTER_COLLECTOR: {
    unlockScore: 5000,
    cardType: 'MASTER_COLLECTOR',
    name: 'Master Collector',
    description: 'All floaties have 20% chance to spawn as rare',
    rarity: 'rare',
    effect: 'masterCollection',
    value: 0.2
  },

  TIME_MASTER: {
    unlockScore: 15000,
    cardType: 'TIME_MASTER',
    name: 'Time Master',
    description: 'Game time moves 40% slower',
    rarity: 'epic',
    effect: 'timeMastery',
    value: 0.6
  },

  SCORE_EMPEROR: {
    unlockScore: 30000,
    cardType: 'SCORE_EMPEROR',
    name: 'Score Emperor',
    description: 'All scores are multiplied by 5x',
    rarity: 'epic',
    effect: 'scoreEmperor',
    value: 5
  },

  FLOATIE_GOD: {
    unlockScore: 75000,
    cardType: 'FLOATIE_GOD',
    name: 'Floatie God',
    description: 'Ultimate power over all floaties and mechanics',
    rarity: 'legendary',
    effect: 'floatieGod',
    value: true
  }
};

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_STEPS: {
    id: 'FIRST_STEPS',
    name: 'First Steps',
    description: 'Complete your first run',
    requirement: 'completeRun',
    value: 1,
    reward: { type: 'floatie', id: 'GOLDEN_STAR' }
  },

  SCORE_HUNTER: {
    id: 'SCORE_HUNTER',
    name: 'Score Hunter',
    description: 'Reach 10,000 total score',
    requirement: 'totalScore',
    value: 10000,
    reward: { type: 'card', id: 'MASTER_COLLECTOR' }
  },

  COMBO_MASTER: {
    id: 'COMBO_MASTER',
    name: 'Combo Master',
    description: 'Achieve a 100+ combo in a single run',
    requirement: 'maxCombo',
    value: 100,
    reward: { type: 'floatie', id: 'RAINBOW_HEART' }
  },

  LEVEL_CONQUEROR: {
    id: 'LEVEL_CONQUEROR',
    name: 'Level Conqueror',
    description: 'Reach level 10 in a run',
    requirement: 'maxLevel',
    value: 10,
    reward: { type: 'floatie', id: 'FIRE_PHOENIX' }
  }
};

export class PlayerProgressionSystem {
  constructor() {
    this.playerProfile = this.loadProfile();
    this.sessionStats = {
      runsCompleted: 0,
      scoreGained: 0,
      newUnlocks: []
    };
  }

  // Load player profile from localStorage
  loadProfile() {
    const savedProfile = localStorage.getItem('playerProfile');
    
    if (savedProfile) {
      return JSON.parse(savedProfile);
    }
    
    // Default profile for new players
    return {
      totalScore: 0,
      totalRuns: 0,
      maxCombo: 0,
      maxLevel: 0,
      unlockedFloaties: [...ALL], // Start with basic floaties
      unlockedCards: Object.keys(CARD_TYPES),
      achievements: [],
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      version: '1.0'
    };
  }

  // Save player profile to localStorage
  saveProfile() {
    this.playerProfile.lastPlayed = Date.now();
    localStorage.setItem('playerProfile', JSON.stringify(this.playerProfile));
  }

  // Add score to total and check for unlocks
  addScore(score) {
    const previousTotal = this.playerProfile.totalScore;
    this.playerProfile.totalScore += score;
    this.sessionStats.scoreGained += score;
    
    // Check for new unlocks
    this.checkUnlocks(previousTotal, this.playerProfile.totalScore);
    this.saveProfile();
  }

  // Complete a run and update stats
  completeRun(runStats) {
    this.playerProfile.totalRuns++;
    this.sessionStats.runsCompleted++;
    
    // Update max stats
    if (runStats.comboRecord > this.playerProfile.maxCombo) {
      this.playerProfile.maxCombo = runStats.comboRecord;
    }
    
    if (runStats.finalLevel > this.playerProfile.maxLevel) {
      this.playerProfile.maxLevel = runStats.finalLevel;
    }
    
    // Add final score
    this.addScore(runStats.finalScore);
    
    // Check achievements
    this.checkAchievements();
    
    this.saveProfile();
    return this.sessionStats.newUnlocks;
  }

  // Check for new unlocks based on score milestones
  checkUnlocks(previousScore, currentScore) {
    // Check floatie unlocks
    Object.entries(UNLOCKABLE_FLOATIES).forEach(([key, floatie]) => {
      if (previousScore < floatie.unlockScore && 
          currentScore >= floatie.unlockScore &&
          !this.playerProfile.unlockedFloaties.includes(floatie.emoji)) {
        
        this.unlockFloatie(key, floatie);
      }
    });

    // Check card unlocks
    Object.entries(UNLOCKABLE_CARDS).forEach(([key, card]) => {
      if (previousScore < card.unlockScore && 
          currentScore >= card.unlockScore &&
          !this.playerProfile.unlockedCards.includes(card.cardType)) {
        
        this.unlockCard(key, card);
      }
    });
  }

  // Unlock a new floatie
  unlockFloatie(key, floatie) {
    this.playerProfile.unlockedFloaties.push(floatie.emoji);
    this.sessionStats.newUnlocks.push({
      type: 'floatie',
      key: key,
      data: floatie
    });
    
    this.showUnlockNotification('floatie', floatie);
    console.log(`🎉 Unlocked floatie: ${floatie.name} (${floatie.emoji})`);
  }

  // Unlock a new card
  unlockCard(key, card) {
    this.playerProfile.unlockedCards.push(card.cardType);
    this.sessionStats.newUnlocks.push({
      type: 'card',
      key: key,
      data: card
    });
    
    this.showUnlockNotification('card', card);
    console.log(`🎉 Unlocked card: ${card.name}`);
  }

  // Check and award achievements
  checkAchievements() {
    Object.values(ACHIEVEMENTS).forEach(achievement => {
      if (this.playerProfile.achievements.includes(achievement.id)) {
        return; // Already unlocked
      }

      let unlocked = false;
      
      switch (achievement.requirement) {
        case 'completeRun':
          unlocked = this.playerProfile.totalRuns >= achievement.value;
          break;
        case 'totalScore':
          unlocked = this.playerProfile.totalScore >= achievement.value;
          break;
        case 'maxCombo':
          unlocked = this.playerProfile.maxCombo >= achievement.value;
          break;
        case 'maxLevel':
          unlocked = this.playerProfile.maxLevel >= achievement.value;
          break;
      }

      if (unlocked) {
        this.unlockAchievement(achievement);
      }
    });
  }

  // Unlock achievement
  unlockAchievement(achievement) {
    this.playerProfile.achievements.push(achievement.id);
    this.sessionStats.newUnlocks.push({
      type: 'achievement',
      key: achievement.id,
      data: achievement
    });
    
    this.showAchievementNotification(achievement);
    console.log(`🏆 Achievement unlocked: ${achievement.name}`);
  }

  // Show unlock notification
  showUnlockNotification(type, item) {
    const notification = document.createElement('div');
    notification.className = 'unlock-notification';
    
    let content = '';
    if (type === 'floatie') {
      content = `
        <div class="unlock-icon">${item.emoji}</div>
        <div class="unlock-text">
          <div class="unlock-title">New Floatie Unlocked!</div>
          <div class="unlock-name">${item.name}</div>
          <div class="unlock-desc">${item.description}</div>
        </div>
      `;
    } else if (type === 'card') {
      content = `
        <div class="unlock-icon">🎴</div>
        <div class="unlock-text">
          <div class="unlock-title">New Card Unlocked!</div>
          <div class="unlock-name">${item.name}</div>
          <div class="unlock-desc">${item.description}</div>
        </div>
      `;
    }
    
    notification.innerHTML = content;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  // Show achievement notification
  showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-icon">🏆</div>
      <div class="achievement-text">
        <div class="achievement-title">Achievement Unlocked!</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-desc">${achievement.description}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  // Get available floaties for spawning
  getAvailableFloaties() {
    return this.playerProfile.unlockedFloaties;
  }

  // Get available cards for runs
  getAvailableCards() {
    return this.playerProfile.unlockedCards;
  }

  // Get unlockable floaties that haven't been unlocked yet
  getNextUnlocks() {
    const nextFloaties = Object.entries(UNLOCKABLE_FLOATIES)
      .filter(([key, floatie]) => !this.playerProfile.unlockedFloaties.includes(floatie.emoji))
      .sort((a, b) => a[1].unlockScore - b[1].unlockScore)
      .slice(0, 3);

    const nextCards = Object.entries(UNLOCKABLE_CARDS)
      .filter(([key, card]) => !this.playerProfile.unlockedCards.includes(card.cardType))
      .sort((a, b) => a[1].unlockScore - b[1].unlockScore)
      .slice(0, 3);

    return { floaties: nextFloaties, cards: nextCards };
  }

  // Get player statistics
  getPlayerStats() {
    return {
      totalScore: this.playerProfile.totalScore,
      totalRuns: this.playerProfile.totalRuns,
      maxCombo: this.playerProfile.maxCombo,
      maxLevel: this.playerProfile.maxLevel,
      achievementsUnlocked: this.playerProfile.achievements.length,
      totalAchievements: Object.keys(ACHIEVEMENTS).length,
      floatiesUnlocked: this.playerProfile.unlockedFloaties.length,
      totalFloaties: ALL.length + Object.keys(UNLOCKABLE_FLOATIES).length,
      cardsUnlocked: this.playerProfile.unlockedCards.length,
      totalCards: Object.keys(CARD_TYPES).length + Object.keys(UNLOCKABLE_CARDS).length,
      accountAge: Date.now() - this.playerProfile.createdAt,
      lastPlayed: this.playerProfile.lastPlayed
    };
  }

  // Show progression panel
  showProgressionPanel() {
    const panel = this.createProgressionPanel();
    document.body.appendChild(panel);
  }

  // Create progression panel UI
  createProgressionPanel() {
    const stats = this.getPlayerStats();
    const nextUnlocks = this.getNextUnlocks();
    
    const panel = document.createElement('div');
    panel.className = 'progression-panel';
    panel.innerHTML = `
      <div class="progression-header">
        <h2>🏆 Player Progression</h2>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      
      <div class="progression-content">
        <div class="stats-section">
          <h3>Statistics</h3>
          <div class="stat-grid">
            <div class="stat-item">
              <div class="stat-value">${stats.totalScore.toLocaleString()}</div>
              <div class="stat-label">Total Score</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.totalRuns}</div>
              <div class="stat-label">Runs Completed</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.maxCombo}</div>
              <div class="stat-label">Best Combo</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.maxLevel}</div>
              <div class="stat-label">Max Level</div>
            </div>
          </div>
        </div>
        
        <div class="unlocks-section">
          <h3>Next Unlocks</h3>
          <div class="unlock-grid">
            ${nextUnlocks.floaties.map(([key, floatie]) => `
              <div class="unlock-preview">
                <div class="unlock-emoji">${floatie.emoji}</div>
                <div class="unlock-info">
                  <div class="unlock-name">${floatie.name}</div>
                  <div class="unlock-requirement">${floatie.unlockScore.toLocaleString()} score</div>
                  <div class="unlock-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${Math.min(100, (stats.totalScore / floatie.unlockScore) * 100)}%"></div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="achievements-section">
          <h3>Achievements (${stats.achievementsUnlocked}/${stats.totalAchievements})</h3>
          <div class="achievement-grid">
            ${Object.values(ACHIEVEMENTS).map(achievement => `
              <div class="achievement-item ${this.playerProfile.achievements.includes(achievement.id) ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">🏆</div>
                <div class="achievement-info">
                  <div class="achievement-name">${achievement.name}</div>
                  <div class="achievement-desc">${achievement.description}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    return panel;
  }

  // Reset profile (for testing)
  resetProfile() {
    localStorage.removeItem('playerProfile');
    this.playerProfile = this.loadProfile();
    console.log('Player profile reset');
  }

  // Get current profile
  getProfile() {
    return { ...this.playerProfile };
  }

  // Get session stats
  getSessionStats() {
    return { ...this.sessionStats };
  }
}

// Global player progression system instance
export const playerProgression = new PlayerProgressionSystem();

// Export unlockable content for external access
export { UNLOCKABLE_FLOATIES, UNLOCKABLE_CARDS, ACHIEVEMENTS };