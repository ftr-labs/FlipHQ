// studioFTR
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'fliphq_device_id';

const generateId = () => {
  const random = Math.random().toString(36).slice(2);
  const timestamp = Date.now().toString(36);
  return `${timestamp}-${random}`;
};

let cachedDeviceId = null;

export const getDeviceId = async () => {
  if (cachedDeviceId) return cachedDeviceId;

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const newId = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  cachedDeviceId = newId;
  return newId;
};
