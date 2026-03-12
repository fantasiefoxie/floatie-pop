class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, handler) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(handler);
  }

  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(handler => handler(data));
    }
  }
}

export const bus = new EventEmitter();
