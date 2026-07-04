import { generateText, isAIConfigured } from '../utils/aiClient.js';
import { supabase, isConfigured as isSupabaseConfigured } from '../config/supabaseClient.js';
import crypto from 'crypto';

export async function generateQuiz(documentId, documentText, quizType = 'MCQ', provider = 'groq') {
  const type = quizType.toUpperCase();
  let quizData = [];
  
  if (isAIConfigured) {
    try {
      const prompt = `
        You are an expert examiner. Analyze the following study text and generate a quiz containing exactly 5 questions of the type: "${type}".
        
        CRITICAL INSTRUCTIONS:
        - ALL questions, answers, and explanations MUST be derived STRICTLY and EXCLUSIVELY from the provided "Study Text Content".
        - DO NOT use any outside knowledge. If the text does not contain enough information, base the questions only on what is available.
        - DO NOT invent or hallucinate facts.

        Output MUST be a valid JSON array of objects. Do NOT include markdown code blocks like \`\`\`json. Return ONLY the raw JSON text.
        
        Formats:
        - For "MCQ" (Multiple Choice Questions):
          Each question object MUST have:
          - "question": string
          - "options": array of exactly 4 strings
          - "answer": string (must match exactly one of the options)
          - "explanation": string (explaining why the answer is correct)
        
        - For "TRUE/FALSE":
          Each question object MUST have:
          - "question": string
          - "options": ["True", "False"]
          - "answer": string ("True" or "False")
          - "explanation": string
          
        - For "FILL IN THE BLANKS":
          Each question object MUST have:
          - "question": string (use "_______" for the blank space)
          - "options": array of exactly 4 choices (including the correct answer)
          - "answer": string (the exact word that fills the blank)
          - "explanation": string
        
        Study Text Content:
        """
        ${documentText.slice(0, 30000)}
        """
      `;
      
      let rawText = (await generateText(prompt, { provider })).trim();

      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
      }
      
      quizData = JSON.parse(rawText);
    } catch (error) {
      console.error('AI quiz generation failed, falling back to mock:', error);
      quizData = getMockQuiz(type);
    }
  } else {
    quizData = getMockQuiz(type);
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        document_id: documentId,
        quiz_data: quizData
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Database error saving quiz: ${error.message}`);
    }
    return data;
  } else {

    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      quiz_data: quizData,
      created_at: new Date().toISOString()
    };
  }
}

function getMockQuiz(type) {
  if (type === 'TRUE/FALSE') {
    return [
      {
        question: "Supabase provides traditional backend servers to write custom REST APIs.",
        options: ["True", "False"],
        answer: "False",
        explanation: "Supabase is a serverless platform providing databases, auth, and storage without traditional server maintenance."
      },
      {
        question: "Row Level Security (RLS) restricts access to database records based on user credentials.",
        options: ["True", "False"],
        answer: "True",
        explanation: "Yes, RLS policies allow you to verify the active auth.uid() against the owner ID of the record."
      },
      {
        question: "Gemini API requires a paid enterprise license to use for developer prototyping.",
        options: ["True", "False"],
        answer: "False",
        explanation: "Google provides free-tier access keys for developer testing and prototyping with the Gemini API."
      },
      {
        question: "PostgreSQL databases are horizontally scalable out of the box without sharding.",
        options: ["True", "False"],
        answer: "False",
        explanation: "PostgreSQL scales vertically very well. Horizontal scaling usually requires sharding, read replicas, or distributed extensions."
      },
      {
        question: "The default file type supported by the AI Study Assistant is PDF.",
        options: ["True", "False"],
        answer: "True",
        explanation: "According to the specifications, the file storage service manages PDF uploads initially."
      }
    ];
  } else if (type === 'FILL IN THE BLANKS') {
    return [
      {
        question: "The backend of the AI Study Assistant is powered by _______.",
        options: ["Supabase", "Firebase", "AWS Lambda", "Docker"],
        answer: "Supabase",
        explanation: "Supabase provides the main database, storage, and authentication services for the app."
      },
      {
        question: "_______ is the primary model used for notes, quiz, and plan generation.",
        options: ["GPT-4", "Claude 3", "Gemini API", "Llama 3"],
        answer: "Gemini API",
        explanation: "The architecture specifies Gemini API as the engine behind AI text and planner workflows."
      },
      {
        question: "To secure database rows, Supabase relies on PostgreSQL's _______ feature.",
        options: ["Table Partitioning", "Views", "Row Level Security", "Foreign Keys"],
        answer: "Row Level Security",
        explanation: "Row Level Security (RLS) is standard for secure database architectures in serverless projects."
      },
      {
        question: "Frontend projects set up with Vite prepend environment keys with the keyword _______.",
        options: ["REACT_APP_", "VITE_", "ENV_", "NEXT_PUBLIC_"],
        answer: "VITE_",
        explanation: "Vite loads environmental variables matching the VITE_ prefix into import.meta.env."
      },
      {
        question: "The pdf-parse library extracts _______ content from PDF documents.",
        options: ["Image", "Table", "Structured JSON", "Plain Text"],
        answer: "Plain Text",
        explanation: "The pdf-parse tool reads binary PDF streams and returns raw unstructured text content."
      }
    ];
  } else {

    return [
      {
        question: "What primary benefit does Supabase offer over traditional Node/Express setups?",
        options: [
          "Accelerates development by offering database, auth, and storage as managed APIs",
          "Executes client JavaScript faster in the browser",
          "Replaces the frontend client routing engine",
          "Performs image classification tasks out of the box"
        ],
        answer: "Accelerates development by offering database, auth, and storage as managed APIs",
        explanation: "Supabase provides infrastructure as a service (IaaS), eliminating backend server configuration tasks."
      },
      {
        question: "Why should the Gemini API key be stored in the backend rather than the React client code?",
        options: [
          "It accelerates prompt generation speeds",
          "It prevents exposing sensitive private credentials to the client bundle",
          "React doesn't support environment variables",
          "It forces the model to use higher context parameters"
        ],
        answer: "It prevents exposing sensitive private credentials to the client bundle",
        explanation: "Keys compiled into frontends can be inspected by users. Keeping the key in node process environments keeps it private."
      },
      {
        question: "Which Supabase feature restricts users from viewing each other's uploaded materials?",
        options: [
          "Table Joins",
          "Primary Key Constraints",
          "Row Level Security (RLS)",
          "JWT Session Revocation"
        ],
        answer: "Row Level Security (RLS)",
        explanation: "RLS evaluates policies containing 'auth.uid() = user_id' on every query before returning rows."
      },
      {
        question: "What format does the quiz service prompt the Gemini API to respond in?",
        options: [
          "YAML configuration files",
          "Standard HTML templates",
          "Structured JSON arrays",
          "Plain Text paragraphs"
        ],
        answer: "Structured JSON arrays",
        explanation: "JSON is parsed by the Express server and returned to the React frontend to build the quiz interface."
      },
      {
        question: "In Supabase Storage, what matches the top-level categorization for files?",
        options: [
          "Tables",
          "Directories",
          "Buckets",
          "Databases"
        ],
        answer: "Buckets",
        explanation: "Files are stored in Buckets (e.g., 'study-materials'), within which folders and objects are created."
      }
    ];
  }
}
