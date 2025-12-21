// FTR Labs
import {
  basePrices,
  averageFixCosts,
  getTypeMultiplier,
  conditionMultipliers,
  demandScores,
} from '../constants/valuationMetadata';

/**
 * Calculates the valuation and profit breakdown for an item with ranges.
 * 
 * Logic:
 * 1. Base Price: Standard resale value for the subcategory.
 * 2. Type Adjustment: Category-aware multiplier (vintage/modern/etc.)
 * 3. Condition Adjustment: Multiplier based on physical issues.
 * 4. Fix Cost: Estimated repair cost, adjusted by condition severity.
 * 5. Profit: Post-Fix Value - Fix Cost - Acquisition Cost.
 * 
 * @param {Object} params
 * @param {string} params.category - e.g. 'electronics', 'furniture' (required)
 * @param {string} params.subcategory - e.g. 'phone', 'jacket'
 * @param {string} params.type - e.g. 'vintage', 'modern'
 * @param {string} params.condition - e.g. 'Cracked Screen'
 * @param {number} params.acquisitionCost - What the user paid for it
 * @returns {Object} Valuation breakdown with ranges
 */
export const calculateValuation = ({ category, subcategory, type, condition, acquisitionCost = 0 }) => {
  const basePrice = basePrices[subcategory] ?? 0;
  const typeMultiplier = getTypeMultiplier(category, subcategory, type);
  const conditionMultiplier = conditionMultipliers[condition] ?? conditionMultipliers.default ?? 1;
  const demandScore = demandScores[subcategory] ?? 5;

  // Resale value if the item were in good/refurbished condition
  const baseValue = Math.round(basePrice * typeMultiplier);
  
  // Current resale value in its existing condition
  const estimatedValue = Math.round(baseValue * conditionMultiplier);

  // FIXED: Cost to bring it back to "Base Value"
  // Worse condition (lower multiplier) = higher fix cost
  const averageFixCost = averageFixCosts[subcategory] ?? 0;
  const conditionSeverity = 1 / conditionMultiplier; // 0.3 condition = 3.33x severity
  const fixCost = Math.round(averageFixCost * conditionSeverity);
  
  // What we expect to sell it for after fixing
  const postFixValue = baseValue;

  // Base Profit logic
  const profit = postFixValue - fixCost - Number(acquisitionCost);

  // Dynamic variance based on demand (high demand = less variance)
  const baseVariance = 0.15;
  const demandAdjustment = (10 - demandScore) / 10 * 0.05; // Lower demand = more variance
  const variance = Math.max(0.10, Math.min(0.25, baseVariance + demandAdjustment));
  
  const lowProfit = Math.round(profit * (1 - variance));
  const highProfit = Math.round(profit * (1 + variance));
  const lowValue = Math.round(postFixValue * (1 - variance));
  const highValue = Math.round(postFixValue * (1 + variance));

  // Fixability Score (1-10)
  // Higher multiplier means better condition = easier to fix
  const fixabilityBase = conditionMultiplier * 10;
  // Some categories are inherently harder
  const complexityPenalty = fixCost > 50 ? 2 : fixCost > 25 ? 1 : 0;
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
    rating: getStarRating(profit, conditionMultiplier, demandScore),
  };
};

/**
 * Determines flip worthiness (0-5 stars) - MUCH STRICTER
 * 5 stars should be rare - only excellent profit opportunities
 */
const getStarRating = (profit, conditionMultiplier, demandScore) => {
  let stars;
  
  // Base rating on profit (much stricter thresholds)
  if (profit < 0) {
    stars = 0; // Losing money
  } else if (profit < 5) {
    stars = 1; // Tiny profit, barely worth it
  } else if (profit < 15) {
    stars = 2; // Small profit
  } else if (profit < 35) {
    stars = 3; // Decent profit
  } else if (profit < 75) {
    stars = 4; // Good profit
  } else {
    stars = 5; // Excellent profit (should be rare)
  }
  
  // Penalties for risk factors
  if (conditionMultiplier < 0.4 && stars > 0) {
    stars -= 1; // Very poor condition = high risk
  }
  
  if (demandScore < 4 && stars > 1) {
    stars -= 1; // Low demand = slow sale = risk
  }
  
  // Bonus for high-demand items with good profit
  if (demandScore >= 8 && profit >= 50 && stars < 5) {
    stars += 1; // High demand + good profit = easier flip
  }
  
  return Math.max(0, Math.min(5, stars));
};
