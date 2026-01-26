import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'userTokens';
const PROMPT_COUNT_KEY = 'flipbotPromptCount';
const INITIAL_TOKENS = 10; // Free tokens on first launch

/**
 * Initialize tokens for new users
 */
export const initializeTokens = async () => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing === null) {
      // First launch - give free tokens
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        count: INITIAL_TOKENS,
        initialized: true,
      }));
      return INITIAL_TOKENS;
    }
    return null; // Already initialized
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to initialize tokens:', e);
    }
    return null;
  }
};

/**
 * Get current token count
 */
export const getTokens = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      // Not initialized yet
      const initialCount = await initializeTokens();
      return initialCount || 0;
    }
    const parsed = JSON.parse(data);
    return parsed.count || 0;
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to get tokens:', e);
    }
    return 0;
  }
};

/**
 * Deduct a token (use before API call)
 */
export const deductToken = async () => {
  try {
    const current = await getTokens();
    if (current < 1) {
      return false; // Not enough tokens
    }
    const newCount = current - 1;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      count: newCount,
      initialized: true,
    }));
    return true;
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to deduct token:', e);
    }
    return false;
  }
};

/**
 * Add tokens (for purchases or refunds)
 */
export const addTokens = async (amount) => {
  try {
    const current = await getTokens();
    const newCount = current + amount;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      count: newCount,
      initialized: true,
    }));
    return newCount;
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to add tokens:', e);
    }
    return current;
  }
};

/**
 * Refund a token (if API call fails or returns no results)
 */
export const refundToken = async () => {
  return await addTokens(1);
};

/**
 * Set tokens directly (for dev mode/testing)
 */
export const setTokens = async (amount) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      count: amount,
      initialized: true,
    }));
    return amount;
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to set tokens:', e);
    }
    return 0;
  }
};

/**
 * Get current prompt count for FlipBot (persisted across app restarts)
 * @returns {Promise<number>} - Current prompt count (0-2, resets to 0 after 3)
 */
export const getPromptCount = async () => {
  try {
    const count = await AsyncStorage.getItem(PROMPT_COUNT_KEY);
    if (count === null) {
      return 0; // First time, no prompts yet
    }
    return parseInt(count, 10) || 0;
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to get prompt count:', e);
    }
    return 0;
  }
};

/**
 * Increment prompt count and check if token should be deducted
 * Returns true if token was deducted, false otherwise
 * @returns {Promise<boolean>} - True if token was deducted (prompt count reached 3)
 */
export const incrementPromptCount = async () => {
  try {
    const currentCount = await getPromptCount();
    const newCount = currentCount + 1;
    
    // Check if we've reached 3 prompts (3rd, 6th, 9th, etc.)
    if (newCount % 3 === 0) {
      // CRITICAL: Check tokens BEFORE incrementing count
      // This prevents incrementing count if we can't deduct token
      const currentTokens = await getTokens();
      if (currentTokens < 1) {
        // Don't increment count if no tokens available
        // Return false to indicate no token was deducted
        return false;
      }
      
      // Deduct token first
      const deducted = await deductToken();
      if (deducted) {
        // Only increment count if token was successfully deducted
        await AsyncStorage.setItem(PROMPT_COUNT_KEY, '0');
        return true; // Token was deducted
      } else {
        // Token deduction failed - don't increment count
        // Keep count at current value
        return false;
      }
    }
    
    // Not a token-deducting prompt, safe to increment
    await AsyncStorage.setItem(PROMPT_COUNT_KEY, newCount.toString());
    return false; // No token deducted yet
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to increment prompt count:', e);
    }
    // On error, don't increment count to prevent inconsistent state
    return false;
  }
};

/**
 * Reset prompt count to 0 (used when refunding token)
 */
export const resetPromptCount = async () => {
  try {
    await AsyncStorage.setItem(PROMPT_COUNT_KEY, '0');
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to reset prompt count:', e);
    }
  }
};

