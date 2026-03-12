import { ALL, FOOD, FLOWERS, HUMAN, ANIMALS } from './constants.js';
import { state } from './state.js';
import { cat, rv } from './utils.js';
import { runManager } from './runManager.js';
import { spawn } from './game.js';

// Boss definitions registry
const BOSS_REGISTRY = {
  QUEEN_JELLY: {
    id: 'QUEEN_JELLY',
    name: 'Queen Jelly',
    emoji: '👑',
    description: 'Spawns jelly floaties periodically and absorbs nearby floaties',
    size: { width: 3, height: 3 }, // 3x3 cells
    health: 15,
    spawnInterval: 3000, // 3 seconds
    abilities: {
      jellySpawn: true,
      absorption: true,
      royalAura: true
    },
    colors: ['#ff69b4', '#ff1493', '#dc143c'],
    scoreValue: 1000
  },

  CORAL_REEF_BOSS: {
    id: 'CORAL_REEF_BOSS',
    name: 'Coral Reef',
    emoji: '🪸',
    description: 'Grows clusters every few seconds and converts floaties to coral type',
    size: { width: 4, height: 2 }, // 4x2 cells
    health: 20,
    growthInterval: 4000, // 4 seconds
    abilities: {
      clusterGrowth: true,
      coralConversion: true,
      reefExpansion: true
    },
    colors: ['#ff7f50', '#ff6347', '#ffa500'],
    scoreValue: 1500
  },

  CHAOS_STAR: {
    id: 'CHAOS_STAR',
    name: 'Chaos Star',
    emoji: '⭐',
    description: 'Randomizes floatie families and creates chaotic movement patterns',
    size: { width: 2, height: 2 }, // 2x2 cells
    health: 12,
    chaosInterval: 2500, // 2.5 seconds
    abilities: {
      familyRandomization: true,
      chaosField: true,
      starBurst: true
    },
    colors: ['#9400d3', '#8a2be2', '#4b0082'],
    scoreValue: 800
  },

  PRISM_GUARDIAN: {
    id: 'PRISM_GUARDIAN',
    name: 'Prism Guardian',
    emoji: '💎',
    description: 'Reflects attacks and creates rainbow barriers around floaties',
    size: { width: 3, height: 2 }, // 3x2 cells
    health: 18,
    reflectInterval: 3500, // 3.5 seconds
    abilities: {
      attackReflection: true,
      rainbowBarrier: true,
      prismShield: true
    },
    colors: ['#00ffff', '#ff00ff', '#ffff00'],
    scoreValue: 1200
  },

  VOID_CONSUMER: {
    id: 'VOID_CONSUMER',
    name: 'Void Consumer',
    emoji: '🕳️',
    description: 'Consumes floaties to grow stronger and creates gravity wells',
    size: { width: 2, height: 3 }, // 2x3 cells
    health: 25,
    consumeInterval: 2000, // 2 seconds
    abilities: {
      floatieConsumption: true,
      gravityWell: true,
      voidGrowth: true
    },
    colors: ['#000000', '#1a1a1a', '#333333'],
    scoreValue: 2000
  }
};

export class BossSystem {
  constructor() {
    this.activeBoss = null;
    this.bossElement = null;
    this.lastAbilityTime = 0;
    this.bossUpdateCounter = 0;
    this.spawnedMinions = [];
  }

  // Check if boss should spawn
  shouldSpawnBoss(level) {
    return level % 5 === 0 && level > 0;
  }

  // Spawn boss for current level
  spawnBoss(level, playArea) {
    if (this.activeBoss) return; // Boss already active

    const bossTypes = Object.keys(BOSS_REGISTRY);
    const bossIndex = Math.floor((level / 5 - 1) % bossTypes.length);
    const bossType = bossTypes[bossIndex];
    const bossData = BOSS_REGISTRY[bossType];

    // Create boss instance
    this.activeBoss = {
      ...bossData,
      currentHealth: bossData.health,
      x: playArea.clientWidth / 2 - (bossData.size.width * 30),
      y: playArea.clientHeight / 2 - (bossData.size.height * 30),
      lastAbilityTime: Date.now(),
      level: level,
      phase: 1,
      isInvulnerable: false,
      damageFlash: false
    };

    this.createBossElement(playArea);
    this.showBossIntroduction();
    
    console.log(`👑 Boss Spawned: ${bossData.name} (Level ${level})`);
    return this.activeBoss;
  }

