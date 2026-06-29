import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = process.env.GROQ_API_KEY;

export const isGroqConfigured = !!apiKey;

const groq = isGroqConfigured ? new Groq({ apiKey }) : null;

export async function generateText(prompt, model = 'llama-3.3-70b-versatile') {
  if (!groq) throw new Error('Groq client is not configured.');

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model,
    temperature: 0.7,
    max_tokens: 4096,
  });

  return completion.choices[0]?.message?.content || '';
}

if (!isGroqConfigured) {
  console.log('⚠️ GROQ_API_KEY not found. AI services are in Mock mode.');
} else {
  console.log('✅ Groq AI client successfully initialized (llama-3.3-70b-versatile).');
}
