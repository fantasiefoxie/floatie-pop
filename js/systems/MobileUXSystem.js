/**
 * MOBILE UX SYSTEM - Optimizes game for mobile devices
 * 
 * Features:
 * - Mobile device detection
 * - Thumb-friendly touch interaction
 * - Haptic feedback for events
 * - Portrait orientation optimization
 * - Swipe gesture chain detection
 * - Touch radius optimization
 * 
 * Lifecycle:
 * - init: Detect mobile, set up touch handlers
 * - update: Track swipe gestures
 * - onEvent: Handle haptic feedback events
 * 
 * Listens to:
 * - floatie:popped (for haptic feedback)
 * - combo:milestoneSmall (for haptic feedback)
 * - combo:milestoneLarge (for haptic feedback)
 * 
 * Emits events:
 * - mobile:initialized (isMobile, touchRadius)
 * - swipe:chain (floatieIds, family)
 */

export class MobileUXSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.isMobile = false;
    this.touchRadius = 48;
    this.vibrationEnabled = true;
    this.swipeChain = [];
    this.swipeFamily = null;
    this.isSwiping = false;
  }

  /**
   * Initialize mobile UX system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    // Detect mobile device
    this.detectMobile();

    // Initialize mobile state
    if (!gameState.mobile) {
      gameState.mobile = {
        isMobile: this.isMobile,
        touchRadius: this.touchRadius,
        vibrationEnabled: this.vibrationEnabled
      };
    } else {
      gameState.mobile.isMobile = this.isMobile;
      gameState.mobile.touchRadius = this.touchRadius;
      gameState.mobile.vibrationEnabled = this.vibrationEnabled;
    }

    // Set up touch handlers if mobile
    if (this.isMobile) {
      this.setupTouchHandlers();
      this.enforcePortraitOrientation();
    }

    // Emit initialization event
    this.systemManager.emit('mobile:initialized', {
      isMobile: this.isMobile,
      touchRadius: this.touchRadius,
      vibrationEnabled: this.vibrationEnabled
    });

    console.log(`📱 MobileUXSystem initialized (Mobile: ${this.isMobile})`);
  }

  /**
   * Update mobile UX system
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    // Mobile UX updates handled by event listeners
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    const gameState = this.systemManager.gameState;
    if (!gameState || !gameState.mobile.vibrationEnabled) return;

    if (eventName === 'floatie:popped') {
      this.triggerHaptic(10);
    } else if (eventName === 'combo:milestoneSmall') {
      this.triggerHaptic(20);
    } else if (eventName === 'combo:milestoneLarge') {
      // Use sequential vibrations instead of pattern array for better browser support
      this.triggerHaptic(30);
      setTimeout(() => this.triggerHaptic(40), 35);
      setTimeout(() => this.triggerHaptic(30), 80);
    }
  }

  /**
   * Detect if device is mobile
   */
  detectMobile() {
    // Check user agent
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());

    // Check screen width
    const isMobileWidth = window.innerWidth < 768;

    // Check touch support
    const hasTouchSupport = () => {
      return (('ontouchstart' in window) ||
              (navigator.maxTouchPoints > 0) ||
              (navigator.msMaxTouchPoints > 0));
    };

    this.isMobile = isMobileUA || isMobileWidth || hasTouchSupport();

    // Increase touch radius on mobile
    if (this.isMobile) {
      this.touchRadius = 48;
    } else {
      this.touchRadius = 30;
    }

    console.log(`📱 Mobile Detection: ${this.isMobile} (UA: ${isMobileUA}, Width: ${isMobileWidth}, Touch: ${hasTouchSupport()})`);
  }

  /**
   * Set up touch event handlers
   */
  setupTouchHandlers() {
    const playArea = document.getElementById('playArea');
    if (!playArea) return;

    // Touch start
    playArea.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e);
    }, { passive: false });

    // Touch move
    playArea.addEventListener('touchmove', (e) => {
      this.handleTouchMove(e);
    }, { passive: false });

    // Touch end
    playArea.addEventListener('touchend', (e) => {
      this.handleTouchEnd(e);
    }, { passive: false });

    // Prevent default touch behaviors
    playArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    const gameState = window.gameState;
    if (!gameState || gameState.flow.state !== 'playing') return;

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Check for floatie at touch position
    const floatie = this.getFloatieAtPosition(x, y, gameState);

    if (floatie) {
      this.isSwiping = true;
      this.swipeChain = [floatie.id];
      this.swipeFamily = floatie.family;

      // Trigger haptic feedback
      this.triggerHaptic(5);

      console.log(`👆 Touch start on floatie: ${floatie.family}`);
    }
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    const gameState = window.gameState;
    if (!gameState || !this.isSwiping) return;

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Check for adjacent floatie of same family
    const floatie = this.getFloatieAtPosition(x, y, gameState);

    if (floatie && floatie.family === this.swipeFamily) {
      // Check if already in chain
      if (!this.swipeChain.includes(floatie.id)) {
        this.swipeChain.push(floatie.id);

        // Trigger light haptic
        this.triggerHaptic(5);

        console.log(`👆 Swipe chain: ${this.swipeChain.length} floaties`);
      }
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    const gameState = window.gameState;
    if (!gameState || !this.isSwiping) return;

    this.isSwiping = false;

    // If chain has 2+ floaties, trigger chain pop
    if (this.swipeChain.length >= 2) {
      console.log(`✅ Swipe chain complete: ${this.swipeChain.length} floaties`);

      // Emit swipe chain event
      this.systemManager.emit('swipe:chain', {
        floatieIds: this.swipeChain,
        family: this.swipeFamily
      });

      // Trigger stronger haptic
      this.triggerHaptic([20, 10, 20]);
    }

    // Reset swipe state
    this.swipeChain = [];
    this.swipeFamily = null;
  }

  /**
   * Get floatie at touch position
   * @param {number} x - Touch X coordinate
   * @param {number} y - Touch Y coordinate
   * @param {Object} gameState - Centralized game state
   * @returns {Object|null} Floatie or null
   */
  getFloatieAtPosition(x, y, gameState) {
    if (!gameState.floats) return null;

    const playArea = document.getElementById('playArea');
    if (!playArea) return null;

    // Get play area position
    const rect = playArea.getBoundingClientRect();
    const localX = x - rect.left;
    const localY = y - rect.top;

    // Find floatie within touch radius
    for (const floatie of gameState.floats) {
      if (!floatie.isActive) continue;

      const distance = Math.sqrt(
        Math.pow(localX - floatie.x, 2) +
        Math.pow(localY - floatie.y, 2)
      );

      if (distance < gameState.mobile.touchRadius) {
        return floatie;
      }
    }

    return null;
  }

  /**
   * Trigger haptic feedback
   * @param {number} duration - Vibration duration in milliseconds
   */
  triggerHaptic(duration) {
    if (!this.vibrationEnabled || !navigator.vibrate) return;

    // Ensure duration is a number (not array) for maximum browser compatibility
    if (typeof duration !== 'number') {
      console.warn('⚠️ Haptic pattern must be a number, not array');
      return;
    }

    try {
      navigator.vibrate(duration);
    } catch (e) {
      console.warn('⚠️ Haptic feedback not supported:', e.message);
    }
  }

  /**
   * Enforce portrait orientation on mobile
   */
  enforcePortraitOrientation() {
    // Request portrait orientation if supported
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch((e) => {
        console.warn('⚠️ Could not lock orientation:', e.message);
      });
    }

    // Add CSS to prevent landscape
    const style = document.createElement('style');
    style.textContent = `
      @media (orientation: landscape) {
        body {
          transform: rotate(-90deg);
          transform-origin: left top;
          width: 100vh;
          overflow-x: hidden;
          position: absolute;
          top: 100%;
          left: 0;
        }
      }
    `;
    document.head.appendChild(style);

    console.log('📱 Portrait orientation enforced');
  }

  /**
   * Get thumb reach zone
   * @param {number} y - Y coordinate
   * @param {number} screenHeight - Screen height
   * @returns {string} Zone name
   */
  getThumbZone(y, screenHeight) {
    const topZone = screenHeight * 0.3;
    const bottomZone = screenHeight * 0.8;

    if (y < topZone) return 'top';
    if (y > bottomZone) return 'bottom';
    return 'center';
  }

  /**
   * Optimize touch target size
   * @param {number} baseSize - Base size in pixels
   * @returns {number} Optimized size
   */
  optimizeTouchTarget(baseSize) {
    if (!this.isMobile) return baseSize;

    // Ensure minimum 48px touch target
    return Math.max(baseSize, 48);
  }

  /**
   * Get mobile info
   * @param {Object} gameState - Centralized game state
   * @returns {Object} Mobile info
   */
  getMobileInfo(gameState) {
    return {
      isMobile: this.isMobile,
      touchRadius: this.touchRadius,
      vibrationEnabled: this.vibrationEnabled,
      swipeChainLength: this.swipeChain.length,
      isSwiping: this.isSwiping
    };
  }

  /**
   * Toggle vibration
   * @param {boolean} enabled - Enable or disable
   */
  toggleVibration(enabled) {
    this.vibrationEnabled = enabled;
    const gameState = window.gameState;
    if (gameState) {
      gameState.mobile.vibrationEnabled = enabled;
    }
    console.log(`📳 Vibration ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get optimal UI scale for mobile
   * @returns {number} Scale factor
   */
  getUIScale() {
    if (!this.isMobile) return 1;

    // Scale UI elements for mobile
    const screenWidth = window.innerWidth;
    if (screenWidth < 400) return 0.8;
    if (screenWidth < 600) return 0.9;
    return 1;
  }
}
