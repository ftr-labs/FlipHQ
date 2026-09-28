// FTR Labs
import {
  basePrices,
  averageFixCosts,
  getTypeMultiplier,
  conditionMultipliers,
  demandScores,
} from '../constants/valuationMetadata';

// eBay shows asking prices; realized sale prices run roughly 18% lower.
const MARKET_ASKING_TO_SOLD_FACTOR = 0.82;
const MIN_MARKET_SAMPLES = 3;

export const formatMoney = (amount) => (amount < 0 ? `-$${Math.abs(amount)}` : `$${amount}`);

// High demand = tighter range, low demand = wider range.
const getVariance = (subcategory) => {
  const demandScore = demandScores[subcategory] ?? 5;
  return Math.max(0.10, Math.min(0.25, 0.15 + ((10 - demandScore) / 10) * 0.05));
};

export const getValueRange = (postFixValue, subcategory) => {
  const variance = getVariance(subcategory);
  return {
    lowValue: Math.round(postFixValue * (1 - variance)),
    highValue: Math.round(postFixValue * (1 + variance)),
  };
};

/**
 * Calculates the valuation and profit breakdown for an item with ranges.
 *
 * 1. Base price: standard resale value for the subcategory in good condition,
 *    blended with a live eBay market signal when one is available.
 * 2. Type adjustment: category-aware multiplier (vintage/modern/etc.).
 * 3. Condition adjustment: multiplier based on physical issues (1.0 = nothing wrong).
 * 4. Fix cost: typical repair cost scaled by defect severity; zero for a working item.
 * 5. Profit: post-fix value - fix cost - acquisition cost (before selling fees/shipping).
 *
 * @param {Object} params
 * @param {string} params.category - e.g. 'electronics', 'furniture'
 * @param {string} params.subcategory - e.g. 'phone', 'jacket'
 * @param {string} params.type - e.g. 'vintage', 'modern'
 * @param {string} params.condition - e.g. 'Cracked Screen'
 * @param {number} params.acquisitionCost - What the user paid for it
 * @param {number} [params.marketPrice] - Median asking price of comparable used eBay listings
 * @param {number} [params.marketSampleSize] - Number of listings behind marketPrice
 */
export const calculateValuation = ({
  category,
  subcategory,
  type,
  condition,
  acquisitionCost = 0,
  marketPrice = null,
  marketSampleSize = 0,
}) => {
  let basePrice = basePrices[subcategory] ?? 0;
  let usedMarketData = false;

  if (marketPrice && marketSampleSize >= MIN_MARKET_SAMPLES) {
    const marketSignal = marketPrice * MARKET_ASKING_TO_SOLD_FACTOR;
    // More listings behind the signal = more weight on it, capped at 70%.
    const marketWeight = Math.min(0.7, 0.2 + marketSampleSize * 0.04);
    basePrice = basePrice > 0
      ? basePrice * (1 - marketWeight) + marketSignal * marketWeight
      : marketSignal;
    usedMarketData = true;
  }

  const typeMultiplier = getTypeMultiplier(category, subcategory, type);
  const conditionMultiplier = conditionMultipliers[condition] ?? conditionMultipliers.default ?? 1;
  const demandScore = demandScores[subcategory] ?? 5;
  const cost = Number(acquisitionCost) || 0;

  // Resale value in good working condition
  const baseValue = Math.round(basePrice * typeMultiplier);

  // Resale value as-is, in its current condition
  const estimatedValue = Math.round(baseValue * conditionMultiplier);

  // Severity is 0 for a working item and 1 at a 0.5 multiplier (a "typical" repair);
  // the 1.5 exponent makes severe damage climb faster than mild wear.
  const severity = Math.pow(Math.max(0, 1 - conditionMultiplier) / 0.5, 1.5);
  const fixCost = Math.round((averageFixCosts[subcategory] ?? 0) * severity);

  const postFixValue = baseValue;
  const profit = postFixValue - fixCost - cost;

  // Uncertainty lives in the sale price, so the range comes from the value range.
  const { lowValue, highValue } = getValueRange(postFixValue, subcategory);
  const lowProfit = lowValue - fixCost - cost;
  const highProfit = highValue - fixCost - cost;

  // Fixability Score (1-10): better condition = easier to fix, expensive repairs are penalized
  const complexityPenalty = fixCost > 50 ? 2 : fixCost > 25 ? 1 : 0;
  const fixabilityScore = Math.max(1, Math.min(10, Math.round(conditionMultiplier * 10 - complexityPenalty)));

  return {
    estimatedValue,
    fixCost,
    postFixValue,
    profit,
    lowProfit,
    highProfit,
    lowValue,
    highValue,
    demandScore,
    fixabilityScore,
    rating: getStarRating(profit, conditionMultiplier, demandScore),
    usedMarketData,
    marketSampleSize: usedMarketData ? marketSampleSize : 0,
  };
};

