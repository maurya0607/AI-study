import { generateText, isAIConfigured } from '../utils/aiClient.js';
import { supabase, isConfigured as isSupabaseConfigured } from '../config/supabaseClient.js';
import crypto from 'crypto';

export async function solveDoubt(userId, documentText, question, provider = 'gemini') {
  let answerContent = '';
  
  if (isAIConfigured) {
    try {
      const prompt = `
        You are an expert teaching assistant. A student has a doubt about the study material.
        
        CRITICAL INSTRUCTIONS:
        - ALL answers MUST be derived STRICTLY and EXCLUSIVELY from the provided "Study Text Context".
        - DO NOT use any outside knowledge. If the question cannot be answered using the context, you MUST reply: "I'm sorry, but this information is not covered in the uploaded document."
        - DO NOT invent or hallucinate facts.
        
        Make your response highly readable. Use formatting, bold keywords, code blocks, lists, or equations where appropriate.
        
        Study Text Context:
        """
        ${documentText.slice(0, 30000)}
        """
        
        Student's Question:
        "${question}"
      `;
      
      answerContent = await generateText(prompt, { provider });
    } catch (error) {
      console.error('AI doubt solving failed:', error);
      answerContent = "⚠️ AI Error: " + (error.message || "Something went wrong while connecting to the AI model. Please try again or check your API key / Rate Limits.");
    }
  } else {
    answerContent = getMockAnswer(question, documentText);
  }

  if (isSupabaseConfigured && userId) {
    try {
      const { data, error } = await supabase
        .from('doubts')
        .insert({
          user_id: userId,
          question: question,
          answer: answerContent
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (dbError) {
      console.warn('[Doubt DB] Could not save to database (table may not exist yet):', dbError.message);
    }
  }

  return {
    id: crypto.randomUUID(),
    user_id: userId || crypto.randomUUID(),
    question: question,
    answer: answerContent,
    created_at: new Date().toISOString()
  };
}

function getMockAnswer(question, text) {
  const query = question.toLowerCase();

  if (query.includes('supabase') || query.includes('database')) {
    return `### Supabase & PostgreSQL Architecture

Based on your question about **Supabase**, here is a breakdown of the key concepts from your study materials:

1. **PostgreSQL Database**: Supabase is built on top of Postgres, which is a highly stable relational database.
2. **Serverless APIs**: Instead of writing manual endpoints, Supabase automatically generates REST and Realtime endpoints from your table definitions.
3. **Security**: Row Level Security (RLS) is used to verify tokens (JWTs) and restrict access to records dynamically.

**Example Policy Schema:**
\`\`\`sql
create policy "Users can update own rows"
on target_table
for update
using (auth.uid() = user_id);
\`\`\`

*Is there anything specific about database migrations or policy configurations you'd like to explore further?*`;
  }
  
  if (query.includes('gemini') || query.includes('ai') || query.includes('model')) {
    return `### Gemini AI Integration

The system uses **Gemini 1.5 Flash** as its primary language model.

* **Key Strengths**: It offers a high context window (up to 1 million tokens), fast response speeds, and excellent support for structured JSON generation.
* **Service Flow**:
    1. A document is uploaded.
    2. Text is extracted via the backend helper.
    3. The text, style templates, and context are packaged into a prompt.
    4. Gemini returns the processed notes, quiz JSON, or answers doubts.

> [!TIP]
> Ensure your \`GEMINI_API_KEY\` is loaded in the backend process environment variables (\`.env\`) to enable live responses!`;
  }

  if (query.includes('auth') || query.includes('login') || query.includes('signup')) {
    return `### Supabase Authentication Service

The **Authentication Service** manages user authentication securely using JWT (JSON Web Tokens).

* **OAuth Integration**: Supports Google, GitHub, and email/password sign-in out of the box.
* **Token Workflow**:
  1. Client sends credentials.
  2. Supabase issues a session access token.
  3. Access tokens are attached to client queries.
  4. PostgreSQL database verifies token signatures and parses \`auth.uid()\` inside RLS checks.`;
  }

  return `### AI Doubt Solver Response

You asked: *"${question}"*

Here is an analysis based on standard concepts in the study materials:

1. **Context Analysis**: Your document covers fundamental software architecture guidelines, relational database systems (Supabase), and AI services (Gemini).
2. **Key Concepts**:
   - **Authentication**: Verification of identity via token handshakes.
   - **RLS**: Access authorization at the database tier.
   - **Extraction**: Extracting text streams from raw documents.
3. **Explanation**: To resolve this, make sure all services are properly initialized, environment variables are loaded, and appropriate network routes are open.

Please let me know if you would like me to detail any specific section of your uploaded documents!`;
}