  // Create boss visual element
  createBossElement(playArea) {
    if (!this.activeBoss) return;

    this.bossElement = document.createElement('div');
    this.bossElement.className = 'boss-floatie';
    this.bossElement.id = `boss-${this.activeBoss.id}`;
    
    const width = this.activeBoss.size.width * 60;
    const height = this.activeBoss.size.height * 60;
    
    this.bossElement.style.cssText = `
      position: absolute;
      width: ${width}px;
      height: ${height}px;
      font-size: ${Math.min(width, height) * 0.4}px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 4px solid ${this.activeBoss.colors[0]};
      border-radius: 20px;
      background: linear-gradient(45deg, ${this.activeBoss.colors.join(', ')});
      box-shadow: 0 0 30px ${this.activeBoss.colors[0]};
      cursor: pointer;
      z-index: 100;
      animation: bossFloat 3s ease-in-out infinite;
    `;
    
    this.bossElement.textContent = this.activeBoss.emoji;
    this.bossElement.onclick = () => this.attackBoss();
    
    this.updateBossPosition();
    playArea.appendChild(this.bossElement);
    
    // Add health bar
    this.createHealthBar();
  }

  // Create boss health bar
  createHealthBar() {
    const healthBar = document.createElement('div');
    healthBar.className = 'boss-health-bar';
    healthBar.innerHTML = `
      <div class="boss-name">${this.activeBoss.name}</div>
      <div class="health-bar-container">
        <div class="health-bar-fill" style="width: 100%"></div>
      </div>
      <div class="boss-phase">Phase ${this.activeBoss.phase}</div>
    `;
    
    document.body.appendChild(healthBar);
  }

  // Update boss position
  updateBossPosition() {
    if (!this.bossElement || !this.activeBoss) return;
    
    this.bossElement.style.transform = `translate(${this.activeBoss.x}px, ${this.activeBoss.y}px)`;
  }

  // Attack boss (player clicks on boss)
  attackBoss() {
    if (!this.activeBoss || this.activeBoss.isInvulnerable) return;

    // Deal damage
    this.activeBoss.currentHealth--;
    this.updateHealthBar();
    
    // Damage flash effect
    this.activeBoss.damageFlash = true;
    this.bossElement.classList.add('damage-flash');
    setTimeout(() => {
      this.activeBoss.damageFlash = false;
      this.bossElement.classList.remove('damage-flash');
    }, 200);

    // Check phase transition
    const healthPercent = this.activeBoss.currentHealth / this.activeBoss.health;
    if (healthPercent <= 0.5 && this.activeBoss.phase === 1) {
      this.activeBoss.phase = 2;
      this.triggerPhaseTransition();
    }

    // Check if boss is defeated
    if (this.activeBoss.currentHealth <= 0) {
      this.defeatBoss();
    } else {
      // Boss retaliation
      this.triggerBossRetaliation();
    }
  }

  // Update boss behavior (called from main game loop)
  updateBoss() {
    if (!this.activeBoss) return;

    this.bossUpdateCounter++;
    
    // Update boss abilities every few frames
    if (this.bossUpdateCounter % 5 === 0) {
      this.updateBossAbilities();
    }

    // Update boss movement
    this.updateBossMovement();
    
    // Update minions
    this.updateMinions();
  }

  // Update boss abilities
  updateBossAbilities() {
    if (!this.activeBoss) return;

    const now = Date.now();
    const timeSinceLastAbility = now - this.activeBoss.lastAbilityTime;
    
    // Determine ability interval based on boss type
    let abilityInterval;
    switch (this.activeBoss.id) {
      case 'QUEEN_JELLY':
        abilityInterval = this.activeBoss.spawnInterval;
        break;
      case 'CORAL_REEF_BOSS':
        abilityInterval = this.activeBoss.growthInterval;
        break;
      case 'CHAOS_STAR':
        abilityInterval = this.activeBoss.chaosInterval;
        break;
      case 'PRISM_GUARDIAN':
        abilityInterval = this.activeBoss.reflectInterval;
        break;
      case 'VOID_CONSUMER':
        abilityInterval = this.activeBoss.consumeInterval;
        break;
      default:
        abilityInterval = 3000;
    }

    // Trigger ability if enough time has passed
    if (timeSinceLastAbility >= abilityInterval) {
      this.triggerBossAbility();
      this.activeBoss.lastAbilityTime = now;
    }
  }

  // Trigger boss-specific ability
  triggerBossAbility() {
    if (!this.activeBoss) return;

    switch (this.activeBoss.id) {
      case 'QUEEN_JELLY':
        this.queenJellyAbility();
        break;
      case 'CORAL_REEF_BOSS':
        this.coralReefAbility();
        break;
      case 'CHAOS_STAR':
        this.chaosStarAbility();
        break;
      case 'PRISM_GUARDIAN':
        this.prismGuardianAbility();
        break;
      case 'VOID_CONSUMER':
        this.voidConsumerAbility();
        break;
    }
  }

  // Queen Jelly abilities
  queenJellyAbility() {
    // Spawn jelly minions
    this.spawnMinions(2, '🪼');
    
    // Absorb nearby floaties
    this.absorbNearbyFloaties(150);
    
    this.showAbilityEffect('👑 Royal Spawn!', '#ff69b4');
  }

