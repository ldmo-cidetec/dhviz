// EventBus.js
// Lightweight publish/subscribe event bus.
// Decouples controllers from direct view references for cross-cutting events.
// Currently used to broadcast 'tabChange' from TabManager to all controllers.

class EventBus {

    constructor() {
        this._listeners = {}; // { eventName: [fn, ...] }
    }

    // Register a listener for the given event
    on(event, fn) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(fn);
    }

    // Remove a previously registered listener
    off(event, fn) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(f => f !== fn);
    }

    // Fire all listeners registered for the given event
    emit(event, ...args) {
        (this._listeners[event] || []).forEach(fn => fn(...args));
    }
}

export default EventBus;
