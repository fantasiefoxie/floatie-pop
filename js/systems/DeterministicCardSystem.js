/**
 * DETERMINISTIC CARD SYSTEM - Generates gameplay cards after fixed floatie pops
 * 
 * Features:
 * - Generates cards every 5 floatie pops
 * - Deterministic card generation using runSeed
 * - Weighted rarity distribution (common 70%, rare 25%, legendary 5%)
 * - Event-driven card emission
 * - No automatic card effect execution
 * 
 * Lifecycle:
 * - init: Initialize seeded RNG using runSeed
 * - update: Not used (event-driven)
 * - onEvent: Handle floatiePopped events
 * 
 * Listens to:
 * - floatie:popped (from PopDetectionSystem)
 * 
 * Emits events:
 * - card:generated (card)
 * - card:ready (card)
 */

/**
 * Seeded Random Number Generator for deterministic card generation
 */
class CardRNG {
  constructor(seed) {
    this.seed = seed;
    this.state = seed;
  }

  /**
   * Generate next random number [0, 1)
   */
  next() {
    this.state = (this.state * 9301 + 49297) % 233280;
    return this.state / 233280;
  }

  /**
   * Select from weighted options
   * @param {Object} weights - { option: weight, ... }
   * @returns {string} Selected option
   */
  selectWeighted(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = this.next() * total;

    for (const [option, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return option;
      }
    }

    return Object.keys(weights)[0];
  }

  /**
   * Generate random integer in range [min, max)
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

export class DeterministicCardSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.rng = null;
    this.cardIdCounter = 0;

    // Card type definitions
    this.cardTypes = [
      'shuffleRow',
      'spawnFamily',
      'clearCluster',
      'magnetizeFamily',
      'doubleNextCombo'
    ];

    // Rarity weights
    this.rarityWeights = {
      common: 70,
      rare: 25,
      legendary: 5
    };

    // Card generation interval (every 5 pops)
    this.popInterval = 5;
  }

  /**
   * Initialize card system with seeded RNG
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    // Initialize with placeholder seed - will be set properly on game:start
    this.rng = new CardRNG(Date.now());
    this.cardIdCounter = 0;

    // Initialize cards structure if not present
    if (!gameState.cards) {
      gameState.cards = {
        popCounter: 0,
        deck: [],
        activeCards: []
      };
    }

    console.log(`✅ DeterministicCardSystem initialized (seed pending)`);
  }

  /**
   * Initialize RNG with proper runSeed
   * @param {Object} gameState - Centralized game state
   */
  initializeRNG(gameState) {
    const runSeed = gameState.runSeed || Date.now();
    this.rng = new CardRNG(runSeed);
    console.log(`🎲 DeterministicCardSystem RNG initialized (seed: ${runSeed})`);
  }

  /**
   * Update card system
   */
  update(deltaTime, gameState) {
    // Card system is event-driven, no continuous update needed
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState || gameState.paused || gameState.gameOver) return;

    if (eventName === 'game:start') {
      this.initializeRNG(gameState);
    } else if (eventName === 'floatie:popped') {
      this.handleFloatiePopped(data, gameState);
    }
  }

  /**
   * Handle floatie popped event
   * @param {Object} data - Event data {floatie, family, isRare, position}
   * @param {Object} gameState - Centralized game state
   */
  handleFloatiePopped(data, gameState) {
    // Increment pop counter
    gameState.cards.popCounter++;

    // Check if we should generate a card
    if (gameState.cards.popCounter % this.popInterval === 0) {
      this.generateCard(gameState);
    }
  }

  /**
   * Generate a new card using deterministic RNG
   * @param {Object} gameState - Centralized game state
   */
  generateCard(gameState) {
    // Select card type
    const typeIndex = this.rng.nextInt(0, this.cardTypes.length);
    const type = this.cardTypes[typeIndex];

    // Select rarity
    const rarity = this.rng.selectWeighted(this.rarityWeights);

    // Create card object
    const card = {
      id: `card-${this.cardIdCounter++}`,
      type,
      rarity
    };

    // Add to deck
    gameState.cards.deck.push(card);

    // Emit card generated event
    this.systemManager.emit('card:generated', card);

    // Emit card ready event for rendering/interaction
    this.systemManager.emit('card:ready', card);

    console.log(`🎴 Card Generated: ${card.type} (${card.rarity})`);
  }

  /**
   * Get card info
   * @param {Object} card - Card object
   * @returns {Object} Card info with description
   */
  getCardInfo(card) {
    const descriptions = {
      shuffleRow: 'Shuffle a row of floaties',
      spawnFamily: 'Spawn a family of floaties',
      clearCluster: 'Clear a cluster of floaties',
      magnetizeFamily: 'Magnetize a family together',
      doubleNextCombo: 'Double next combo multiplier'
    };

    return {
      id: card.id,
      type: card.type,
      rarity: card.rarity,
      description: descriptions[card.type] || 'Unknown card'
    };
  }

  /**
   * Get deck statistics
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Stats
   */
  getStats(gameState) {
    if (!gameState.cards) {
      return {
        popCounter: 0,
        deckSize: 0,
        activeCards: 0
      };
    }

    return {
      popCounter: gameState.cards.popCounter,
      deckSize: gameState.cards.deck.length,
      activeCards: gameState.cards.activeCards.length
    };
  }

  /**
   * Get next card from deck
   * @param {Object} gameState - Centralized game state
   * @returns {Object|null} Next card or null if deck is empty
   */
  getNextCard(gameState) {
    if (!gameState.cards || gameState.cards.deck.length === 0) {
      return null;
    }
    return gameState.cards.deck[0];
  }

  /**
   * Remove card from deck
   * @param {Object} gameState - Centralized game state
   * @param {string} cardId - Card ID to remove
   * @returns {Object|null} Removed card or null if not found
   */
  removeCard(gameState, cardId) {
    if (!gameState.cards) return null;

    const index = gameState.cards.deck.findIndex(c => c.id === cardId);
    if (index === -1) return null;

    const card = gameState.cards.deck[index];
    gameState.cards.deck.splice(index, 1);

    return card;
  }

  /**
   * Add card to active cards
   * @param {Object} gameState - Centralized game state
   * @param {Object} card - Card to activate
   */
  activateCard(gameState, card) {
    if (!gameState.cards) return;

    gameState.cards.activeCards.push(card);
    this.systemManager.emit('card:activated', card);
  }

  /**
   * Remove card from active cards
   * @param {Object} gameState - Centralized game state
   * @param {string} cardId - Card ID to deactivate
   */
  deactivateCard(gameState, cardId) {
    if (!gameState.cards) return;

    const index = gameState.cards.activeCards.findIndex(c => c.id === cardId);
    if (index === -1) return;

    const card = gameState.cards.activeCards[index];
    gameState.cards.activeCards.splice(index, 1);

    this.systemManager.emit('card:deactivated', card);
  }
}
