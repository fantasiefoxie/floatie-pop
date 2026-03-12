import { runManager } from './runManager.js';
import { CARD_TYPES, cardInventory, getRandomCardType } from './cardSystem.js';
import { state } from './state.js';

// Shop configuration
const SHOP_CONFIG = {
  // Card pricing by rarity
  cardPrices: {
    common: 100,
    uncommon: 200,
    rare: 350,
    epic: 500
  },
  
  // Shop appearance settings
  cardsOffered: 3,
  refreshCost: 50, // Cost to refresh shop
  
  // Discount system
  discounts: {
    levelMultiple5: 0.1, // 10% discount every 5 levels
    highScore: 0.05, // 5% discount for high scores
    maxDiscount: 0.3 // Maximum 30% discount
  }
};

export class ShopSystem {
  constructor() {
    this.currentOffers = [];
    this.shopSeed = 0;
    this.isOpen = false;
    this.refreshCount = 0;
  }

  // Generate deterministic shop seed
  generateShopSeed(runSeed, level, refreshCount = 0) {
    // Combine run seed, level, and refresh count for deterministic but varied shops
    return (runSeed * 73 + level * 41 + refreshCount * 23) % 1000000;
  }

  // Seeded random number generator
  seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Open shop between levels
  openShop(runSeed, level) {
    this.shopSeed = this.generateShopSeed(runSeed, level, this.refreshCount);
    this.currentOffers = this.generateOffers(this.shopSeed, level);
    this.isOpen = true;
    
    this.showShopUI();
    return this.currentOffers;
  }

  // Generate card offers for shop
  generateOffers(seed, level) {
    const offers = [];
    let currentSeed = seed;
    
    for (let i = 0; i < SHOP_CONFIG.cardsOffered; i++) {
      currentSeed = (currentSeed * 31 + 17) % 1000000;
      
      // Generate card type using seeded random
      const rng = () => {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        return currentSeed / 233280;
      };
      
      const cardType = getRandomCardType(rng);
      const card = CARD_TYPES[cardType];
      
      if (card) {
        const basePrice = SHOP_CONFIG.cardPrices[card.rarity];
        const discount = this.calculateDiscount(level);
        const finalPrice = Math.floor(basePrice * (1 - discount));
        
        offers.push({
          cardType: cardType,
          card: card,
          basePrice: basePrice,
          discount: discount,
          finalPrice: finalPrice,
          id: i
        });
      }
    }
    
    return offers;
  }

  // Calculate discount based on level and performance
  calculateDiscount(level) {
    let totalDiscount = 0;
    
    // Level-based discount (every 5 levels)
    const levelDiscount = Math.floor(level / 5) * SHOP_CONFIG.discounts.levelMultiple5;
    totalDiscount += levelDiscount;
    
    // High score discount
    if (state.score > 5000) {
      totalDiscount += SHOP_CONFIG.discounts.highScore;
    }
    
    return Math.min(totalDiscount, SHOP_CONFIG.discounts.maxDiscount);
  }

  // Purchase card
  purchaseCard(offerId) {
    const offer = this.currentOffers.find(o => o.id === offerId);
    if (!offer) return { success: false, message: "Card not found" };
    
    const runState = runManager.getCurrentRun();
    if (runState.runScore < offer.finalPrice) {
      return { success: false, message: "Insufficient score" };
    }
    
    // Deduct score
    runState.runScore -= offer.finalPrice;
    state.score = runState.runScore; // Update display score
    
    // Add card to inventory
    cardInventory.addCard(offer.cardType);
    runState.cardsOwned.push({
      type: offer.cardType,
      name: offer.card.name,
      description: offer.card.description,
      rarity: offer.card.rarity
    });
    
    // Remove from offers
    this.currentOffers = this.currentOffers.filter(o => o.id !== offerId);
    
    this.updateShopUI();
    
    return { 
      success: true, 
      message: `Purchased ${offer.card.name}!`,
      card: offer.card
    };
  }

  // Refresh shop offers
  refreshShop() {
    const runState = runManager.getCurrentRun();
    const refreshCost = SHOP_CONFIG.refreshCost;
    
    if (runState.runScore < refreshCost) {
      return { success: false, message: "Insufficient score for refresh" };
    }
    
    // Deduct refresh cost
    runState.runScore -= refreshCost;
    state.score = runState.runScore;
    
    // Generate new offers
    this.refreshCount++;
    this.shopSeed = this.generateShopSeed(runState.runSeed, runState.level, this.refreshCount);
    this.currentOffers = this.generateOffers(this.shopSeed, runState.level);
    
    this.updateShopUI();
    
    return { success: true, message: "Shop refreshed!" };
  }

  // Close shop and continue to next level
  closeShop() {
    this.isOpen = false;
    this.refreshCount = 0;
    this.hideShopUI();
    
    // Continue to next level
    this.continueRun();
  }

