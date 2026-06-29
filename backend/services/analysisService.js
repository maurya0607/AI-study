import { generateText, isAIConfigured } from '../utils/aiClient.js';

/**
 * Generate a Weakness Analysis report based on past quiz attempts.
 * @param {Array} quizAttempts - Array of past quiz attempts with score and total.
 * @returns {Promise<Object>} The analysis report with weakAreas, strongAreas, and recommendedActions.
 */
export async function analyzeWeakness(quizAttempts, provider = 'gemini') {
  if (!quizAttempts || quizAttempts.length === 0) {
    return {
      weakAreas: ["Not enough data"],
      strongAreas: ["Not enough data"],
      recommendedActions: ["Take more quizzes to generate insights"]
    };
  }

  if (!isAIConfigured) {
    return {
      weakAreas: ["Advanced Topics (Mock)"],
      strongAreas: ["Basic Concepts (Mock)"],
      recommendedActions: [
        "Review your recent notes",
        "Take another practice quiz"
      ]
    };
  }

  const prompt = `You are an expert AI tutor. 
Analyze the following quiz attempts and identify the user's weak areas, strong areas, and provide actionable recommendations.

Quiz Data (JSON):
${JSON.stringify(quizAttempts, null, 2)}

Return ONLY a raw JSON object with this exact structure (no markdown fences, no explanations):
{
  "weakAreas": ["Topic 1", "Topic 2"],
  "strongAreas": ["Topic 3"],
  "recommendedActions": ["Action 1", "Action 2"]
}`;

  try {
    const responseText = await generateText(prompt, { provider });
    
    // Parse the JSON directly
    let cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Failed to analyze weakness with AI:', error);
    
    // Fallback Mock Response
    return {
      weakAreas: ["Advanced Topics (Mock)"],
      strongAreas: ["Basic Concepts (Mock)"],
      recommendedActions: [
        "Review your recent notes",
        "Take another practice quiz"
      ]
    };
  }
}
