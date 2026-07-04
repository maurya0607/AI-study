import { generateText, isAIConfigured } from '../utils/aiClient.js';
import { supabase, isConfigured as isSupabaseConfigured } from '../config/supabaseClient.js';
import crypto from 'crypto';

export async function generateFlashcards(documentId, documentText, provider = 'groq') {
  let flashcardData = [];
  
  if (isAIConfigured) {
    try {
      const prompt = `
        You are an elite academic tutor. Analyze the following study text and generate exactly 10 study flashcards for revision.
        
        CRITICAL INSTRUCTIONS:
        - ALL flashcards MUST be derived STRICTLY and EXCLUSIVELY from the provided "Study Text Content".
        - DO NOT use any outside knowledge.
        - DO NOT invent or hallucinate facts.

        The output MUST be a valid JSON array of objects. Do NOT wrap it in markdown code blocks like \`\`\`json. Return ONLY raw JSON text.
        
        Each object in the array MUST represent a single flashcard and contain exactly two fields:
        1. "front": A concise, clear question, key terminology term, or formula query. Keep it brief.
        2. "back": A clear, comprehensive, and easy-to-recall answer, definition, or explanation.
        
        Ensure the questions cover a mix of definitions, key concepts, and processes.
        
        Study Text Content:
        """
        ${documentText.slice(0, 30000)}
        """
      `;
      
      let rawText = (await generateText(prompt, { provider })).trim();

      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
      }
      
      flashcardData = JSON.parse(rawText);
    } catch (error) {
      console.error('AI flashcards generation failed, falling back to mock:', error);
      flashcardData = getMockFlashcards(documentText);
    }
  } else {
    flashcardData = getMockFlashcards(documentText);
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        document_id: documentId,
        cards: flashcardData
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Database error saving flashcards: ${error.message}`);
    }
    return data;
  } else {

    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      cards: flashcardData,
      created_at: new Date().toISOString()
    };
  }
}

function getMockFlashcards(text) {
  const content = (text || '').toLowerCase();
  
  if (content.includes('physics') || content.includes('mechanics') || content.includes('force')) {
    return [
      { front: "Newton's First Law", back: "An object remains at rest or in uniform motion unless acted upon by a net external force (Inertia)." },
      { front: "Newton's Second Law Equation", back: "Force equals Mass times Acceleration (F = ma)." },
      { front: "Newton's Third Law", back: "For every action, there is an equal and opposite reaction." },
      { front: "First Law of Thermodynamics", back: "Energy cannot be created or destroyed, only transformed (Conservation of Energy)." },
      { front: "Acceleration", back: "The rate of change of velocity per unit of time." },
      { front: "Kinetic Energy Formula", back: "KE = 0.5 * m * v^2, where m is mass and v is velocity." },
      { front: "Potential Energy Formula", back: "PE = m * g * h, where m is mass, g is gravitational acceleration, and h is height." },
      { front: "Work", back: "Work is done when a force acts on an object and causes it to displace. W = F * d * cos(theta)." },
      { front: "Entropy", back: "A measure of the system's thermal energy per unit temperature that is unavailable for doing useful work; represents disorder." },
      { front: "Speed of Light", back: "Approximately 300,000 km/s (or 3 * 10^8 m/s) in a vacuum." }
    ];
  }
  
  if (content.includes('chemistry') || content.includes('organic') || content.includes('bond')) {
    return [
      { front: "Covalent Bond", back: "A chemical bond that involves the sharing of electron pairs between atoms." },
      { front: "Ionic Bond", back: "A chemical bond formed through the electrostatic attraction between oppositely charged ions (electron transfer)." },
      { front: "Organic Chemistry", back: "The scientific study of the structure, properties, and reactions of organic compounds containing carbon." },
      { front: "Group 18 Elements", back: "Noble gases (He, Ne, Ar, Kr, Xe, Rn) which are extremely unreactive due to full valence shells." },
      { front: "Group 1 Elements", back: "Alkali metals (Li, Na, K, Rb, Cs, Fr) which are highly reactive, soft metals." },
      { front: "Catalyst", back: "A substance that increases the rate of a chemical reaction without undergoing any permanent chemical change." },
      { front: "Exothermic Reaction", back: "A reaction that releases energy in the form of heat or light." },
      { front: "Endothermic Reaction", back: "A reaction that absorbs energy from its surroundings." },
      { front: "pH Value of Acid", back: "A pH value less than 7 indicates an acidic solution." },
      { front: "Avogadro's Number", back: "6.022 * 10^23, representing the number of constituent particles (usually molecules or atoms) in one mole." }
    ];
  }

  if (content.includes('math') || content.includes('calculus') || content.includes('derivative')) {
    return [
      { front: "Derivative", back: "Represents the rate of change of a function, defined as the limit of difference quotients." },
      { front: "Integral", back: "Computes the accumulation of quantities, geometrically representing the area under a curve." },
      { front: "Fundamental Theorem of Calculus", back: "Links differentiation and integration, showing they are inverse operations." },
      { front: "Limit", back: "The value that a function or sequence approaches as the input or index approaches some value." },
      { front: "Prime Number", back: "A whole number greater than 1 whose only divisors are 1 and itself." },
      { front: "Pythagorean Theorem", back: "In a right-angled triangle, the square of the hypotenuse is equal to the sum of squares of the other two sides (a^2 + b^2 = c^2)." },
      { front: "Matrix", back: "A rectangular array of numbers, symbols, or expressions, arranged in rows and columns." },
      { front: "Function", back: "A relation that associates each element of a set (domain) with exactly one element of another set (codomain)." },
      { front: "Fibonacci Sequence", back: "A sequence of numbers where each number is the sum of the two preceding ones, starting from 0 and 1." },
      { front: "Mean vs. Median", back: "Mean is the numerical average of data; Median is the middle value when data is sorted sequentially." }
    ];
  }

  return [
    { front: "Row Level Security (RLS)", back: "A PostgreSQL database feature that controls access to specific rows in a table based on user permissions or roles." },
    { front: "Vite Environment Variables Prefix", back: "Vite client-side variables must be prefixed with 'VITE_' to be injected into the client bundle." },
    { front: "Google Gemini 1.5 Flash Model", back: "Optimized for speed, high-volume tasks, and complex structured JSON output configurations." },
    { front: "Multer Middleware Role", back: "Handles multipart/form-data requests in Express, allowing file uploads by storing buffers in memory or disk." },
    { front: "pdf-parse Package Function", back: "Parses binary PDF file streams and extracts plain text content sequentially." },
    { front: "JWT Access Token", back: "JSON Web Token containing encoded, signed user session details. Supabase parses these to authenticate requests." },
    { front: "SQL 'alter table enable row level security'", back: "Enables RLS on a PostgreSQL table, forcing all subsequent queries to satisfy RLS policies." },
    { front: "Groq AI Client Model Name", back: "Llama-3.3-70b-versatile, which is highly efficient for general text reasoning prompts." },
    { front: "CORS (Cross-Origin Resource Sharing)", back: "A security protocol allowing browsers to make cross-domain resource requests to our Express API." },
    { front: "Supabase Service Role Key Warning", back: "The service_role key bypasses RLS policies and must NEVER be exposed in client-side code." }
  ];
}
