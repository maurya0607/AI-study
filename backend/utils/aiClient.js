import { isGroqConfigured, generateText as generateGroqText } from './groqClient.js';
import { isGeminiConfigured, getGeminiModel } from './geminiClient.js';

export { isGroqConfigured, isGeminiConfigured };
export const isAIConfigured = isGroqConfigured || isGeminiConfigured;

/**
 * Generates text using the preferred AI provider.
 * Falls back to the alternative provider if the preferred one is not configured.
 * 
 * @param {string} prompt The text prompt
 * @param {Object|string} options Options containing preferred provider ('gemini' | 'groq') and model, or a model string (for backward compatibility)
 * @returns {Promise<string>} Generated text
 */
export async function generateText(prompt, options = {}) {
  if (!isAIConfigured) {
    throw new Error('No AI client is configured. Provide either GEMINI_API_KEY or GROQ_API_KEY.');
  }

  // Handle case where options is a string (for backward compatibility, e.g. analyzeWeakness)
  let provider = 'groq';
  let modelName = null;

  if (typeof options === 'string') {
    // If it's a groq model, use groq, else use gemini
    if (options.includes('llama') || options.includes('groq')) {
      provider = 'groq';
    }
    modelName = options;
  } else if (options && typeof options === 'object') {
    provider = options.provider || 'groq';
    modelName = options.model;
  }

  provider = provider.toLowerCase();

  // Fallback checks
  if (provider === 'groq' && !isGroqConfigured) {
    console.log('⚠️ Groq is requested but not configured. Falling back to Gemini.');
    provider = 'gemini';
  } else if (provider === 'gemini' && !isGeminiConfigured) {
    console.log('⚠️ Gemini is requested but not configured. Falling back to Groq.');
    provider = 'groq';
  }

  if (provider === 'gemini') {
    try {
      const geminiModel = getGeminiModel(modelName || 'gemini-2.5-flash');
      if (!geminiModel) {
        throw new Error('Gemini client is not initialized.');
      }
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text() || '';
    } catch (geminiError) {
      console.error('❌ Gemini API call failed:', geminiError.message);
      // Auto-fallback to Groq if available
      if (isGroqConfigured) {
        console.log('🔄 Auto-falling back to Groq after Gemini failure...');
        return await generateGroqText(prompt, modelName || 'llama-3.3-70b-versatile');
      }
      throw geminiError;
    }
  } else {
    // Groq
    return await generateGroqText(prompt, modelName || 'llama-3.3-70b-versatile');
  }
}
