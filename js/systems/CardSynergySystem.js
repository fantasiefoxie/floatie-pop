/**
 * CARD SYNERGY SYSTEM - Detects and applies special card interactions
 * 
 * Features:
 * - Detects predefined card combinations
 * - Applies synergy modifiers to gameplay
 * - Dynamically updates when hand changes
 * - Emits synergy activation/deactivation events
 * - Extensible synergy registry
 * 
 * Lifecycle:
 * - init: Initialize synergy registry
 * - update: Check for synergy changes
 * - onEvent: Handle card events
 * 
 * Listens to:
 * - card:addedToHand (from CardExecutionSystem)
 * - card:activated (from UI)
 * 
 * Emits events:
 * - synergy:activated (name, description)
 * - synergy:deactivated (name, description)
 * 
 * Synergy Examples:
 * - ClusterCreator: magnetizeFamily + spawnFamily
 * - MegaCombo: clearCluster + doubleNextCombo
 * - ControlledSpawn: shuffleRow + spawnFamily
 */

export class CardSynergySystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.synergyRegistry = this.initializeSynergyRegistry();
    this.previousActiveSynergies = [];
  }

  /**
   * Initialize synergy registry with predefined combinations
   * @returns {Array} Synergy definitions
   */
  initializeSynergyRegistry() {
    return [
      {
        id: 'clusterCreator',
        name: 'Cluster Creator',
        description: 'Spawned floaties prefer same-family clusters',
        requiredCards: ['magnetizeFamily', 'spawnFamily'],
        modifiers: {
          spawnClusterPreference: 0.8,
          clusterAttraction: 0.15
        }
      },
      {
        id: 'megaCombo',
        name: 'Mega Combo',
        description: 'Combo multiplier increased by +1',
        requiredCards: ['clearCluster', 'doubleNextCombo'],
        modifiers: {
          comboMultiplierBonus: 1
        }
      },
      {
        id: 'controlledSpawn',
        name: 'Controlled Spawn',
        description: 'Spawn Family card spawns floaties closer together',
        requiredCards: ['shuffleRow', 'spawnFamily'],
        modifiers: {
          spawnSpacing: 0.7,
          spawnDensity: 1.3
        }
      },
      {
        id: 'chainReaction',
        name: 'Chain Reaction',
        description: 'Pop chains trigger additional combo multiplier',
        requiredCards: ['clearCluster', 'magnetizeFamily'],
        modifiers: {
          chainComboBonus: 0.5
        }
      },
      {
        id: 'masterControl',
        name: 'Master Control',
        description: 'All card effects are 25% more powerful',
        requiredCards: ['shuffleRow', 'clearCluster', 'magnetizeFamily'],
        modifiers: {
          cardEffectPower: 1.25
        }
      },
      {
        id: 'doubleDown',
        name: 'Double Down',
        description: 'Double Next Combo effect applies twice',
        requiredCards: ['doubleNextCombo', 'doubleNextCombo'],
        modifiers: {
          comboMultiplierBonus: 2
        }
      },
      {
        id: 'spawnMaster',
        name: 'Spawn Master',
        description: 'Spawn Family spawns 8 floaties instead of 5',
        requiredCards: ['spawnFamily', 'spawnFamily'],
        modifiers: {
          spawnCount: 8
        }
      },
      {
        id: 'perfectOrder',
        name: 'Perfect Order',
        description: 'Shuffle Row and Clear Cluster work together perfectly',
        requiredCards: ['shuffleRow', 'clearCluster'],
        modifiers: {
          shuffleClearSynergy: 1.5
        }
      }
    ];
  }

  /**
   * Initialize card synergy system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    if (!gameState.synergy) {
      gameState.synergy = {
        active: [],
        modifiers: {}
      };
    }

    this.previousActiveSynergies = [];

    console.log('✅ CardSynergySystem initialized');
    console.log(`📋 Synergy registry: ${this.synergyRegistry.length} synergies`);
  }

  /**
   * Update card synergy system
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    // Check for synergy changes
    this.updateSynergies(gameState);
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState) return;

    if (eventName === 'card:addedToHand' || eventName === 'card:activated') {
      this.updateSynergies(gameState);
    }
  }

  /**
   * Update active synergies based on current hand
   * @param {Object} gameState - Centralized game state
   */
  updateSynergies(gameState) {
    if (!gameState.cards || !gameState.cards.hand) return;

    // Get current hand card types
    const handCardTypes = gameState.cards.hand.map(card => card.type);

    // Detect active synergies
    const activeSynergies = this.detectActiveSynergies(handCardTypes);

    // Check if synergies changed
    const synergyChanged = this.hasSynergyChanged(activeSynergies);

    if (synergyChanged) {
      // Deactivate removed synergies
      this.deactivateRemovedSynergies(gameState, activeSynergies);

      // Activate new synergies
      this.activateNewSynergies(gameState, activeSynergies);

      // Update state
      gameState.synergy.active = activeSynergies;
      this.previousActiveSynergies = activeSynergies.map(s => s.id);

      // Apply modifiers
      this.applyModifiers(gameState, activeSynergies);
    }
  }

  /**
   * Detect active synergies from hand
   * @param {Array} handCardTypes - Card types in hand
   * @returns {Array} Active synergies
   */
  detectActiveSynergies(handCardTypes) {
    const activeSynergies = [];

    for (const synergy of this.synergyRegistry) {
      if (this.isSynergyActive(synergy, handCardTypes)) {
        activeSynergies.push(synergy);
      }
    }

    return activeSynergies;
  }

  /**
   * Check if synergy is active
   * @param {Object} synergy - Synergy definition
   * @param {Array} handCardTypes - Card types in hand
   * @returns {boolean} True if synergy is active
   */
  isSynergyActive(synergy, handCardTypes) {
    // Check if all required cards are in hand
    for (const requiredCard of synergy.requiredCards) {
      if (!handCardTypes.includes(requiredCard)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if synergies have changed
   * @param {Array} activeSynergies - Currently active synergies
   * @returns {boolean} True if changed
   */
  hasSynergyChanged(activeSynergies) {
    const currentIds = activeSynergies.map(s => s.id).sort();
    const previousIds = this.previousActiveSynergies.sort();

    if (currentIds.length !== previousIds.length) {
      return true;
    }

    for (let i = 0; i < currentIds.length; i++) {
      if (currentIds[i] !== previousIds[i]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Deactivate removed synergies
   * @param {Object} gameState - Centralized game state
   * @param {Array} activeSynergies - Currently active synergies
   */
  deactivateRemovedSynergies(gameState, activeSynergies) {
    const activeIds = activeSynergies.map(s => s.id);

    for (const previousId of this.previousActiveSynergies) {
      if (!activeIds.includes(previousId)) {
        const synergy = this.synergyRegistry.find(s => s.id === previousId);
        if (synergy) {
          this.systemManager.emit('synergy:deactivated', {
            name: synergy.name,
            description: synergy.description
          });

          console.log(`❌ Synergy deactivated: ${synergy.name}`);
        }
      }
    }
  }

  /**
   * Activate new synergies
   * @param {Object} gameState - Centralized game state
   * @param {Array} activeSynergies - Currently active synergies
   */
  activateNewSynergies(gameState, activeSynergies) {
    for (const synergy of activeSynergies) {
      if (!this.previousActiveSynergies.includes(synergy.id)) {
        this.systemManager.emit('synergy:activated', {
          name: synergy.name,
          description: synergy.description
        });

        console.log(`✨ Synergy activated: ${synergy.name}`);
      }
    }
  }

  /**
   * Apply synergy modifiers to gameState
   * @param {Object} gameState - Centralized game state
   * @param {Array} activeSynergies - Active synergies
   */
  applyModifiers(gameState, activeSynergies) {
    // Clear previous modifiers
    gameState.synergy.modifiers = {};

    // Merge all active synergy modifiers
    for (const synergy of activeSynergies) {
      for (const [key, value] of Object.entries(synergy.modifiers)) {
        if (gameState.synergy.modifiers[key] !== undefined) {
          // Stack modifiers (multiply for multipliers, add for bonuses)
          if (key.includes('Bonus') || key.includes('bonus')) {
            gameState.synergy.modifiers[key] += value;
          } else if (key.includes('Multiplier') || key.includes('multiplier')) {
            gameState.synergy.modifiers[key] *= value;
          } else {
            gameState.synergy.modifiers[key] = value;
          }
        } else {
          gameState.synergy.modifiers[key] = value;
        }
      }
    }

    console.log('📊 Synergy modifiers applied:', gameState.synergy.modifiers);
  }

  /**
   * Get synergy info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Synergy information
   */
  getSynergyInfo(gameState) {
    if (!gameState.synergy) {
      return {
        activeSynergies: [],
        modifiers: {},
        count: 0
      };
    }

    return {
      activeSynergies: gameState.synergy.active.map(s => ({
        name: s.name,
        description: s.description
      })),
      modifiers: gameState.synergy.modifiers,
      count: gameState.synergy.active.length
    };
  }

  /**
   * Get available synergies (not yet active)
   * @param {Object} gameState - Centralized game state
   * @returns {Array} Available synergies
   */
  getAvailableSynergies(gameState) {
    if (!gameState.cards || !gameState.cards.hand) return [];

    const handCardTypes = gameState.cards.hand.map(card => card.type);
    const activeSynergyIds = gameState.synergy.active.map(s => s.id);

    const available = [];

    for (const synergy of this.synergyRegistry) {
      if (activeSynergyIds.includes(synergy.id)) continue;

      // Check how many required cards are in hand
      let matchCount = 0;
      for (const requiredCard of synergy.requiredCards) {
        if (handCardTypes.includes(requiredCard)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        available.push({
          synergy,
          progress: matchCount / synergy.requiredCards.length
        });
      }
    }

    return available;
  }

  /**
   * Get synergy by ID
   * @param {string} synergyId - Synergy ID
   * @returns {Object|null} Synergy definition
   */
  getSynergyById(synergyId) {
    return this.synergyRegistry.find(s => s.id === synergyId) || null;
  }

  /**
   * Get all synergies
   * @returns {Array} All synergy definitions
   */
  getAllSynergies() {
    return this.synergyRegistry;
  }

  /**
   * Add custom synergy (for extensions)
   * @param {Object} synergy - Synergy definition
   */
  addSynergy(synergy) {
    if (!synergy.id || !synergy.name || !synergy.requiredCards) {
      console.warn('⚠️ Invalid synergy definition');
      return;
    }

    this.synergyRegistry.push(synergy);
    console.log(`➕ Custom synergy added: ${synergy.name}`);
  }

  /**
   * Get modifier value
   * @param {Object} gameState - Centralized game state
   * @param {string} modifierKey - Modifier key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Modifier value
   */
  getModifier(gameState, modifierKey, defaultValue = null) {
    if (!gameState.synergy || !gameState.synergy.modifiers) {
      return defaultValue;
    }

    return gameState.synergy.modifiers[modifierKey] ?? defaultValue;
  }

  /**
   * Check if modifier is active
   * @param {Object} gameState - Centralized game state
   * @param {string} modifierKey - Modifier key
   * @returns {boolean} True if modifier exists
   */
  hasModifier(gameState, modifierKey) {
    if (!gameState.synergy || !gameState.synergy.modifiers) {
      return false;
    }

    return modifierKey in gameState.synergy.modifiers;
  }

  /**
   * Get synergy statistics
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Statistics
   */
  getStats(gameState) {
    const available = this.getAvailableSynergies(gameState);

    return {
      activeSynergyCount: gameState.synergy.active.length,
      availableSynergyCount: available.length,
      totalSynergyCount: this.synergyRegistry.length,
      modifierCount: Object.keys(gameState.synergy.modifiers).length,
      activeSynergies: gameState.synergy.active.map(s => s.name),
      availableSynergies: available.map(a => ({
        name: a.synergy.name,
        progress: (a.progress * 100).toFixed(0) + '%'
      }))
    };
  }
}
