import { state } from './state.js';
import { performanceOptimizer } from './performanceOptimizer.js';

// Optimized game engine with batched rendering and object pooling
export class OptimizedGameEngine {
  constructor() {
    this.isRunning = false;
    this.lastUpdateTime = 0;
    this.accumulator = 0;
    this.fixedTimeStep = 1000 / 60; // 60 FPS target
    
    // Rendering batches
    this.transformBatch = new Map();
    this.styleBatch = new Map();
    this.classBatch = new Map();
    
    // Update batches
    this.floatieUpdateBatch = [];
    this.effectUpdateBatch = [];
    
    // Cached DOM elements
    this.cachedElements = new Map();
    
    // Pre-allocated objects for calculations
    this.tempVector = { x: 0, y: 0 };
    this.tempBounds = { left: 0, top: 0, right: 0, bottom: 0 };
    
    // Throttled functions
    this.throttledUIUpdate = performanceOptimizer.throttle(() => this.updateUI(), 100);
    this.throttledSynergyCheck = performanceOptimizer.throttle(() => this.checkSynergies(), 200);
    
    // RAF callback bound to this context
    this.rafCallback = this.gameLoop.bind(this);
  }

  // Start the optimized game engine
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.scheduleNextFrame();
    console.log('🚀 Optimized game engine started');
  }

  // Stop the game engine
  stop() {
    this.isRunning = false;
    performanceOptimizer.cancelRAF();
    console.log('⏹️ Optimized game engine stopped');
  }

  // Schedule next frame using optimized RAF
  scheduleNextFrame() {
    if (!this.isRunning) return;
    performanceOptimizer.scheduleRAF(this.rafCallback);
  }

  // Main game loop with fixed timestep
  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    this.accumulator += deltaTime;
    
    // Fixed timestep updates
    while (this.accumulator >= this.fixedTimeStep) {
      this.fixedUpdate(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
    }
    
    // Variable timestep rendering
    this.render(deltaTime);
    
    // Schedule next frame
    this.scheduleNextFrame();
  }

  // Fixed timestep update for game logic
  fixedUpdate(deltaTime) {
    if (state.paused || state.gameOver) return;
    
    const updateStartTime = performance.now();
    
    // Batch floatie updates
    this.updateFloatiesBatched();
    
    // Batch effect updates
    this.updateEffectsBatched();
    
    // Throttled system updates
    this.throttledSynergyCheck();
    
    const updateEndTime = performance.now();
    performanceOptimizer.metrics.updateTime += (updateEndTime - updateStartTime);
  }

  // Render with batched DOM updates
  render(deltaTime) {
    const renderStartTime = performance.now();
    
    // Batch all transform updates
    this.batchTransformUpdates();
    
    // Batch all style updates
    this.batchStyleUpdates();
    
    // Batch all class updates
    this.batchClassUpdates();
    
    // Flush all batched updates
    this.flushRenderBatches();
    
    // Throttled UI updates
    this.throttledUIUpdate();
    
    const renderEndTime = performance.now();
    performanceOptimizer.metrics.renderTime += (renderEndTime - renderStartTime);
  }

  // Batched floatie updates
  updateFloatiesBatched() {
    this.floatieUpdateBatch.length = 0;
    
    // Collect all floaties that need updates
    for (let i = 0; i < state.floats.length; i++) {
      const floatie = state.floats[i];
      if (floatie.isActive !== false) {
        this.floatieUpdateBatch.push(floatie);
      }
    }
    
    // Get cached play area bounds
    const bounds = this.getPlayAreaBounds();
    
    // Update all floaties in batch
    for (let i = 0; i < this.floatieUpdateBatch.length; i++) {
      const floatie = this.floatieUpdateBatch[i];
      this.updateFloatieOptimized(floatie, bounds);
    }
  }

  // Optimized floatie update
  updateFloatieOptimized(floatie, bounds) {
    // Update position
    floatie.x += floatie.vx;
    floatie.y += floatie.vy;
    
    // Boundary collision (reuse temp vector)
    if (floatie.x < bounds.left || floatie.x > bounds.right) {
      floatie.vx *= -1;
      floatie.x = Math.max(bounds.left, Math.min(floatie.x, bounds.right));
    }
    if (floatie.y < bounds.top || floatie.y > bounds.bottom) {
      floatie.vy *= -1;
      floatie.y = Math.max(bounds.top, Math.min(floatie.y, bounds.bottom));
    }
    
    // Queue transform update instead of immediate DOM update
    this.queueTransformUpdate(floatie.el, floatie.x, floatie.y);
  }

  // Get cached play area bounds
  getPlayAreaBounds() {
    const playArea = this.getCachedElement('playArea');
    if (!playArea) return this.tempBounds;
    
    // Cache bounds to avoid repeated calculations
    if (!this.cachedBounds || this.cachedBounds.timestamp < Date.now() - 1000) {
      this.cachedBounds = {
        left: 0,
        top: 0,
        right: playArea.clientWidth - 40,
        bottom: playArea.clientHeight - 40,
        timestamp: Date.now()
      };
    }
    
    return this.cachedBounds;
  }

  // Cache DOM elements to avoid repeated queries
  getCachedElement(id) {
    if (!this.cachedElements.has(id)) {
      const element = document.getElementById(id);
      if (element) {
        this.cachedElements.set(id, element);
      }
    }
    return this.cachedElements.get(id);
  }

  // Queue transform update for batching
  queueTransformUpdate(element, x, y, scale = 1, rotation = 0) {
    if (!element) return;
    
    const key = element.id || element.className || Math.random().toString();
    this.transformBatch.set(key, {
      element,
      x,
      y,
      scale,
      rotation
    });
  }

  // Queue style update for batching
  queueStyleUpdate(element, property, value) {
    if (!element) return;
    
    const key = `${element.id || element.className}-${property}`;
    this.styleBatch.set(key, {
      element,
      property,
      value
    });
  }

  // Queue class update for batching
  queueClassUpdate(element, className) {
    if (!element) return;
    
    const key = element.id || element.className || Math.random().toString();
    this.classBatch.set(key, {
      element,
      className
    });
  }

  // Batch transform updates
  batchTransformUpdates() {
    for (const [key, update] of this.transformBatch) {
      const { element, x, y, scale, rotation } = update;
      const transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
      element.style.transform = transform;
      performanceOptimizer.recordDOMUpdate();
    }
    this.transformBatch.clear();
  }

  // Batch style updates
  batchStyleUpdates() {
    for (const [key, update] of this.styleBatch) {
      const { element, property, value } = update;
      element.style[property] = value;
      performanceOptimizer.recordDOMUpdate();
    }
    this.styleBatch.clear();
  }

  // Batch class updates
  batchClassUpdates() {
    for (const [key, update] of this.classBatch) {
      const { element, className } = update;
      element.className = className;
      performanceOptimizer.recordDOMUpdate();
    }
    this.classBatch.clear();
  }

  // Flush all render batches
  flushRenderBatches() {
    // All batches are already flushed in their respective methods
    // This method exists for potential future optimizations
  }

  // Optimized floatie spawning with object pooling
  spawnFloatieOptimized(type, x, y, vx, vy, playArea, handler) {
    // Get floatie from pool
    const floatie = performanceOptimizer.getPooledFloatie();
    
    // Reuse existing element or create new one
    if (!floatie.el) {
      floatie.el = document.createElement('div');
      playArea.appendChild(floatie.el);
    }
    
    // Set properties
    floatie.type = type;
    floatie.x = x;
    floatie.y = y;
    floatie.vx = vx;
    floatie.vy = vy;
    floatie.isActive = true;
    
    // Set element properties
    floatie.el.className = 'float';
    floatie.el.textContent = type;
    floatie.el.style.display = 'block';
    floatie.el.onclick = () => !state.paused && handler(floatie);
    
    // Queue initial transform
    this.queueTransformUpdate(floatie.el, x, y);
    
    return floatie;
  }

  // Optimized floatie removal with pooling
  removeFloatieOptimized(floatie) {
    if (!floatie || !floatie.isActive) return;
    
    // Hide element instead of removing from DOM
    if (floatie.el) {
      floatie.el.style.display = 'none';
      floatie.el.onclick = null;
    }
    
    // Return to pool
    performanceOptimizer.returnFloatieToPool(floatie);
    
    // Remove from active floaties array
    const index = state.floats.indexOf(floatie);
    if (index > -1) {
      state.floats.splice(index, 1);
    }
  }

  // Batched effect updates
  updateEffectsBatched() {
    this.effectUpdateBatch.length = 0;
    
    // Collect active effects (assuming we have an effects array)
    if (window.activeEffects) {
      for (let i = 0; i < window.activeEffects.length; i++) {
        const effect = window.activeEffects[i];
        if (effect.isActive) {
          this.effectUpdateBatch.push(effect);
        }
      }
    }
    
    // Update all effects in batch
    for (let i = 0; i < this.effectUpdateBatch.length; i++) {
      const effect = this.effectUpdateBatch[i];
      this.updateEffectOptimized(effect);
    }
  }

  // Optimized effect update
  updateEffectOptimized(effect) {
    const currentTime = performance.now();
    const elapsed = currentTime - effect.startTime;
    
    if (elapsed >= effect.duration) {
      // Effect finished, return to pool
      performanceOptimizer.returnEffectToPool(effect);
      return;
    }
    
    // Update effect position/properties
    const progress = elapsed / effect.duration;
    const y = effect.y - (progress * 80); // Move up
    const opacity = 1 - progress;
    
    // Queue updates instead of immediate DOM manipulation
    this.queueTransformUpdate(effect.el, effect.x, y);
    this.queueStyleUpdate(effect.el, 'opacity', opacity);
  }

  // Throttled UI updates
  updateUI() {
    // Update score display
    const scoreEl = this.getCachedElement('score');
    if (scoreEl && scoreEl.textContent !== `Score: ${state.score}`) {
      scoreEl.textContent = `Score: ${state.score}`;
      performanceOptimizer.recordDOMUpdate();
    }
    
    // Update combo display
    const comboEl = this.getCachedElement('combo');
    if (comboEl && comboEl.textContent !== `Combo: ${state.combo}`) {
      comboEl.textContent = `Combo: ${state.combo}`;
      performanceOptimizer.recordDOMUpdate();
    }
  }

  // Throttled synergy checks
  checkSynergies() {
    // Import and call synergy system if available
    if (window.synergySystem && window.synergySystem.checkSynergies) {
      window.synergySystem.checkSynergies();
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return performanceOptimizer.generateReport();
  }

  // Clear cached elements (call when DOM structure changes)
  clearElementCache() {
    this.cachedElements.clear();
    this.cachedBounds = null;
  }
}

// Global optimized game engine instance
export const optimizedGameEngine = new OptimizedGameEngine();