/**
 * PRIORITY EVENT SYSTEM - Sequences events by importance
 *
 * Features:
 * - Priority-based event processing
 * - HIGH events process immediately
 * - MEDIUM events delayed 50-100ms
 * - LOW events delayed 100-200ms
 * - Prevents visual overload
 *
 * Priority Levels:
 * HIGH: floatiePopped, comboMilestone (immediate feedback)
 * MEDIUM: scoreUpdated, cardGenerated (secondary feedback)
 * LOW: telemetry, minor updates (background processing)
 *
 * Lifecycle:
 * - init: Initialize queues
 * - update: Process queued events by priority
 * - emit: Queue events with priority
 */

export class PriorityEventSystem {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.queues = {
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };
    this.processing = false;
    this.eventIdCounter = 0;
    
    // Priority delays (ms)
    this.delays = {
      HIGH: 0,
      MEDIUM: { min: 50, max: 100 },
      LOW: { min: 100, max: 200 }
    };
  }

  /**
   * Initialize priority event system
   * @param {Object} gameState - Centralized game state
   */
  init(gameState) {
    this.queues = { HIGH: [], MEDIUM: [], LOW: [] };
    this.processing = false;
    this.eventIdCounter = 0;
    
    console.log('✅ PriorityEventSystem initialized');
    console.log('📊 Priority delays: HIGH=0ms, MEDIUM=50-100ms, LOW=100-200ms');
  }

  /**
   * Update priority event system - process queued events
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} gameState - Centralized game state
   */
  update(deltaTime, gameState) {
    if (this.processing) return;
    
    const now = Date.now();
    
    // Process HIGH priority first (immediate)
    this.processQueue('HIGH', now);
    
    // Then MEDIUM priority
    this.processQueue('MEDIUM', now);
    
    // Finally LOW priority
    this.processQueue('LOW', now);
  }

  /**
   * Process events in a priority queue
   * @param {string} priority - Priority level
   * @param {number} now - Current timestamp
   */
  processQueue(priority, now) {
    const queue = this.queues[priority];
    
    for (let i = queue.length - 1; i >= 0; i--) {
      const event = queue[i];
      
      if (now >= event.processAt) {
        // Execute event
        this.executeEvent(event);
        
        // Remove from queue
        queue.splice(i, 1);
      }
    }
  }

  /**
   * Execute a single event
   * @param {Object} event - Event to execute
   */
  executeEvent(event) {
    console.log(`⚡ [${event.priority}] Event: ${event.name} (delay: ${event.delay}ms)`);
    
    // Emit to original system manager
    this.systemManager.emit(event.name, event.data);
  }

  /**
   * Emit an event with priority
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   * @param {string} priority - Priority level (HIGH, MEDIUM, LOW)
   * @returns {number} Event ID
   */
  emit(eventName, data, priority = 'MEDIUM') {
    const eventId = this.eventIdCounter++;
    const now = Date.now();
    
    // Calculate delay based on priority
    let delay = 0;
    if (priority === 'MEDIUM') {
      delay = this.randomInRange(this.delays.MEDIUM.min, this.delays.MEDIUM.max);
    } else if (priority === 'LOW') {
      delay = this.randomInRange(this.delays.LOW.min, this.delays.LOW.max);
    }
    
    // Create event object
    const event = {
      id: eventId,
      name: eventName,
      data,
      priority,
      delay,
      createdAt: now,
      processAt: now + delay
    };
    
    // Add to appropriate queue
    this.queues[priority].push(event);
    
    return eventId;
  }

  /**
   * Emit HIGH priority event (immediate)
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   */
  emitHigh(eventName, data) {
    return this.emit(eventName, data, 'HIGH');
  }

  /**
   * Emit MEDIUM priority event (50-100ms delay)
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   */
  emitMedium(eventName, data) {
    return this.emit(eventName, data, 'MEDIUM');
  }

  /**
   * Emit LOW priority event (100-200ms delay)
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   */
  emitLow(eventName, data) {
    return this.emit(eventName, data, 'LOW');
  }

  /**
   * Generate random number in range
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random value
   */
  randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Clear all pending events
   */
  clearAll() {
    this.queues = { HIGH: [], MEDIUM: [], LOW: [] };
  }

  /**
   * Clear events by priority
   * @param {string} priority - Priority level
   */
  clearPriority(priority) {
    this.queues[priority] = [];
  }

  /**
   * Get queue info for debugging
   * @returns {Object} Queue statistics
   */
  getQueueInfo() {
    const now = Date.now();
    
    return {
      HIGH: {
        count: this.queues.HIGH.length,
        ready: this.queues.HIGH.filter(e => now >= e.processAt).length
      },
      MEDIUM: {
        count: this.queues.MEDIUM.length,
        ready: this.queues.MEDIUM.filter(e => now >= e.processAt).length
      },
      LOW: {
        count: this.queues.LOW.length,
        ready: this.queues.LOW.filter(e => now >= e.processAt).length
      },
      totalPending: this.queues.HIGH.length + this.queues.MEDIUM.length + this.queues.LOW.length
    };
  }

  /**
   * Handle system events
   */
  onEvent(eventName, data) {
    // Priority events are handled via emit()
  }
}
