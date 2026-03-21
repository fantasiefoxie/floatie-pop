/**
 * INPUT SYSTEM - Mobile-First Input Handler with Swipe Chain Detection
 * 
 * Features:
 * - Pointer events (pointerdown, pointermove, pointerup)
 * - Tap detection on floaties
 * - Swipe chain detection for adjacent floaties of same family
 * - 48px minimum touch target size
 * - Mobile-optimized (one thumb on portrait screens)
 * 
 * Lifecycle:
 * - init: Set up event listeners
 * - update: Process input state and detect chains
 * - onEvent: Handle system events
 * 
 * Emits events:
 * - floatie:tap (floatie, x, y)
 * - chain:pop (chainSelection, family)
 * - input:pointerdown (x, y)
 * - input:pointerup (x, y)
 * - input:pointermove (x, y)
 */

export class InputSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.playArea = null;

    // Input state
    this.isPointerDown = false;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    // Chain detection
    this.chainSelection = [];
    this.activeFamily = null;
    this.lastTappedFloatie = null;
    this.minTouchSize = 48; // pixels
    this.chainDistance = 80; // max distance between chain floaties

    // Card click detection
    this.cardArea = {
      x: 0,
      y: 0,
      width: 70,
      height: 100,
      spacing: 10
    };
  }

  /**
   * Initialize input system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    this.playArea = document.getElementById('playArea');

    if (!this.playArea) {
      console.warn('⚠️ PlayArea element not found');
      return;
    }

    // Initialize input lock state
    if (!gameState.input) {
      gameState.input = {
        pointerDown: false,
        pointerPosition: { x: 0, y: 0 },
        chainSelection: [],
        activeFamily: null,
        locked: false
      };
    } else {
      gameState.input.locked = false;
    }

    // Prevent default touch behaviors
    this.playArea.style.touchAction = 'none';

    // Pointer events
    this.playArea.addEventListener('pointerdown', (e) => this.handlePointerDown(e, gameState), { passive: false });
    this.playArea.addEventListener('pointerup', (e) => this.handlePointerUp(e, gameState), { passive: false });
    this.playArea.addEventListener('pointermove', (e) => this.handlePointerMove(e, gameState), { passive: false });
    this.playArea.addEventListener('pointercancel', (e) => this.handlePointerCancel(e, gameState), { passive: false });

    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e, gameState));

    console.log('✅ InputSystem initialized (mobile-first with swipe chains)');
  }

  /**
   * Handle pointer down - start chain or tap
   */
  handlePointerDown(e, gameState) {
    // Check input lock
    if (gameState.input.locked) {
      console.log('🔒 Input locked - ignoring pointer down');
      return;
    }

    if (gameState.paused || gameState.gameOver) return;

    e.preventDefault();

    this.isPointerDown = true;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    // Reset chain on new pointer down
    this.chainSelection = [];
    this.activeFamily = null;
    this.lastTappedFloatie = null;

    // Update gameState
    gameState.input.pointerDown = true;
    gameState.input.pointerPosition = { x: e.clientX, y: e.clientY };
    gameState.input.chainSelection = [];
    gameState.input.activeFamily = null;

    // Emit input event
    this.systemManager.emit('input:pointerdown', {
      x: e.clientX,
      y: e.clientY,
      target: e.target
    });

    // Check if pointer is over a floatie
    const floatie = this.getFloatieAtPoint(e.clientX, e.clientY, gameState);
    if (floatie) {
      this.startChain(floatie, gameState);
    }
  }

  /**
   * Handle pointer move - extend chain
   */
  handlePointerMove(e, gameState) {
    // Check input lock
    if (gameState.input.locked) return;

    if (!this.isPointerDown || gameState.paused || gameState.gameOver) return;

    e.preventDefault();

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    // Update gameState
    gameState.input.pointerPosition = { x: e.clientX, y: e.clientY };

    // Emit input event
    this.systemManager.emit('input:pointermove', {
      x: e.clientX,
      y: e.clientY
    });

    // If we have an active chain, try to extend it
    if (this.activeFamily && this.chainSelection.length > 0) {
      this.extendChain(e.clientX, e.clientY, gameState);
    }
  }

  /**
   * Handle pointer up - finalize chain or tap
   */
  handlePointerUp(e, gameState) {
    if (!this.isPointerDown) return;

    e.preventDefault();

    this.isPointerDown = false;

    // Update gameState
    gameState.input.pointerDown = false;

    // Emit input event
    this.systemManager.emit('input:pointerup', {
      x: e.clientX,
      y: e.clientY
    });

    // Check for card click first (cards are at bottom of screen)
    if (this.checkCardClick(e.clientX, e.clientY, gameState)) {
      // Card was clicked, don't process floatie chain
      this.chainSelection = [];
      this.activeFamily = null;
      this.lastTappedFloatie = null;
      gameState.input.chainSelection = [];
      gameState.input.activeFamily = null;
      this.clearChainVisuals();
      return;
    }

    // Process chain if we have one
    if (this.chainSelection.length >= 2) {
      this.systemManager.emit('chain:pop', {
        chainSelection: [...this.chainSelection],
        family: this.activeFamily
      });
    }

    // Reset chain
    this.chainSelection = [];
    this.activeFamily = null;
    this.lastTappedFloatie = null;
    gameState.input.chainSelection = [];
    gameState.input.activeFamily = null;
    this.clearChainVisuals();
  }

  /**
   * Check if pointer up was on a card
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} gameState - Centralized game state
   * @returns {boolean} True if card was clicked
   */
  checkCardClick(x, y, gameState) {
    if (!gameState.cards || !gameState.cards.hand || gameState.cards.hand.length === 0) {
      return false;
    }

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return false;

    const rect = canvas.getBoundingClientRect();
    const clickX = x - rect.left;
    const clickY = y - rect.top;

    // Card area is at bottom of canvas
    const cardWidth = 70;
    const cardHeight = 100;
    const spacing = 10;
    const cards = gameState.cards.hand;
    const totalWidth = cards.length * (cardWidth + spacing) - spacing;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = canvas.height - cardHeight - 20;

    // Check if click is in card area (bottom of screen)
    if (clickY < startY || clickY > startY + cardHeight) {
      return false;
    }

    // Check which card was clicked
    for (let i = 0; i < cards.length; i++) {
      const cardX = startX + i * (cardWidth + spacing);
      if (clickX >= cardX && clickX <= cardX + cardWidth) {
        // Card clicked!
        const card = cards[i];
        console.log(`🎴 Card clicked: ${card.type} (${card.rarity})`);
        this.systemManager.emit('card:activated', { cardId: card.id, index: i });
        return true;
      }
    }

    return false;
  }

  /**
   * Handle pointer cancel - abort chain
   */
  handlePointerCancel(e, gameState) {
    this.isPointerDown = false;
    this.chainSelection = [];
    this.activeFamily = null;
    this.lastTappedFloatie = null;
    gameState.input.pointerDown = false;
    gameState.input.chainSelection = [];
    gameState.input.activeFamily = null;
  }

  /**
   * Handle keyboard down
   */
  handleKeyDown(e, gameState) {
    if (e.key === 'Enter' && e.shiftKey && gameState.gameMode === 'classic' && !gameState.gameOver) {
      this.systemManager.emit('game:endgame', {});
    }
  }

  /**
   * Start a new chain with a floatie
   */
  startChain(floatie, gameState) {
    if (!floatie || !floatie.isActive) return;

    this.chainSelection = [floatie];
    this.activeFamily = floatie.family || floatie.type;
    this.lastTappedFloatie = floatie;

    // Update gameState
    gameState.input.chainSelection = [floatie];
    gameState.input.activeFamily = this.activeFamily;

    // Add visual indicator
    this.updateChainVisuals();

    // Emit tap event
    this.systemManager.emit('floatie:tap', {
      floatie,
      x: this.lastPointerX,
      y: this.lastPointerY
    });
  }

  /**
   * Extend chain by detecting adjacent floaties
   */
  extendChain(x, y, gameState) {
    // Find floatie at current pointer position
    const floatie = this.getFloatieAtPoint(x, y, gameState);

    if (!floatie || !floatie.isActive) return;

    // Check if floatie is already in chain
    if (this.chainSelection.includes(floatie)) return;

    // Check if floatie is same family
    const floatieFamily = floatie.family || floatie.type;
    if (floatieFamily !== this.activeFamily) return;

    // Check if floatie is adjacent to last tapped floatie
    if (this.lastTappedFloatie) {
      const distance = this.getDistance(
        this.lastTappedFloatie.el.getBoundingClientRect(),
        floatie.el.getBoundingClientRect()
      );

      if (distance > this.chainDistance) return;
    }

    // Add to chain
    this.chainSelection.push(floatie);
    this.lastTappedFloatie = floatie;

    // Update gameState
    gameState.input.chainSelection = [...this.chainSelection];

    // Update visual indicators
    this.updateChainVisuals();

    // Emit chain extended event
    this.systemManager.emit('chain:extended', {
      chainSelection: [...this.chainSelection],
      family: this.activeFamily,
      length: this.chainSelection.length
    });
  }

  /**
   * Update visual indicators for chain selection
   */
  updateChainVisuals() {
    // Remove chain-selected class from all floaties
    document.querySelectorAll('.float.chain-selected').forEach(el => {
      el.classList.remove('chain-selected');
    });

    // Add chain-selected class to current chain floaties
    for (const floatie of this.chainSelection) {
      if (floatie && floatie.el) {
        floatie.el.classList.add('chain-selected');
      }
    }
  }

  /**
   * Clear chain visuals
   */
  clearChainVisuals() {
    document.querySelectorAll('.float.chain-selected').forEach(el => {
      el.classList.remove('chain-selected');
    });
  }

  /**
   * Get floatie at point with 48px minimum touch target
   */
  getFloatieAtPoint(x, y, gameState) {
    let closestFloatie = null;
    let closestDistance = Infinity;
    const maxDetectionDistance = 60; // Increased hitbox radius

    for (const floatie of gameState.floats) {
      if (!floatie.isActive || !floatie.el) continue;

      const rect = floatie.el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) +
        Math.pow(y - centerY, 2)
      );

      // Use larger interaction radius for better hit detection
      const interactionRadius = Math.max(
        floatie.interactionRadius || 40,
        this.minTouchSize / 2,
        30
      );

      if (distance <= interactionRadius && distance < closestDistance) {
        closestFloatie = floatie;
        closestDistance = distance;
      }
    }

    return closestFloatie;
  }

  /**
   * Calculate distance between two rectangles (center to center)
   */
  getDistance(rect1, rect2) {
    const x1 = rect1.left + rect1.width / 2;
    const y1 = rect1.top + rect1.height / 2;
    const x2 = rect2.left + rect2.width / 2;
    const y2 = rect2.top + rect2.height / 2;

    return Math.sqrt(
      Math.pow(x2 - x1, 2) +
      Math.pow(y2 - y1, 2)
    );
  }

  /**
   * Update input system
   */
  update(deltaTime, gameState) {
    // Input system is event-driven, no continuous update needed
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    // Input system can listen to other events if needed
  }
}
