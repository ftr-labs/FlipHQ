// FTR Labs
import {
  basePrices,
  averageFixCosts,
  typeMultipliers,
  conditionMultipliers,
  demandScores,
} from '../constants/valuationMetadata';

/**
 * Calculates the valuation and profit breakdown for an item with ranges.
 * 
 * Logic:
 * 1. Base Price: Standard resale value for the subcategory.
 * 2. Type Adjustment: Multiplier based on vintage/modern/etc.
 * 3. Condition Adjustment: Multiplier based on physical issues.
 * 4. Fix Cost: Estimated repair cost, adjusted by condition.
 * 5. Profit: Post-Fix Value - Fix Cost - Acquisition Cost.
 * 
 * @param {Object} params
 * @param {string} params.subcategory - e.g. 'phone', 'jacket'
 * @param {string} params.type - e.g. 'vintage', 'modern'
 * @param {string} params.condition - e.g. 'Cracked Screen'
 * @param {number} params.acquisitionCost - What the user paid for it
 * @returns {Object} Valuation breakdown with ranges
 */
export const calculateValuation = ({ subcategory, type, condition, acquisitionCost = 0 }) => {
  const basePrice = basePrices[subcategory] ?? 0;
  const typeMultiplier = typeMultipliers[type] ?? 1;
  const conditionMultiplier = conditionMultipliers[condition] ?? conditionMultipliers.default ?? 1;
  const demandScore = demandScores[subcategory] ?? 5;

  // Resale value if the item were in good/refurbished condition
  const baseValue = Math.round(basePrice * typeMultiplier);
  
  // Current resale value in its existing condition
  const estimatedValue = Math.round(baseValue * conditionMultiplier);

  // Cost to bring it back to "Base Value"
  const averageFixCost = averageFixCosts[subcategory] ?? 0;
  const fixCost = Math.round(averageFixCost / conditionMultiplier);
  
  // What we expect to sell it for after fixing
  const postFixValue = baseValue;

  // Base Profit logic
  const profit = postFixValue - fixCost - Number(acquisitionCost);

  // Range Logic (±15%)
  const variance = 0.15;
  const lowProfit = Math.round(profit * (1 - variance));
  const highProfit = Math.round(profit * (1 + variance));
  const lowValue = Math.round(postFixValue * (1 - variance));
  const highValue = Math.round(postFixValue * (1 + variance));

  // Fixability Score (1-10)
  // Higher multiplier means better condition = easier to fix
  const fixabilityBase = conditionMultiplier * 10;
  // Some categories are inherently harder
  const complexityPenalty = fixCost > 50 ? 2 : 0;
  const fixabilityScore = Math.max(1, Math.min(10, Math.round(fixabilityBase - complexityPenalty)));

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
    rating: getStarRating(profit, conditionMultiplier),
  };
};

/**
 * Determines flip worthiness (0-5 stars)
 */
const getStarRating = (profit, conditionMultiplier) => {
  let stars;
  if (profit < 0) stars = 0;
  else if (profit < 10) stars = 1;
  else if (profit < 20) stars = 2;
  else if (profit < 35) stars = 3;
  else if (profit < 60) stars = 4;
  else stars = 5;

  // Penalty for extremely poor condition as it increases risk
  if (conditionMultiplier < 0.4 && stars > 0) {
    stars -= 1;
  }
  return stars;
};
