import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'userTokens';
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

