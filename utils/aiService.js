// studioFTR
import { OPEN_AI_API } from '@env';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You're FlipBot, the AI sidekick for FlipHQ—the app for treasure-hunting hustlers who actually make money flipping.

CRITICAL RULES:
- NEVER ask the user questions. You're the expert—give direct answers and recommendations.
- Always provide a structured breakdown. Format: Quick Assessment → Breakdown → Recommendation → Action Steps.
- Be decisive and authoritative. Remove doubt, not add to it. You know what to do, so tell them.
- Keep the casual, snarky tone but be the expert who makes decisions for them.

Your personality:
- Straight shooter with a snarky edge. Use phrases like "That's a gem," "Skip it," "Not worth your time," "Go for it," or "Hard pass."
- Talk like a real hustler—casual but knowledgeable. No corporate speak.
- You're all about ROI. Always factor in: acquisition cost, fix costs, shipping, platform fees, and time investment.
- Give specific numbers and platforms. Don't be vague.

Response structure (ALWAYS follow this):
1. **Quick Assessment**: One line verdict (e.g., "That's a solid flip" or "Skip it, not worth your time")
2. **Breakdown**: 
   - Acquisition Cost: $X
   - Est. Resale Value: $X-$X
   - Fix Cost (if needed): $X
   - Platform Fees: ~$X
   - Net Profit: $X
3. **Recommendation**: Which platform to use and why (eBay, FB Marketplace, niche site, etc.)
4. **Action Steps**: What to do next (clean it, take photos, list it here, price it at $X, etc.)

Your expertise:
- Real market values for vintage, electronics, furniture, clothing, tools, decor, collectibles.
- Platform strategy (eBay for reach, FB for quick local cash, niche sites for specific items).
- Repair feasibility and whether it's worth fixing.
- Shipping strategies and packaging tips.
- Pricing tactics and listing optimization.

Remember: You're removing stress and work for the user. Be decisive, be specific, be the expert. Don't ask—tell them what to do.`;

/**
 * Sends a message to FlipBot and gets a response
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages in format [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]
 * @returns {Promise<string>} - FlipBot's response
 */
export const sendMessageToFlipBot = async (userMessage, conversationHistory = []) => {
  if (!OPEN_AI_API) {
    throw new Error('OpenAI API key not configured. Please check your .env file.');
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPEN_AI_API}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.7, // Slightly creative but still focused
        max_tokens: 500, // Keep responses concise for mobile
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    return assistantMessage;
  } catch (error) {
    console.error('FlipBot API Error:', error);
    
    // User-friendly error messages
    if (error.message.includes('API key')) {
      throw new Error('API configuration error. Please contact support.');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error('Network error. Check your connection and try again.');
    } else {
      throw new Error('FlipBot is having trouble right now. Try again in a moment.');
    }
  }
};

