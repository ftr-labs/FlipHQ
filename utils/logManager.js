import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  INVENTORY: 'loggedItems',
  LEADS: 'savedSpots',
  SEARCH_CACHE: 'searchCache',
};

const MAX_ENTRIES = 100;

// --- Inventory Management ---

export const saveLoggedItem = async (item) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
    const parsed = existing ? JSON.parse(existing) : [];
    // Ensure item has a unique ID and initial status
    const newItem = {
      id: Date.now().toString(),
      status: 'Found',
      ...item,
    };
    const updated = [newItem, ...parsed].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updated));
    return newItem;
  } catch (e) {
    if (__DEV__) {
      console.error('Logging failed:', e);
    }
    return null;
  }
};

export const getLoggedItems = async () => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to fetch inventory:', e);
    }
    return [];
  }
};

export const updateItemStatus = async (itemId, newStatus, additionalData = {}) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!existing) return;
    const items = JSON.parse(existing);
    const updated = items.map(item => 
      item.id === itemId ? { ...item, status: newStatus, ...additionalData } : item
    );
    await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updated));
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to update status:', e);
    }
  }
};

export const deleteItem = async (itemId) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!existing) return;
    const items = JSON.parse(existing);
    const updated = items.filter(item => item.id !== itemId);
    await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updated));
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to delete item:', e);
    }
  }
};

// --- Leads (Saved Spots) Management ---

export const saveSavedSpot = async (spot) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.LEADS);
    const parsed = existing ? JSON.parse(existing) : [];
    
    // Check if already saved
    if (parsed.some(s => s.id === spot.id)) return;

    const updated = [spot, ...parsed].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to save spot:', e);
    }
  }
};

export const getSavedSpots = async () => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.LEADS);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to fetch leads:', e);
    }
    return [];
  }
};

export const removeSavedSpot = async (spotId) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.LEADS);
    if (!existing) return;
    const spots = JSON.parse(existing);
    const updated = spots.filter(s => s.id !== spotId);
    await AsyncStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to remove spot:', e);
    }
  }
};

// --- Search Cache Management ---

export const saveSearchCache = async (results) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_CACHE, JSON.stringify({
      timestamp: Date.now(),
      results,
    }));
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to cache search:', e);
    }
  }
};

export const getSearchCache = async () => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_CACHE);
    if (!existing) return null;
    const cache = JSON.parse(existing);
    // Optional: Expire cache after 24 hours
    const isExpired = Date.now() - cache.timestamp > 24 * 60 * 60 * 1000;
    return isExpired ? null : cache.results;
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to fetch search cache:', e);
    }
    return null;
  }
};

// --- Global Data Management ---

export const clearAllData = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (e) {
    if (__DEV__) {
      console.error('Failed to clear all data:', e);
    }
    return false;
  }
};