// Universal condition scale for items outside the curated category tables — applies to anything.
export const GENERIC_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];
const GENERIC_CONDITION_MULTIPLIERS = {
  Excellent: 1.0,
  Good: 0.85,
  Fair: 0.55,
  Poor: 0.25,
};

/**
 * Prices an item with no category/subcategory match, using only a live eBay market
 * signal and a universal condition tier. There's no repair-cost model here — for an
 * arbitrary item we have no real data on what fixing it costs, so this gives one
 * honest number (expected value as-is) rather than a fabricated fix-cost breakdown.
 *
 * @param {Object} params
 * @param {string} params.condition - One of GENERIC_CONDITIONS
 * @param {number} params.acquisitionCost - What the user paid for it
 * @param {number} [params.marketPrice] - Median asking price of comparable used eBay listings
 * @param {number} [params.marketSampleSize] - Number of listings behind marketPrice
 */
export const calculateGenericValuation = ({
  condition,
  acquisitionCost = 0,
  marketPrice = null,
  marketSampleSize = 0,
}) => {
  const cost = Number(acquisitionCost) || 0;

  if (!marketPrice || marketSampleSize < MIN_MARKET_SAMPLES) {
    return {
      estimatedValue: 0,
      fixCost: 0,
      postFixValue: 0,
      profit: -cost,
      lowProfit: -cost,
      highProfit: -cost,
      lowValue: 0,
      highValue: 0,
      demandScore: 0,
      fixabilityScore: null,
      rating: 0,
      usedMarketData: false,
      marketSampleSize: 0,
      insufficientData: true,
    };
  }

  const conditionMultiplier = GENERIC_CONDITION_MULTIPLIERS[condition] ?? GENERIC_CONDITION_MULTIPLIERS.Fair;
  const marketSignal = marketPrice * MARKET_ASKING_TO_SOLD_FACTOR;
  const estimatedValue = Math.round(marketSignal * conditionMultiplier);
  const postFixValue = estimatedValue;
  const profit = postFixValue - cost;

  // More comps behind the number = tighter confidence band.
  const variance = Math.max(0.12, Math.min(0.28, 0.30 - marketSampleSize * 0.01));
  const lowValue = Math.round(postFixValue * (1 - variance));
  const highValue = Math.round(postFixValue * (1 + variance));
  const lowProfit = lowValue - cost;
  const highProfit = highValue - cost;

  // No demand table exists for an arbitrary item — the number of live comparable
  // listings is used as a rough stand-in (more listings roughly tracks a bigger market).
  const demandScore = Math.max(1, Math.min(10, Math.round(marketSampleSize / 2)));

  return {
    estimatedValue,
    fixCost: 0,
    postFixValue,
    profit,
    lowProfit,
    highProfit,
    lowValue,
    highValue,
    demandScore,
    fixabilityScore: null,
    rating: getStarRating(profit, conditionMultiplier, demandScore),
    usedMarketData: true,
    marketSampleSize,
    insufficientData: false,
  };
};

// Recomputes a valuation from a saved inventory item, reusing the market data captured when it was logged.
export const valuationForItem = (item) => {
  if (item.isGeneric) {
    return calculateGenericValuation({
      condition: item.condition,
      acquisitionCost: item.acquisitionCost || 0,
      marketPrice: item.marketPrice,
      marketSampleSize: item.marketSampleSize,
    });
  }

  return calculateValuation({
    category: item.category,
    subcategory: item.subcategory,
    type: item.type,
    condition: item.condition,
    acquisitionCost: item.acquisitionCost || 0,
    marketPrice: item.marketPrice,
    marketSampleSize: item.marketSampleSize,
  });
};

/**
 * Determines flip worthiness (0-5 stars) - MUCH STRICTER
 * 5 stars should be rare - only excellent profit opportunities
 */
const getStarRating = (profit, conditionMultiplier, demandScore) => {
  let stars;

  if (profit < 0) {
    stars = 0;
  } else if (profit < 5) {
    stars = 1;
  } else if (profit < 15) {
    stars = 2;
  } else if (profit < 35) {
    stars = 3;
  } else if (profit < 75) {
    stars = 4;
  } else {
    stars = 5;
  }

  if (conditionMultiplier < 0.4 && stars > 0) {
    stars -= 1; // Very poor condition = high risk
  }

  if (demandScore < 4 && stars > 1) {
    stars -= 1; // Low demand = slow sale = risk
  }

  if (demandScore >= 8 && profit >= 50 && stars < 5) {
    stars += 1; // High demand + good profit = easier flip
  }

  return Math.max(0, Math.min(5, stars));
};
