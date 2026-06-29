import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = process.env.GEMINI_API_KEY;

export const isGeminiConfigured = !!apiKey;

const genAI = isGeminiConfigured ? new GoogleGenerativeAI(apiKey) : null;

export function getGeminiModel(modelName = 'gemini-2.5-flash') {
  if (!genAI) {
    return null;
  }
  return genAI.getGenerativeModel({ model: modelName });
}

if (!isGeminiConfigured) {
  console.log('⚠️ GEMINI_API_KEY not found. AI services are in Mock mode.');
} else {
  console.log('✅ Gemini API client successfully initialized.');
}
