/**
 * CARD EXECUTION SYSTEM - Executes card effects on the board
 * 
 * Features:
 * - Moves generated cards from deck to hand
 * - Executes card effects when activated
 * - Modifies gameState only (no direct rendering)
 * - Event-driven card activation
 * 
 * Lifecycle:
 * - init: Initialize system
 * - update: Not used (event-driven)
 * - onEvent: Handle cardGenerated and cardActivated events
 * 
 * Listens to:
 * - card:generated (from DeterministicCardSystem)
 * - card:activated (from UI/player interaction)
 * 
 * Emits events:
 * - card:addedToHand (card)
 * - board:shuffled (affectedFloaties)
 * - cluster:cleared (clearedFloaties, position)
 * - family:spawned (spawnedFloaties, family)
 * - magnet:triggered (affectedFloaties, family)
 * - combo:modifierApplied (multiplier)
 */

export class CardExecutionSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.comboModifier = 1; // Multiplier for next combo
    this.floatieFamilies = ['jelly', 'coral', 'pearl', 'star', 'rainbow', 'bomb'];
    this.maxHandSize = 3; // Maximum cards in hand
  }

  /**
   * Initialize card execution system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    if (!gameState.cards) {
      gameState.cards = {
        popCounter: 0,
        deck: [],
        activeCards: [],
        hand: []
      };
    }
    this.comboModifier = 1;
    console.log('✅ CardExecutionSystem initialized');
  }

  /**
   * Update card execution system
   */
  update(deltaTime, gameState) {
    // Card execution system is event-driven, no continuous update needed
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState || gameState.paused || gameState.gameOver) return;

    if (eventName === 'card:generated') {
      this.handleCardGenerated(data, gameState);
    } else if (eventName === 'card:activated') {
      this.handleCardActivated(data, gameState);
    }
  }

  /**
   * Handle card generated event - move from deck to hand
   * @param {Object} card - Generated card
   * @param {Object} gameState - Centralized game state
   */
  handleCardGenerated(card, gameState) {
    // Check hand size limit
    if (gameState.cards.hand.length >= this.maxHandSize) {
      console.log(`📋 Hand full (${this.maxHandSize}), discarding card: ${card.type}`);
      // Remove from deck (card is discarded)
      const deckIndex = gameState.cards.deck.findIndex(c => c.id === card.id);
      if (deckIndex !== -1) {
        gameState.cards.deck.splice(deckIndex, 1);
      }
      return;
    }

    // Remove from deck
    const deckIndex = gameState.cards.deck.findIndex(c => c.id === card.id);
    if (deckIndex !== -1) {
      gameState.cards.deck.splice(deckIndex, 1);
    }

    // Add to hand
    gameState.cards.hand.push(card);

    // Emit card added to hand event
    this.systemManager.emit('card:addedToHand', card);

    console.log(`🎴 Card added to hand: ${card.type} (${card.rarity})`);
  }

  /**
   * Handle card activated event - execute card effect
   * @param {Object} data - Event data {cardId, ...effectData}
   * @param {Object} gameState - Centralized game state
   */
  handleCardActivated(data, gameState) {
    const { cardId } = data;

    // Find card in hand
    const cardIndex = gameState.cards.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      console.warn(`⚠️ Card not found in hand: ${cardId}`);
      return;
    }

    const card = gameState.cards.hand[cardIndex];

    // Execute card effect based on type
    switch (card.type) {
      case 'shuffleRow':
        this.executeShuffleRow(data, gameState);
        break;
      case 'spawnFamily':
        this.executeSpawnFamily(data, gameState);
        break;
      case 'clearCluster':
        this.executeClearCluster(data, gameState);
        break;
      case 'magnetizeFamily':
        this.executeMagnetizeFamily(data, gameState);
        break;
      case 'doubleNextCombo':
        this.executeDoubleNextCombo(data, gameState);
        break;
      default:
        console.warn(`⚠️ Unknown card type: ${card.type}`);
        return;
    }

    // Remove card from hand after use
    gameState.cards.hand.splice(cardIndex, 1);

    console.log(`🎴 Card used: ${card.type}`);
  }

  /**
   * Execute shuffleRow effect - randomly reorder floaties in a horizontal band
   * @param {Object} data - Effect data {bandY, bandHeight}
   * @param {Object} gameState - Centralized game state
   */
  executeShuffleRow(data, gameState) {
    const { bandY = gameState.floats.length > 0 ? gameState.floats[0].y : 0, bandHeight = 100 } = data;

    // Find floaties in the band
    const floatiesInBand = gameState.floats.filter(f => 
      f.isActive && Math.abs(f.y - bandY) < bandHeight / 2
    );

    if (floatiesInBand.length === 0) {
      console.log('📊 No floaties in band to shuffle');
      return;
    }

    // Shuffle positions within the band
    const positions = floatiesInBand.map(f => ({ x: f.x, y: f.y }));
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Apply shuffled positions
    floatiesInBand.forEach((f, i) => {
      f.x = positions[i].x;
      f.y = positions[i].y;
    });

    // Emit event
    this.systemManager.emit('board:shuffled', {
      affectedFloaties: floatiesInBand.map(f => f.id),
      bandY,
      bandHeight
    });

    console.log(`📊 Shuffled ${floatiesInBand.length} floaties`);
  }

  /**
   * Execute spawnFamily effect - spawn 5 floaties of a chosen family
   * @param {Object} data - Effect data {family}
   * @param {Object} gameState - Centralized game state
   */
  executeSpawnFamily(data, gameState) {
    const { family = this.floatieFamilies[Math.floor(Math.random() * this.floatieFamilies.length)] } = data;
    const spawnCount = 5;
    const playArea = document.getElementById('playArea');

    if (!playArea) {
      console.warn('⚠️ PlayArea not found');
      return;
    }

    const spawnedFloaties = [];
    const width = playArea.clientWidth;
    const height = playArea.clientHeight;
    const padding = 40;

    for (let i = 0; i < spawnCount; i++) {
      const x = Math.random() * (width - 2 * padding) + padding;
      const y = Math.random() * (height - 2 * padding) + padding;

      // Check if position is valid (not colliding)
      const isValid = !gameState.floats.some(f => 
        f.isActive && Math.sqrt(Math.pow(x - f.x, 2) + Math.pow(y - f.y, 2)) < 60
      );

      if (!isValid) continue;

      // Create floatie
      const floatie = {
        id: `floatie-spawned-${Date.now()}-${i}`,
        family,
        type: family,
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: 20,
        visualRadius: 20,
        interactionRadius: 30,
        isRare: false,
        isActive: true,
        el: null
      };

      // Create DOM element
      const el = document.createElement('div');
      el.className = `float floatie-${family}`;
      el.id = floatie.id;
      el.textContent = this.getFamilyEmoji(family);
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
      `;

      playArea.appendChild(el);
      floatie.el = el;

      gameState.floats.push(floatie);
      spawnedFloaties.push(floatie.id);
    }

    // Emit event
    this.systemManager.emit('family:spawned', {
      spawnedFloaties,
      family,
      count: spawnedFloaties.length
    });

    console.log(`🌊 Spawned ${spawnedFloaties.length} floaties of family: ${family}`);
  }

  /**
   * Execute clearCluster effect - remove floaties within a radius
   * @param {Object} data - Effect data {position: {x, y}, radius}
   * @param {Object} gameState - Centralized game state
   */
  executeClearCluster(data, gameState) {
    const { position = { x: gameState.floats[0]?.x || 0, y: gameState.floats[0]?.y || 0 }, radius = 100 } = data;

    // Find floaties within radius
    const floatiesInCluster = gameState.floats.filter(f => {
      if (!f.isActive) return false;
      const distance = Math.sqrt(
        Math.pow(f.x - position.x, 2) +
        Math.pow(f.y - position.y, 2)
      );
      return distance < radius;
    });

    if (floatiesInCluster.length === 0) {
      console.log('🎯 No floaties in cluster');
      return;
    }

    // Mark floaties as inactive and remove from DOM
    const clearedIds = [];
    floatiesInCluster.forEach(f => {
      f.isActive = false;
      if (f.el) {
        f.el.remove();
      }
      clearedIds.push(f.id);
    });

    // Remove from floats array
    gameState.floats = gameState.floats.filter(f => f.isActive);

    // Emit event
    this.systemManager.emit('cluster:cleared', {
      clearedFloaties: clearedIds,
      position,
      radius,
      count: clearedIds.length
    });

    console.log(`🎯 Cleared ${clearedIds.length} floaties in cluster`);
  }

  /**
   * Execute magnetizeFamily effect - pull all floaties of same family toward center
   * @param {Object} data - Effect data {family}
   * @param {Object} gameState - Centralized game state
   */
  executeMagnetizeFamily(data, gameState) {
    const { family = this.floatieFamilies[Math.floor(Math.random() * this.floatieFamilies.length)] } = data;
    const playArea = document.getElementById('playArea');

    if (!playArea) {
      console.warn('⚠️ PlayArea not found');
      return;
    }

    // Find floaties of the family
    const floatiesOfFamily = gameState.floats.filter(f => 
      f.isActive && f.family === family
    );

    if (floatiesOfFamily.length === 0) {
      console.log(`🧲 No floaties of family: ${family}`);
      return;
    }

    // Calculate center of play area
    const centerX = playArea.clientWidth / 2;
    const centerY = playArea.clientHeight / 2;

    // Pull floaties toward center
    const magnetStrength = 0.3; // Fraction of distance to move per frame
    floatiesOfFamily.forEach(f => {
      const dx = centerX - f.x;
      const dy = centerY - f.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        f.vx = (dx / distance) * 5; // Move toward center
        f.vy = (dy / distance) * 5;
      }
    });

    // Emit event
    this.systemManager.emit('magnet:triggered', {
      affectedFloaties: floatiesOfFamily.map(f => f.id),
      family,
      count: floatiesOfFamily.length
    });

    console.log(`🧲 Magnetized ${floatiesOfFamily.length} floaties of family: ${family}`);
  }

  /**
   * Execute doubleNextCombo effect - double next combo multiplier
   * @param {Object} data - Effect data
   * @param {Object} gameState - Centralized game state
   */
  executeDoubleNextCombo(data, gameState) {
    // Apply combo modifier
    this.comboModifier = 2;

    // Store modifier in gameState for next combo calculation
    if (!gameState.cardModifiers) {
      gameState.cardModifiers = {};
    }
    gameState.cardModifiers.comboMultiplier = 2;

    // Emit event
    this.systemManager.emit('combo:modifierApplied', {
      modifier: 2,
      type: 'doubleNextCombo'
    });

    console.log(`⚡ Next combo multiplier doubled!`);
  }

  /**
   * Get family emoji
   * @param {string} family - Family name
   * @returns {string} Emoji
   */
  getFamilyEmoji(family) {
    const emojis = {
      jelly: '🪼',
      coral: '🪸',
      pearl: '🦪',
      star: '⭐',
      rainbow: '🌈',
      bomb: '💣'
    };
    return emojis[family] || '🪼';
  }

  /**
   * Get card execution info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Execution info
   */
  getExecutionInfo(gameState) {
    if (!gameState.cards) {
      return {
        handSize: 0,
        comboModifier: 1
      };
    }

    return {
      handSize: gameState.cards.hand.length,
      hand: gameState.cards.hand,
      comboModifier: this.comboModifier
    };
  }
}
