/**
 * SYSTEM MANAGER - Plugin-Style Game Architecture
 * 
 * Manages registration and execution of game systems in a controlled order.
 * Systems are executed in phases: input → gameplay → physics → scoring → rendering
 * 
 * Each system is optional and can implement:
 * - init(gameState): Initialize system
 * - update(deltaTime, gameState): Update logic
 * - render(gameState): Render logic
 * - onEvent(eventName, data): Handle events
 */

export class SystemManager {
  constructor() {
    // Systems organized by execution phase
    this.systems = {
      content: [],
      input: [],
      flow: [],
      gameplay: [],
      physics: [],
      scoring: [],
      rendering: []
    };

    // Event listeners
    this.eventListeners = new Map();

    // System registry for lookup
    this.systemRegistry = new Map();

    // Game state reference for systems to access
    this.gameState = null;

    // Execution stats
    this.stats = {
      systemCount: 0,
      lastUpdateTime: 0,
      systemTimes: new Map()
    };
  }

  /**
   * Register a system with the manager
   * @param {string} phase - Execution phase (input, gameplay, physics, scoring, rendering)
   * @param {string} name - System name (for debugging)
   * @param {Object} system - System object with optional lifecycle methods
   */
  register(phase, name, system) {
    if (!this.systems[phase]) {
      console.warn(`⚠️ Unknown phase: ${phase}. Valid phases: content, input, flow, gameplay, physics, scoring, rendering`);
      return false;
    }

    if (!system) {
      console.warn(`⚠️ System ${name} is null or undefined`);
      return false;
    }

    // Validate system has at least one lifecycle method
    const hasLifecycle = system.init || system.update || system.render || system.onEvent;
    if (!hasLifecycle) {
      console.warn(`⚠️ System ${name} has no lifecycle methods (init, update, render, or onEvent)`);
      return false;
    }

    // Register system
    this.systems[phase].push(system);
    this.systemRegistry.set(name, { phase, system });
    this.stats.systemCount++;

    return true;
  }

  /**
   * Initialize all systems
   * @param {Object} gameState - Centralized game state
   */
  initializeSystems(gameState) {
    console.log('🔧 Initializing systems...');

    // Store gameState reference for systems to access
    this.gameState = gameState;

    const phases = ['content', 'input', 'flow', 'gameplay', 'physics', 'scoring', 'rendering'];

    for (const phase of phases) {
      for (const system of this.systems[phase]) {
        if (system.init) {
          try {
            system.init(gameState);
          } catch (e) {
            console.error(`❌ Error initializing system in ${phase} phase:`, e);
          }
        }
      }
    }

    console.log(`✅ Initialized ${this.stats.systemCount} systems`);
  }

  /**
   * Update all systems in order
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  updateSystems(deltaTime, gameState) {
    // Store gameState reference for systems to access
    this.gameState = gameState;

    const phases = ['input', 'flow', 'gameplay', 'physics', 'scoring'];

    for (const phase of phases) {
      for (const system of this.systems[phase]) {
        if (system.update) {
          const startTime = performance.now();

          try {
            system.update(deltaTime, gameState);
          } catch (e) {
            console.error(`❌ Error updating system in ${phase} phase:`, e);
          }

          const endTime = performance.now();
          const duration = endTime - startTime;

          // Track system performance
          if (!this.stats.systemTimes.has(phase)) {
            this.stats.systemTimes.set(phase, []);
          }
          this.stats.systemTimes.get(phase).push(duration);
        }
      }
    }
  }

  /**
   * Render all systems
   * @param {Object} gameState - Centralized game state
   */
  renderSystems(gameState) {
    for (const system of this.systems.rendering) {
      if (system.render) {
        try {
          system.render(gameState);
        } catch (e) {
          console.error('❌ Error rendering system:', e);
        }
      }
    }
  }

  /**
   * Emit an event to all systems
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  emit(eventName, data) {
    const phases = ['content', 'input', 'flow', 'gameplay', 'physics', 'scoring', 'rendering'];

    for (const phase of phases) {
      for (const system of this.systems[phase]) {
        if (system.onEvent) {
          try {
            system.onEvent(eventName, data);
          } catch (e) {
            console.error(`❌ Error handling event ${eventName} in ${phase} phase:`, e);
          }
        }
      }
    }

    // Call registered event listeners
    if (this.eventListeners.has(eventName)) {
      for (const listener of this.eventListeners.get(eventName)) {
        try {
          listener(data);
        } catch (e) {
          console.error(`❌ Error in event listener for ${eventName}:`, e);
        }
      }
    }
  }

  /**
   * Register an event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
  }

  /**
   * Unregister an event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  off(eventName, callback) {
    if (this.eventListeners.has(eventName)) {
      const listeners = this.eventListeners.get(eventName);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get system by name
   * @param {string} name - System name
   * @returns {Object} System object or null
   */
  getSystem(name) {
    const entry = this.systemRegistry.get(name);
    return entry ? entry.system : null;
  }

  /**
   * Get all systems in a phase
   * @param {string} phase - Phase name
   * @returns {Array} Systems in phase
   */
  getSystemsInPhase(phase) {
    return this.systems[phase] || [];
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getStats() {
    const stats = {
      systemCount: this.stats.systemCount,
      phases: {}
    };

    for (const [phase, times] of this.stats.systemTimes) {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        stats.phases[phase] = {
          count: times.length,
          avgTime: avg.toFixed(2) + 'ms',
          lastTime: times[times.length - 1].toFixed(2) + 'ms'
        };
      }
    }

    return stats;
  }

  /**
   * Print system registry
   */
  printRegistry() {
    console.log('%c=== SYSTEM REGISTRY ===', 'color: #00ff88; font-size: 14px; font-weight: bold;');

    for (const [name, entry] of this.systemRegistry) {
      console.log(`  ${name} (${entry.phase})`);
    }

    console.log(`Total: ${this.stats.systemCount} systems`);
  }

  /**
   * Print execution order
   */
  printExecutionOrder() {
    console.log('%c=== SYSTEM EXECUTION ORDER ===', 'color: #ffaa00; font-size: 14px; font-weight: bold;');

    const phases = ['content', 'input', 'flow', 'gameplay', 'physics', 'scoring', 'rendering'];
    let order = 1;

    for (const phase of phases) {
      console.log(`\n${phase.toUpperCase()}:`);
      for (const system of this.systems[phase]) {
        const name = Array.from(this.systemRegistry.entries()).find(([_, entry]) => entry.system === system)?.[0] || 'Unknown';
        console.log(`  ${order}. ${name}`);
        order++;
      }
    }
  }

  /**
   * Clear all systems
   */
  clear() {
    this.systems = {
      content: [],
      input: [],
      flow: [],
      gameplay: [],
      physics: [],
      scoring: [],
      rendering: []
    };
    this.systemRegistry.clear();
    this.eventListeners.clear();
    this.stats.systemCount = 0;
    this.stats.systemTimes.clear();
  }
}

// Global instance
export const systemManager = new SystemManager();
