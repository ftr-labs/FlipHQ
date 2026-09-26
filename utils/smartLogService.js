// studioFTR
import { SUPABASE_FUNCTIONS_URL, APP_SHARED_SECRET } from '@env';
import { getDeviceId } from './deviceId';

const API_URL = `${SUPABASE_FUNCTIONS_URL}/smart-log-proxy`;
const API_TIMEOUT_MS = 20000;

/**
 * Turns free text into a classified item plus a live eBay market signal, in one round trip.
 * @param {string} text - What the user typed about the item they found
 * @returns {Promise<{capped: true} | {itemName, category, subcategory, type, condition, marketPrice, marketSampleSize} | null>}
 *   null means the text couldn't be classified; throws on network/timeout errors.
 */
export const smartLog = async (text) => {
  const deviceId = await getDeviceId();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), API_TIMEOUT_MS);
  });

  const fetchPromise = fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-secret': APP_SHARED_SECRET,
    },
    body: JSON.stringify({ deviceId, text }),
  });

  const response = await Promise.race([fetchPromise, timeoutPromise]);
  const data = await response.json();

  if (data.capped) return { capped: true };
  if (!response.ok || data.error) return null;

  return {
    itemName: data.itemName,
    category: data.category,
    subcategory: data.subcategory,
    type: data.type,
    condition: data.condition,
    marketPrice: data.marketPrice,
    marketSampleSize: data.marketSampleSize,
  };
};
