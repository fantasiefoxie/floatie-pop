// Import content definitions
import { FLOATIE_TYPES, CARD_TYPES, RARITY_WEIGHTS, GAMEPLAY_CONSTANTS } from '../content.js';

export class ContentSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.gameState = null;
  }

  init(gameState) {
    this.gameState = gameState;
    gameState.content = {
      floaties: FLOATIE_TYPES,
      cards: CARD_TYPES,
      rarities: RARITY_WEIGHTS,
      constants: GAMEPLAY_CONSTANTS
    };
    console.log('✅ ContentSystem initialized');
  }

  update(deltaTime, gameState) {
    // Content system is static, no updates needed
  }

  render(gameState) {
    // Content system doesn't render
  }

  getFloatieDefinition(type) {
    if (!this.gameState || !this.gameState.content) return null;
    return this.gameState.content.floaties[type];
  }

  getCardDefinition(type) {
    if (!this.gameState || !this.gameState.content) return null;
    return this.gameState.content.cards[type];
  }

  getConstant(key) {
    if (!this.gameState || !this.gameState.content) return null;
    return this.gameState.content.constants[key];
  }

  getAllFloatieTypes() {
    if (!this.gameState || !this.gameState.content) return [];
    return Object.keys(this.gameState.content.floaties);
  }

  getAllCardTypes() {
    if (!this.gameState || !this.gameState.content) return [];
    return Object.keys(this.gameState.content.cards);
  }

  getFloatiesByRarity(rarity) {
    if (!this.gameState || !this.gameState.content) return [];
    return Object.entries(this.gameState.content.floaties)
      .filter(([_, def]) => def.rarity === rarity)
      .map(([type, _]) => type);
  }

  getCardsByRarity(rarity) {
    if (!this.gameState || !this.gameState.content) return [];
    return Object.entries(this.gameState.content.cards)
      .filter(([_, def]) => def.rarity === rarity)
      .map(([type, _]) => type);
  }
}