  // Coral Reef abilities
  coralReefAbility() {
    // Grow coral clusters
    this.growCoralClusters();
    
    // Convert nearby floaties to coral type
    this.convertNearbyFloaties(120, FLOWERS);
    
    this.showAbilityEffect('🪸 Reef Growth!', '#ff7f50');
  }

  // Chaos Star abilities
  chaosStarAbility() {
    // Randomize floatie families
    this.randomizeFloatieFamilies(200);
    
    // Create chaos field
    this.createChaosField();
    
    this.showAbilityEffect('⭐ Chaos Wave!', '#9400d3');
  }

  // Prism Guardian abilities
  prismGuardianAbility() {
    // Create rainbow barriers
    this.createRainbowBarriers();
    
    // Reflect damage back to player (temporary invulnerability)
    this.activeBoss.isInvulnerable = true;
    setTimeout(() => {
      if (this.activeBoss) this.activeBoss.isInvulnerable = false;
    }, 2000);
    
    this.showAbilityEffect('💎 Prism Shield!', '#00ffff');
  }

  // Void Consumer abilities
  voidConsumerAbility() {
    // Consume nearby floaties
    const consumed = this.consumeNearbyFloaties(100);
    
    // Grow stronger based on consumed floaties
    if (consumed > 0) {
      this.activeBoss.health += consumed;
      this.activeBoss.currentHealth += consumed;
    }
    
    // Create gravity well
    this.createGravityWell();
    
    this.showAbilityEffect('🕳️ Void Hunger!', '#000000');
  }

  // Spawn minion floaties
  spawnMinions(count, emoji) {
    const playArea = document.getElementById('playArea');
    if (!playArea) return;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 100;
      const x = this.activeBoss.x + Math.cos(angle) * distance;
      const y = this.activeBoss.y + Math.sin(angle) * distance;

      const minion = {
        emoji: emoji,
        x: Math.max(40, Math.min(x, playArea.clientWidth - 40)),
        y: Math.max(40, Math.min(y, playArea.clientHeight - 40)),
        isBossMinion: true,
        bossId: this.activeBoss.id,
        health: 1
      };

      this.spawnedMinions.push(minion);
      this.createMinionElement(minion, playArea);
    }
  }

  // Create minion visual element
  createMinionElement(minion, playArea) {
    const el = document.createElement('div');
    el.className = 'boss-minion';
    el.textContent = minion.emoji;
    el.style.cssText = `
      position: absolute;
      font-size: 24px;
      border: 2px solid ${this.activeBoss.colors[0]};
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      padding: 5px;
      cursor: pointer;
      animation: minionFloat 2s ease-in-out infinite;
    `;
    
    el.onclick = () => this.attackMinion(minion);
    minion.element = el;
    
    el.style.transform = `translate(${minion.x}px, ${minion.y}px)`;
    playArea.appendChild(el);
  }

  // Attack minion
  attackMinion(minion) {
    minion.health--;
    if (minion.health <= 0) {
      minion.element.remove();
      this.spawnedMinions = this.spawnedMinions.filter(m => m !== minion);
      
      // Award points for defeating minion
      state.score += 50;
    }
  }

  // Absorb nearby floaties
  absorbNearbyFloaties(radius) {
    const absorbed = [];
    state.floats.forEach(floatie => {
      const dx = floatie.x - this.activeBoss.x;
      const dy = floatie.y - this.activeBoss.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        absorbed.push(floatie);
      }
    });

    absorbed.forEach(floatie => {
      floatie.el.remove();
      state.floats = state.floats.filter(f => f !== floatie);
    });

    return absorbed.length;
  }

  // Convert nearby floaties to specific family
  convertNearbyFloaties(radius, targetFamily) {
    state.floats.forEach(floatie => {
      const dx = floatie.x - this.activeBoss.x;
      const dy = floatie.y - this.activeBoss.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        const newType = targetFamily[Math.floor(Math.random() * targetFamily.length)];
        floatie.type = newType;
        floatie.el.textContent = newType;
        floatie.el.classList.add('converted');
        
        setTimeout(() => {
          floatie.el.classList.remove('converted');
        }, 1000);
      }
    });
  }

  // Randomize floatie families
  randomizeFloatieFamilies(radius) {
    state.floats.forEach(floatie => {
      const dx = floatie.x - this.activeBoss.x;
      const dy = floatie.y - this.activeBoss.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        const newType = ALL[Math.floor(Math.random() * ALL.length)];
        floatie.type = newType;
        floatie.el.textContent = newType;
        floatie.el.classList.add('chaos-effect');
        
        setTimeout(() => {
          floatie.el.classList.remove('chaos-effect');
        }, 1500);
      }
    });
  }

  // Create gravity well effect
  createGravityWell() {
    state.floats.forEach(floatie => {
      const dx = this.activeBoss.x - floatie.x;
      const dy = this.activeBoss.y - floatie.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 300 && distance > 50) {
        const pullStrength = 0.05;
        floatie.vx += (dx / distance) * pullStrength;
        floatie.vy += (dy / distance) * pullStrength;
      }
    });
  }

  // Update boss movement
  updateBossMovement() {
    if (!this.activeBoss || !this.bossElement) return;

    // Slow floating movement
    const time = Date.now() * 0.001;
    const offsetX = Math.sin(time * 0.5) * 20;
    const offsetY = Math.cos(time * 0.3) * 15;
    
    this.activeBoss.x += offsetX * 0.1;
    this.activeBoss.y += offsetY * 0.1;
    
    this.updateBossPosition();
  }

  // Update minions
  updateMinions() {
    this.spawnedMinions.forEach(minion => {
      if (minion.element) {
        // Simple floating animation for minions
        const time = Date.now() * 0.002;
        const offsetX = Math.sin(time + minion.x * 0.01) * 10;
        const offsetY = Math.cos(time + minion.y * 0.01) * 8;
        
        minion.element.style.transform = `translate(${minion.x + offsetX}px, ${minion.y + offsetY}px)`;
      }
    });
  }

  // Show ability effect
  showAbilityEffect(text, color) {
    const effect = document.createElement('div');
    effect.className = 'boss-ability-effect';
    effect.textContent = text;
    effect.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      color: ${color};
      font-size: 24px;
      font-weight: bold;
      text-shadow: 0 0 10px ${color};
      z-index: 2000;
      animation: abilityEffect 2s ease-out forwards;
      pointer-events: none;
    `;
    
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 2000);
  }

  // Update health bar
  updateHealthBar() {
    const healthBar = document.querySelector('.boss-health-bar');
    if (healthBar && this.activeBoss) {
      const healthPercent = (this.activeBoss.currentHealth / this.activeBoss.health) * 100;
      const healthFill = healthBar.querySelector('.health-bar-fill');
      if (healthFill) {
        healthFill.style.width = `${Math.max(0, healthPercent)}%`;
      }
      
      const phaseDisplay = healthBar.querySelector('.boss-phase');
      if (phaseDisplay) {
        phaseDisplay.textContent = `Phase ${this.activeBoss.phase}`;
      }
    }
  }

  // Trigger phase transition
  triggerPhaseTransition() {
    this.showAbilityEffect(`Phase ${this.activeBoss.phase}!`, '#ff0000');
    
    // Increase ability frequency in phase 2
    this.activeBoss.spawnInterval *= 0.7;
    this.activeBoss.growthInterval *= 0.7;
    this.activeBoss.chaosInterval *= 0.7;
  }

  // Defeat boss
  defeatBoss() {
    if (!this.activeBoss) return;

    // Award score
    state.score += this.activeBoss.scoreValue;
    
    // Show defeat effect
    this.showAbilityEffect(`${this.activeBoss.name} Defeated! +${this.activeBoss.scoreValue}`, '#00ff00');
    
    // Clean up
    this.cleanupBoss();
    
    console.log(`👑 Boss Defeated: ${this.activeBoss.name}`);
  }

  // Clean up boss and related elements
  cleanupBoss() {
    if (this.bossElement) {
      this.bossElement.remove();
      this.bossElement = null;
    }
    
    // Remove health bar
    const healthBar = document.querySelector('.boss-health-bar');
    if (healthBar) healthBar.remove();
    
    // Remove minions
    this.spawnedMinions.forEach(minion => {
      if (minion.element) minion.element.remove();
    });
    this.spawnedMinions = [];
    
    this.activeBoss = null;
    this.lastAbilityTime = 0;
    this.bossUpdateCounter = 0;
  }

  // Show boss introduction
  showBossIntroduction() {
    if (!this.activeBoss) return;

    const intro = document.createElement('div');
    intro.className = 'boss-introduction';
    intro.innerHTML = `
      <div class="boss-intro-emoji">${this.activeBoss.emoji}</div>
      <div class="boss-intro-name">${this.activeBoss.name}</div>
      <div class="boss-intro-desc">${this.activeBoss.description}</div>
    `;
    
    document.body.appendChild(intro);
    setTimeout(() => {
      intro.classList.add('fade-out');
      setTimeout(() => intro.remove(), 500);
    }, 4000);
  }

  // Get current boss
  getCurrentBoss() {
    return this.activeBoss;
  }

  // Check if boss is active
  isBossActive() {
    return this.activeBoss !== null;
  }

  // Reset boss system
  reset() {
    this.cleanupBoss();
  }
}

// Global boss system instance
export const bossSystem = new BossSystem();