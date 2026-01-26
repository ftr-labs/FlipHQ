// Simple event emitter for IAP purchase events
// Used to communicate purchase success from App.js listener to UI components
// This is a lightweight implementation that properly manages subscriptions

class IAPEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Add a listener for an event
   * @param {string} eventName - The event name to listen for
   * @param {Function} callback - The callback function
   * @returns {Object} - Subscription object with remove() method
   */
  addListener(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    
    this.listeners.get(eventName).add(callback);

    // Return subscription object
    return {
      remove: () => {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
          callbacks.delete(callback);
          // Clean up empty sets
          if (callbacks.size === 0) {
            this.listeners.delete(eventName);
          }
        }
      }
    };
  }

  /**
   * Emit an event to all listeners
   * @param {string} eventName - The event name
   * @param {*} data - Data to pass to listeners
   */
  emit(eventName, data) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      // Create a copy of the set to avoid issues if listeners modify during iteration
      const callbacksCopy = Array.from(callbacks);
      callbacksCopy.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          if (__DEV__) {
            console.error(`IAP EventEmitter: Error in listener for ${eventName}:`, error);
          }
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - The event name
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }
}

// Export singleton instance
export const iapEmitter = new IAPEventEmitter();

