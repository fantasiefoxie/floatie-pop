// Performance optimization system for the game engine
export class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      frameCount: 0,
      lastFrameTime: 0,
      fps: 0,
      averageFps: 0,
      frameTimeHistory: [],
      domUpdates: 0,
      objectCreations: 0,
      memoryUsage: 0,
      renderTime: 0,
      updateTime: 0
    };
    
    this.isMonitoring = false;
    this.monitoringStartTime = 0;
    this.performancePanel = null;
    
    // Batch rendering system
    this.renderQueue = new Set();
    this.transformQueue = new Map();
    this.styleQueue = new Map();
    
    // Object pools
    this.floatiePool = [];
    this.effectPool = [];
    this.notificationPool = [];
    
    // RAF optimization
    this.rafId = null;
    this.isRafScheduled = false;
    
    // DOM update batching
    this.pendingDOMUpdates = new Map();
    this.batchUpdateScheduled = false;
  }

  // Start performance monitoring
  startMonitoring() {
    this.isMonitoring = true;
    this.monitoringStartTime = performance.now();
    this.resetMetrics();
    console.log('🔍 Performance monitoring started');
  }

  // Stop performance monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    const report = this.generateReport();
    console.log('📊 Performance monitoring stopped');
    return report;
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      frameCount: 0,
      lastFrameTime: performance.now(),
      fps: 0,
      averageFps: 0,
      frameTimeHistory: [],
      domUpdates: 0,
      objectCreations: 0,
      memoryUsage: 0,
      renderTime: 0,
      updateTime: 0
    };
  }

  // Record frame metrics
  recordFrame(frameTime) {
    if (!this.isMonitoring) return;
    
    this.metrics.frameCount++;
    const deltaTime = frameTime - this.metrics.lastFrameTime;
    this.metrics.lastFrameTime = frameTime;
    
    // Calculate FPS
    if (deltaTime > 0) {
      this.metrics.fps = 1000 / deltaTime;
      this.metrics.frameTimeHistory.push(deltaTime);
      
      // Keep only last 60 frames for average
      if (this.metrics.frameTimeHistory.length > 60) {
        this.metrics.frameTimeHistory.shift();
      }
      
      // Calculate average FPS
      const avgFrameTime = this.metrics.frameTimeHistory.reduce((a, b) => a + b, 0) / this.metrics.frameTimeHistory.length;
      this.metrics.averageFps = 1000 / avgFrameTime;
    }
    
    // Update memory usage (if available)
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
  }

  // Record DOM update
  recordDOMUpdate() {
    if (this.isMonitoring) {
      this.metrics.domUpdates++;
    }
  }

  // Record object creation
  recordObjectCreation() {
    if (this.isMonitoring) {
      this.metrics.objectCreations++;
    }
  }

  // Batch DOM updates
  batchDOMUpdate(element, property, value) {
    const elementId = element.id || element.className || 'unknown';
    const key = `${elementId}-${property}`;
    
    if (!this.pendingDOMUpdates.has(key)) {
      this.pendingDOMUpdates.set(key, { element, property, value });
    } else {
      this.pendingDOMUpdates.get(key).value = value;
    }
    
    if (!this.batchUpdateScheduled) {
      this.batchUpdateScheduled = true;
      requestAnimationFrame(() => this.flushDOMUpdates());
    }
  }

  // Flush batched DOM updates
  flushDOMUpdates() {
    const startTime = performance.now();
    
    for (const [key, update] of this.pendingDOMUpdates) {
      const { element, property, value } = update;
      
      if (property === 'transform') {
        element.style.transform = value;
      } else if (property === 'textContent') {
        element.textContent = value;
      } else if (property === 'className') {
        element.className = value;
      } else {
        element.style[property] = value;
      }
      
      this.recordDOMUpdate();
    }
    
    this.pendingDOMUpdates.clear();
    this.batchUpdateScheduled = false;
    
    const endTime = performance.now();
    this.metrics.renderTime += (endTime - startTime);
  }

  // Object pooling for floaties
  getPooledFloatie() {
    if (this.floatiePool.length > 0) {
      return this.floatiePool.pop();
    }
    
    this.recordObjectCreation();
    return {
      el: null,
      type: '',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      isRare: false,
      isActive: false
    };
  }

  // Return floatie to pool
  returnFloatieToPool(floatie) {
    floatie.isActive = false;
    if (floatie.el) {
      floatie.el.style.display = 'none';
    }
    this.floatiePool.push(floatie);
  }

  // Object pooling for effects
  getPooledEffect() {
    if (this.effectPool.length > 0) {
      return this.effectPool.pop();
    }
    
    this.recordObjectCreation();
    return {
      el: null,
      x: 0,
      y: 0,
      type: '',
      duration: 0,
      startTime: 0,
      isActive: false
    };
  }

  // Return effect to pool
  returnEffectToPool(effect) {
    effect.isActive = false;
    if (effect.el) {
      effect.el.style.display = 'none';
    }
    this.effectPool.push(effect);
  }

  // Optimized transform update
  updateTransform(element, x, y, scale = 1, rotation = 0) {
    const transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
    this.batchDOMUpdate(element, 'transform', transform);
  }

  // Optimized style update
  updateStyle(element, property, value) {
    this.batchDOMUpdate(element, property, value);
  }

  // Generate performance report
  generateReport() {
    const duration = (performance.now() - this.monitoringStartTime) / 1000;
    
    return {
      duration: duration.toFixed(2) + 's',
      totalFrames: this.metrics.frameCount,
      averageFPS: this.metrics.averageFps.toFixed(1),
      currentFPS: this.metrics.fps.toFixed(1),
      domUpdatesPerSecond: (this.metrics.domUpdates / duration).toFixed(1),
      objectCreationsPerSecond: (this.metrics.objectCreations / duration).toFixed(1),
      memoryUsage: this.metrics.memoryUsage.toFixed(2) + 'MB',
      averageFrameTime: (this.metrics.frameTimeHistory.reduce((a, b) => a + b, 0) / this.metrics.frameTimeHistory.length).toFixed(2) + 'ms',
      renderTimePerSecond: (this.metrics.renderTime / duration).toFixed(2) + 'ms',
      updateTimePerSecond: (this.metrics.updateTime / duration).toFixed(2) + 'ms'
    };
  }

  // Show performance panel
  showPerformancePanel() {
    if (this.performancePanel) {
      this.performancePanel.remove();
    }
    
    this.performancePanel = document.createElement('div');
    this.performancePanel.className = 'performance-panel';
    this.performancePanel.innerHTML = `
      <div class="performance-header">
        <h3>🔍 Performance Monitor</h3>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="performance-content">
        <div class="metric-row">
          <span>FPS:</span>
          <span id="fps-display">--</span>
        </div>
        <div class="metric-row">
          <span>Avg FPS:</span>
          <span id="avg-fps-display">--</span>
        </div>
        <div class="metric-row">
          <span>DOM Updates/s:</span>
          <span id="dom-updates-display">--</span>
        </div>
        <div class="metric-row">
          <span>Memory:</span>
          <span id="memory-display">--</span>
        </div>
        <div class="metric-row">
          <span>Objects/s:</span>
          <span id="objects-display">--</span>
        </div>
        <div class="performance-actions">
          <button id="start-monitoring">Start Monitor</button>
          <button id="stop-monitoring">Stop Monitor</button>
          <button id="generate-report">Generate Report</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.performancePanel);
    this.attachPerformanceEventListeners();
    this.startRealtimeUpdates();
  }

  // Attach event listeners to performance panel
  attachPerformanceEventListeners() {
    document.getElementById('start-monitoring').addEventListener('click', () => {
      this.startMonitoring();
    });
    
    document.getElementById('stop-monitoring').addEventListener('click', () => {
      const report = this.stopMonitoring();
      console.table(report);
      alert('Performance report generated! Check console for details.');
    });
    
    document.getElementById('generate-report').addEventListener('click', () => {
      const report = this.generateReport();
      console.table(report);
      alert('Current performance report generated! Check console for details.');
    });
  }

  // Start real-time performance updates
  startRealtimeUpdates() {
    const updateInterval = setInterval(() => {
      if (!this.performancePanel) {
        clearInterval(updateInterval);
        return;
      }
      
      const fpsDisplay = document.getElementById('fps-display');
      const avgFpsDisplay = document.getElementById('avg-fps-display');
      const domUpdatesDisplay = document.getElementById('dom-updates-display');
      const memoryDisplay = document.getElementById('memory-display');
      const objectsDisplay = document.getElementById('objects-display');
      
      if (fpsDisplay) fpsDisplay.textContent = this.metrics.fps.toFixed(1);
      if (avgFpsDisplay) avgFpsDisplay.textContent = this.metrics.averageFps.toFixed(1);
      
      if (this.isMonitoring) {
        const duration = (performance.now() - this.monitoringStartTime) / 1000;
        if (domUpdatesDisplay) domUpdatesDisplay.textContent = (this.metrics.domUpdates / duration).toFixed(1);
        if (objectsDisplay) objectsDisplay.textContent = (this.metrics.objectCreations / duration).toFixed(1);
      }
      
      if (memoryDisplay) memoryDisplay.textContent = this.metrics.memoryUsage.toFixed(1) + 'MB';
    }, 100);
  }

  // Optimized RAF scheduling
  scheduleRAF(callback) {
    if (this.isRafScheduled) return;
    
    this.isRafScheduled = true;
    this.rafId = requestAnimationFrame((timestamp) => {
      this.isRafScheduled = false;
      this.recordFrame(timestamp);
      callback(timestamp);
    });
  }

  // Cancel RAF
  cancelRAF() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.isRafScheduled = false;
    }
  }

  // Measure function performance
  measureFunction(name, fn) {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    console.log(`⏱️ ${name}: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  }

  // Throttle function calls
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Debounce function calls
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer();