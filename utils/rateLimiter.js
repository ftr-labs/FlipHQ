// Simple rate limiter to prevent excessive API calls
// Uses a sliding window approach

class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests; // Maximum number of requests
    this.windowMs = windowMs; // Time window in milliseconds
    this.requests = []; // Array of request timestamps
  }

  /**
   * Check if a request can be made
   * @returns {boolean} - True if request can be made, false if rate limited
   */
  canMakeRequest() {
    const now = Date.now();
    
    // Remove requests outside the time window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Check if we're under the limit
    return this.requests.length < this.maxRequests;
  }

  /**
   * Record a request
   */
  recordRequest() {
    this.requests.push(Date.now());
  }

  /**
   * Get time until next request can be made (in milliseconds)
   * @returns {number} - Milliseconds until next request, or 0 if can make request now
   */
  getTimeUntilNextRequest() {
    if (this.canMakeRequest()) {
      return 0;
    }

    // Find the oldest request in the window
    const oldestRequest = Math.min(...this.requests);
    const now = Date.now();
    const timeSinceOldest = now - oldestRequest;
    const timeUntilWindowExpires = this.windowMs - timeSinceOldest;

    return Math.max(0, timeUntilWindowExpires);
  }
}

// Create rate limiters for different API endpoints
// OpenAI: 60 requests per minute (conservative limit)
export const openAIRateLimiter = new RateLimiter(60, 60000);

// Google Places: 10 requests per second (conservative limit)
export const placesRateLimiter = new RateLimiter(10, 1000);

