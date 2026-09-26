// studioFTR
import { SUPABASE_FUNCTIONS_URL, APP_SHARED_SECRET } from '@env';
import { openAIRateLimiter } from './rateLimiter';
import { getDeviceId } from './deviceId';

const API_URL = `${SUPABASE_FUNCTIONS_URL}/flipbot-proxy`;
const API_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Sends a message to FlipBot (via the Supabase proxy) and gets a response
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages in format [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]
 * @returns {Promise<string>} - FlipBot's response
 */
export const sendMessageToFlipBot = async (userMessage, conversationHistory = []) => {
  // Rate limiting: soft client-side throttle (the real cap lives server-side)
  if (!openAIRateLimiter.canMakeRequest()) {
    const waitTime = openAIRateLimiter.getTimeUntilNextRequest();
    if (waitTime > 0) {
      throw new Error(`Please wait ${Math.ceil(waitTime / 1000)} seconds before making another request.`);
    }
  }

  try {
    openAIRateLimiter.recordRequest();
    const deviceId = await getDeviceId();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout - the AI is taking too long to respond'));
      }, API_TIMEOUT_MS);
    });

    const fetchPromise = fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': APP_SHARED_SECRET,
      },
      body: JSON.stringify({
        deviceId,
        message: userMessage,
        history: conversationHistory,
      }),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.message) {
      throw new Error('No response from AI');
    }

    return data.message;
  } catch (error) {
    if (__DEV__) {
      console.error('FlipBot API Error:', error);
    }

    // User-friendly error messages
    if (error.message.includes('timeout')) {
      throw new Error('Request timed out. Please check your connection and try again.');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error('Network error. Check your connection and try again.');
    } else {
      throw new Error('FlipBot is having trouble right now. Try again in a moment.');
    }
  }
};
