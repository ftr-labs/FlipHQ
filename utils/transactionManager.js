import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'processedTransactions';
const MAX_STORED_TRANSACTIONS = 1000; // Prevent storage bloat
const CLEANUP_THRESHOLD = 1200; // Clean up when we exceed this

/**
 * Check if a transaction has already been processed
 * @param {string} orderId - The unique order ID from the purchase
 * @returns {Promise<boolean>} - True if already processed, false otherwise
 */
export const isTransactionProcessed = async (orderId) => {
  try {
    if (!orderId) {
      return false; // No order ID means we can't track it
    }

    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      return false; // No stored transactions
    }

    const processedIds = JSON.parse(data);
    return processedIds.includes(orderId);
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to check transaction:', error);
    }
    // On error, assume not processed to avoid blocking legitimate purchases
    return false;
  }
};

/**
 * Mark a transaction as processed
 * @param {string} orderId - The unique order ID from the purchase
 * @returns {Promise<void>}
 */
export const markTransactionProcessed = async (orderId) => {
  try {
    if (!orderId) {
      return; // Can't track without order ID
    }

    const data = await AsyncStorage.getItem(STORAGE_KEY);
    let processedIds = data ? JSON.parse(data) : [];

    // Add new transaction ID if not already present
    if (!processedIds.includes(orderId)) {
      processedIds.push(orderId);

      // Clean up old transactions if we exceed threshold
      if (processedIds.length > CLEANUP_THRESHOLD) {
        // Keep only the most recent transactions
        processedIds = processedIds.slice(-MAX_STORED_TRANSACTIONS);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(processedIds));
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to mark transaction as processed:', error);
    }
    // Don't throw - this is not critical enough to block the purchase flow
  }
};

/**
 * Clear all processed transaction IDs (for testing/debugging)
 * @returns {Promise<void>}
 */
export const clearProcessedTransactions = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to clear processed transactions:', error);
    }
  }
};