  // Continue run after shop
  continueRun() {
    // Award any remaining level cards (since shop replaces normal card awards)
    const runState = runManager.getCurrentRun();
    
    // Generate new board for this level
    const playArea = document.getElementById('playArea');
    if (playArea) {
      import('./boardGenerator.js').then(boardModule => {
        const board = boardModule.generateBoard(runState.runSeed, runState.level, playArea);
        
        import('./game.js').then(gameModule => {
          const popFloat = window.popFloatHandler;
          if (popFloat) {
            gameModule.spawnFromBoard(playArea, popFloat, board.floaties);
          }
        });
      });
    }
    
    // Show level start notification
    this.showLevelContinueNotification();
  }

  // Show shop UI
  showShopUI() {
    const shopEl = this.createShopElement();
    document.body.appendChild(shopEl);
    
    // Pause game
    state.paused = true;
  }

  // Create shop UI element
  createShopElement() {
    const runState = runManager.getCurrentRun();
    
    const shopEl = document.createElement('div');
    shopEl.id = 'shopPanel';
    shopEl.className = 'shop-panel';
    
    shopEl.innerHTML = `
      <div class="shop-header">
        <h2>🛒 Card Shop - Level ${runState.level}</h2>
        <div class="shop-score">Score: ${runState.runScore}</div>
      </div>
      
      <div class="shop-cards">
        ${this.currentOffers.map(offer => this.createCardHTML(offer)).join('')}
      </div>
      
      <div class="shop-actions">
        <button id="refreshShop" class="shop-btn refresh-btn">
          🔄 Refresh (${SHOP_CONFIG.refreshCost} score)
        </button>
        <button id="skipShop" class="shop-btn skip-btn">
          ⏭️ Skip Shop
        </button>
      </div>
    `;
    
    // Add event listeners
    this.attachShopEventListeners(shopEl);
    
    return shopEl;
  }

  // Create individual card HTML
  createCardHTML(offer) {
    const canAfford = runManager.getCurrentRun().runScore >= offer.finalPrice;
    const discountText = offer.discount > 0 ? `<span class="discount">-${Math.round(offer.discount * 100)}%</span>` : '';
    
    return `
      <div class="shop-card ${offer.card.rarity} ${canAfford ? 'affordable' : 'expensive'}">
        <div class="card-header">
          <h3>${offer.card.name}</h3>
          <div class="card-rarity">${offer.card.rarity}</div>
        </div>
        
        <div class="card-description">
          ${offer.card.description}
        </div>
        
        <div class="card-price">
          ${offer.discount > 0 ? `<span class="original-price">${offer.basePrice}</span>` : ''}
          <span class="final-price">${offer.finalPrice}</span>
          ${discountText}
        </div>
        
        <button class="buy-btn ${canAfford ? '' : 'disabled'}" 
                data-offer-id="${offer.id}" 
                ${canAfford ? '' : 'disabled'}>
          ${canAfford ? '💰 Buy' : '❌ Too Expensive'}
        </button>
      </div>
    `;
  }

  // Attach event listeners to shop
  attachShopEventListeners(shopEl) {
    // Buy buttons
    shopEl.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const offerId = parseInt(e.target.dataset.offerId);
        const result = this.purchaseCard(offerId);
        this.showShopMessage(result.message, result.success ? 'success' : 'error');
      });
    });
    
    // Refresh button
    shopEl.querySelector('#refreshShop').addEventListener('click', () => {
      const result = this.refreshShop();
      this.showShopMessage(result.message, result.success ? 'success' : 'error');
    });
    
    // Skip button
    shopEl.querySelector('#skipShop').addEventListener('click', () => {
      this.closeShop();
    });
  }

  // Update shop UI after purchase/refresh
  updateShopUI() {
    const shopEl = document.getElementById('shopPanel');
    if (shopEl) {
      const runState = runManager.getCurrentRun();
      
      // Update score display
      shopEl.querySelector('.shop-score').textContent = `Score: ${runState.runScore}`;
      
      // Update cards
      shopEl.querySelector('.shop-cards').innerHTML = 
        this.currentOffers.map(offer => this.createCardHTML(offer)).join('');
      
      // Reattach event listeners to new elements
      this.attachShopEventListeners(shopEl);
    }
  }

  // Hide shop UI
  hideShopUI() {
    const shopEl = document.getElementById('shopPanel');
    if (shopEl) {
      shopEl.remove();
    }
    
    // Resume game
    state.paused = false;
  }

  // Show shop message
  showShopMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `shop-message ${type}`;
    messageEl.textContent = message;
    
    const shopEl = document.getElementById('shopPanel');
    if (shopEl) {
      shopEl.appendChild(messageEl);
      
      setTimeout(() => {
        messageEl.remove();
      }, 2000);
    }
  }

  // Show level continue notification
  showLevelContinueNotification() {
    const runState = runManager.getCurrentRun();
    const notification = document.createElement('div');
    notification.className = 'run-notification level-continue';
    notification.innerHTML = `
      🚀 Level ${runState.level} Continue!<br>
      Cards Active: ${runState.cardsOwned.length}<br>
      Score: ${runState.runScore}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // Check if shop should appear
  shouldShowShop(level) {
    // Show shop every level after level 1
    return level > 1;
  }

  // Get current offers
  getCurrentOffers() {
    return this.currentOffers;
  }

  // Check if shop is open
  isShopOpen() {
    return this.isOpen;
  }
}

// Global shop system instance
export const shopSystem = new ShopSystem();