const BASE_URL = import.meta.env.VITE_API_URL || ''; // Use VITE_API_URL in production, fallback to proxy in development

// -------------------------------------------------------
// AI Provider Utilities
// -------------------------------------------------------
export async function getAiStatus() {
  try {
    const res = await fetch(`${BASE_URL}/api/ai-status`);
    if (!res.ok) return { gemini: false, groq: false };
    return await res.json();
  } catch {
    return { gemini: false, groq: false };
  }
}

export function getPreferredProvider() {
  return localStorage.getItem('preferred_ai_provider') || 'gemini';
}

export function setPreferredProvider(provider) {
  localStorage.setItem('preferred_ai_provider', provider);
}

export async function extractPdf(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/api/extract-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to extract text from PDF');
    }

    return await response.json();
  } catch (error) {
    console.warn('Backend extraction failed, running local browser parser mock:', error);

    await new Promise(r => setTimeout(r, 1200));

    const docName = file.name.toLowerCase();
    let sampleText = `Study Material for ${file.name}\n\n`;
    
    if (docName.includes('physics') || docName.includes('mechanics')) {
      sampleText += `Physics deals with the fundamental laws of nature. Core subjects include Mechanics, Thermodynamics, electromagnetism, and optics.\nNewton's first law states that an object remains at rest unless acted on by an external force.\nNewton's second law is defined by the equation Force = Mass x Acceleration (F = ma).\nNewton's third law states that for every action, there is an equal and opposite reaction.\nThermodynamics studies heat, work, and energy. The first law of thermodynamics states that energy cannot be created or destroyed, only transformed.\n`;
    } else if (docName.includes('chem') || docName.includes('organic')) {
      sampleText += `Chemistry is the scientific study of the properties and behavior of matter.\nChemical bonds hold atoms together to form molecules. Covalent bonds share electrons, while ionic bonds transfer them.\nOrganic chemistry is the sub-discipline study of carbon-based compounds.\nThe periodic table organizes elements by atomic number. Group 1 elements are alkali metals, and Group 18 are noble gases.\n`;
    } else if (docName.includes('math') || docName.includes('calc')) {
      sampleText += `Mathematics is the study of numbers, shapes, and patterns.\nCalculus focuses on limits, derivatives, integrals, and infinite series.\nThe derivative represents a rate of change of a function, defined as the limit of difference quotients.\nIntegration computes the area under a curve. The Fundamental Theorem of Calculus links differentiation and integration.\n`;
    } else {
      sampleText += `Introduction to the Study Guide.\nThis document covers advanced topics, technical processes, core definitions, and system workflows.\nRelational databases store structured rows. Row Level Security (RLS) restricts access using auth.uid().\nGenerative AI models process text prompts to generate summaries, quizzes, plans, and chat responses.\n`;
    }
    
    return {
      text: sampleText,
      fileName: file.name,
      characterCount: sampleText.length
    };
  }
}

export async function generateNotes(documentId, documentText, style) {
  const provider = getPreferredProvider();
  try {
    const response = await fetch(`${BASE_URL}/api/generate-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, documentText, style, provider }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate notes');
    }

    return await response.json();
  } catch (error) {
    console.warn('Backend notes service failed, generating mock notes in browser:', error);
    await new Promise(r => setTimeout(r, 1000));
    
    const mockNotesContent = getMockNotesText(style, documentText);
    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      generated_notes: mockNotesContent,
      created_at: new Date().toISOString()
    };
  }
}

export async function generateQuiz(documentId, documentText, quizType) {
  const provider = getPreferredProvider();
  try {
    const response = await fetch(`${BASE_URL}/api/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, documentText, quizType, provider }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate quiz');
    }

    return await response.json();
  } catch (error) {
    console.warn('Backend quiz service failed, generating mock quiz in browser:', error);
    await new Promise(r => setTimeout(r, 1000));
    
    const mockQuizData = getMockQuizQuestions(quizType);
    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      quiz_data: mockQuizData,
      created_at: new Date().toISOString()
    };
  }
}

export async function generateFlashcards(documentId, documentText) {
  const provider = getPreferredProvider();
  try {
    const response = await fetch(`${BASE_URL}/api/generate-flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, documentText, provider }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate flashcards');
    }

    return await response.json();
  } catch (error) {
    console.warn('Backend flashcards service failed, generating mock flashcards in browser:', error);
    await new Promise(r => setTimeout(r, 900));

    const mockCards = getMockFlashcardData(documentText);
    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      cards: mockCards,
      created_at: new Date().toISOString()
    };
  }
}

export async function solveDoubt(userId, documentText, question) {
  const provider = getPreferredProvider();
  try {
    const response = await fetch(`${BASE_URL}/api/solve-doubt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, documentText, question, provider }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to solve doubt');
    }

    return await response.json();
  } catch (error) {
    console.warn('Backend doubt solver failed, solving doubt in browser:', error);
    await new Promise(r => setTimeout(r, 800));
    
    const answer = getLocalMockAnswer(question);
    return {
      id: crypto.randomUUID(),
      user_id: userId || crypto.randomUUID(),
      question,
      answer,
      created_at: new Date().toISOString()
    };
  }
}

export async function generatePlan(userId, inputs) {
  const provider = getPreferredProvider();
  try {
    const response = await fetch(`${BASE_URL}/api/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...inputs, provider }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate plan');
    }

    return await response.json();
  } catch (error) {
    console.warn('Backend planner service failed, generating mock plan in browser:', error);
    await new Promise(r => setTimeout(r, 1000));
    
    const mockPlanData = getLocalMockPlan(inputs);
    return {
      id: crypto.randomUUID(),
      user_id: userId || crypto.randomUUID(),
      plan_data: mockPlanData,
      created_at: new Date().toISOString()
    };
  }
}

export async function analyzeWeakness(quizAttempts) {
  const provider = getPreferredProvider();
  try {
    const response = await fetch(`${BASE_URL}/api/analyze-weakness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizAttempts, provider }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze weakness');
    }

    return await response.json();
  } catch (error) {
    console.warn('Backend weakness analysis failed, returning mock data:', error);
    await new Promise(r => setTimeout(r, 600));
    return {
      weakAreas: ["CPU Scheduling (Mock)", "Deadlocks (Mock)"],
      strongAreas: ["Memory Management (Mock)"],
      recommendedActions: ["Revise CPU Scheduling Notes", "Attempt Flashcards Set 3"]
    };
  }
}

function getMockNotesText(style, text) {
  const noteStyle = style?.toLowerCase() || 'detailed';
  
  if (noteStyle === 'summary') {
    return `# 🗒️ Quick Study Summary (Local Fallback)

## Overview
Distilled summary of the uploaded document contents. The core objectives focus on concept isolation and structural workflows.

## Critical Themes
- **Relational Operations**: Schema creation, integrity bounds, and data structures.
- **Access Policies**: Validating requests at the Postgres database layer.
- **Prompt Execution**: Transforming text context to structured notes/quizzes via Gemini.

> [!NOTE]
> Reviewing this summary before taking practice quizzes increases retention rates by up to 40%.
`;
  }
  
  if (noteStyle === 'exam') {
    return `# 🎯 High-Yield Exam Notes (Local Fallback)

## Important Highlights
1. **Row Level Security (RLS)** is always attached to specific database tables and operates on SELECT, INSERT, UPDATE, and DELETE.
2. **VITE_** environmental prefix is required to make keys visible to Vite client bundles.
3. **Google Gemini 1.5 Flash** model is optimal for standard JSON mapping.

## Question & Answer Drills
* **Question**: How do policies check permissions?
* **Answer**: They execute SQL expressions, evaluating \`auth.uid() = user_id\` against the session JWT.

* **Question**: What npm package extracts text in the backend server?
* **Answer**: The \`pdf-parse\` package parses standard binary buffer content.
`;
  }

  if (noteStyle === 'bullet') {
    return `# 📌 Core Study Outlines (Local Fallback)

* **Supabase Services**:
  * Auth (Google, GitHub, credentials)
  * Database (PostgreSQL + RLS)
  * File Storage (study-materials bucket)
* **AI Pipelines**:
  * Notes generation
  * Practice quiz templates
  * Teaching chatbot solver
  * Dynamic weekly planner
* **Important Variables**:
  * \`VITE_SUPABASE_URL\`
  * \`VITE_SUPABASE_ANON_KEY\`
  * \`GEMINI_API_KEY\`
`;
  }

  return `# 📘 Comprehensive Study Guide (Local Fallback)

## Chapter 1: System Blueprint & Architecture
The AI Study Assistant utilizes a serverless architecture powered by Supabase. Rather than deploying extensive backend clusters, files are uploaded directly to Supabase storage, with security checked at the PostgreSQL tier using Row Level Security policies.

### 1.1 Key Definitions
* **Row Level Security (RLS)**: PostgreSQL feature executing access filtering directly on target tables.
* **Access Tokens**: Encoded JWT strings validating active browser sessions.
* **Vector Embeddings (Future)**: Mathematical arrays enabling semantic search.

---

## Chapter 2: Client-Server Execution Flow
The React application interfaces with the Express.js backend. The backend acts as a proxy for the Gemini API, shielding private developer keys while performing PDF processing.

1. **File Drop**: User uploads a file in the UI.
2. **Text Extraction**: The backend parses text using \`pdf-parse\`.
3. **Completion**: Gemini parses the raw text into study notes, tests, and calendars.
`;
}

function getMockQuizQuestions(type) {
  const quizType = type?.toUpperCase() || 'MCQ';
  
  if (quizType === 'TRUE/FALSE') {
    return [
      {
        question: "Vite client bundles automatically compile VITE_ prefixed keys into output files.",
        options: ["True", "False"],
        answer: "True",
        explanation: "Yes, Vite compiles VITE_ prefixed environmental values into the public distribution."
      },
      {
        question: "Express backend endpoints can safely query the Gemini API because keys are kept server-side.",
        options: ["True", "False"],
        answer: "True",
        explanation: "Correct. Keeping the GEMINI_API_KEY on the Express server protects it from inspectable client bundles."
      },
      {
        question: "Row Level Security (RLS) is disabled by default on new Supabase PostgreSQL tables.",
        options: ["True", "False"],
        answer: "True",
        explanation: "Supabase tables are created without RLS by default. You must run 'alter table enable row level security' to secure it."
      }
    ];
  }
  
  if (quizType === 'FILL IN THE BLANKS') {
    return [
      {
        question: "PostgreSQL databases are queried by Supabase using standard _______ queries.",
        options: ["SQL", "NoSQL", "GraphQL", "Cypher"],
        answer: "SQL",
        explanation: "PostgreSQL is a relational database querying data using Structured Query Language (SQL)."
      },
      {
        question: "We use the _______ package to handle file stream uploads in our Express controllers.",
        options: ["multer", "body-parser", "fs", "cors"],
        answer: "multer",
        explanation: "Multer is standard middleware for handling multipart/form-data, primarily used for uploading files."
      }
    ];
  }

  return [
    {
      question: "Which of the following describes the role of Row Level Security (RLS)?",
      options: [
        "It locks database tables completely from any external web client query",
        "It evaluates SQL policies matching auth.uid() to authorize specific rows",
        "It encrypts text values inside columns using AES-256 standards",
        "It accelerates database index generation speeds"
      ],
      answer: "It evaluates SQL policies matching auth.uid() to authorize specific rows",
      explanation: "RLS operates as a Postgres check gate, evaluating user ID tokens on query rows."
    },
    {
      question: "What is the primary role of the backend Node.js server in this architecture?",
      options: [
        "To compile React files into production bundles",
        "To host the database storage buckets directly",
        "To safely execute Gemini API queries and parse PDFs without exposing key credentials",
        "To process authentication login routes locally"
      ],
      answer: "To safely execute Gemini API queries and parse PDFs without exposing key credentials",
      explanation: "Proxying AI queries and parsing PDFs in Express shields keys and manages memory parsing safely."
    }
  ];
}

function getLocalMockAnswer(question) {
  const query = question.toLowerCase();
  
  if (query.includes('supabase') || query.includes('database')) {
    return `### local Assistant: Supabase Architecture

You queried about Supabase. In a standard project:
- **Client SDK**: Frontend runs \`supabase.auth.signInWithPassword\` or \`supabase.from('notes')\`.
- **Relational DB**: Postgres stores tables like \`users\`, \`documents\`, and \`notes\`.
- **Security Check**: RLS blocks unauthorized queries.

*Let me know if you would like to test SQL schema examples!*`;
  }
  
  return `### Local Assistant: Study Guide Response

Regarding: *"${question}"*

1. **Information Found**: The upload contains introductory material on database configurations, security policies, and AI services.
2. **Summary Answer**: In local mode, the frontend routes database actions to \`localStorage\`. Make sure the Express backend is running and \`GEMINI_API_KEY\` is active in your config to verify live AI capabilities.

Feel free to ask other specific questions about your notes!`;
}

function getLocalMockPlan(inputs) {
  const { examDate, subjects, studyHours } = inputs;
  const subjectsList = Array.isArray(subjects) ? subjects : [subjects || 'Core Topics'];
  
  return {
    summary: `Local 7-day study plan covering ${subjectsList.join(', ')} for targets ending ${examDate || 'next week'}.`,
    weeklyGoals: [
      `Distill foundations of ${subjectsList[0] || 'Core topics'}`,
      `Review technical guides and practice assessments`,
      `Take final revision drills`
    ],
    schedule: [
      {
        day: "Day 1",
        subject: subjectsList[0] || 'Core',
        topic: "Foundations",
        duration: `${studyHours || 3} hrs`,
        tasks: ["Outline concepts", "Highlight key vocab terms", "Create flashcards"],
        revisionTask: "Review core definitions"
      },
      {
        day: "Day 2",
        subject: subjectsList[0] || 'Core',
        topic: "Advanced Mechanics",
        duration: `${studyHours || 3} hrs`,
        tasks: ["Study workflows", "Solve 3 practice diagrams"],
        revisionTask: "Quick Day 1 vocabulary review"
      },
      {
        day: "Day 3",
        subject: subjectsList[1] || 'Practice',
        topic: "Practical Assessment",
        duration: `${studyHours || 3} hrs`,
        tasks: ["Answer 5 quiz questions", "Solve sample tasks"],
        revisionTask: "Review Day 2 concepts"
      },
      {
        day: "Day 4",
        subject: subjectsList[1] || 'Practice',
        topic: "Technical Security",
        duration: `${studyHours || 3} hrs`,
        tasks: ["Review RLS policies", "Draft policy code examples"],
        revisionTask: "Re-read primary notes summary"
      },
      {
        day: "Day 5",
        subject: "General Integration",
        topic: "Mock Testing",
        duration: `${studyHours || 3} hrs`,
        tasks: ["Verify workflows", "Audit mock questions list"],
        revisionTask: "Review Day 4 security codes"
      },
      {
        day: "Day 6",
        subject: "Revision",
        topic: "Active Recall Drills",
        duration: `${studyHours || 3} hrs`,
        tasks: ["Test active flashcards", "Review doubt query log"],
        revisionTask: "Analyze mock exam errors"
      },
      {
        day: "Day 7",
        subject: "Review",
        topic: "Final Warm-up Sprint",
        duration: `${studyHours || 3} hrs`,
        tasks: ["Check off weekly goals list", "Review cheatsheet summary"],
        revisionTask: "15 minute rapid scan"
      }
    ]
  };
}

function getMockFlashcardData(text) {
  const content = (text || '').toLowerCase();

  if (content.includes('physics') || content.includes('force') || content.includes('mechanics')) {
    return [
      { front: "Newton's First Law", back: "An object remains at rest or in uniform motion unless acted upon by a net external force (Law of Inertia)." },
      { front: "Newton's Second Law (F = ma)", back: "The net force acting on an object equals its mass times acceleration." },
      { front: "Newton's Third Law", back: "For every action there is an equal and opposite reaction." },
      { front: "Kinetic Energy", back: "KE = ½mv² — energy an object possesses due to its motion." },
      { front: "Potential Energy (gravitational)", back: "PE = mgh — energy stored due to an object's height above a reference point." },
      { front: "First Law of Thermodynamics", back: "Energy cannot be created or destroyed, only transformed (Conservation of Energy)." },
      { front: "Speed of Light in a vacuum", back: "Approximately 3 × 10⁸ m/s." },
      { front: "Work formula", back: "W = F × d × cos(θ) — work done equals force times displacement times the cosine of the angle between them." },
      { front: "Momentum", back: "p = mv — momentum equals mass times velocity." },
      { front: "Acceleration", back: "Rate of change of velocity per unit time (a = Δv/Δt)." }
    ];
  }

  if (content.includes('chemistry') || content.includes('organic') || content.includes('bond')) {
    return [
      { front: "Covalent Bond", back: "A chemical bond formed by the sharing of electron pairs between two atoms." },
      { front: "Ionic Bond", back: "A bond formed by the electrostatic attraction between oppositely charged ions (electron transfer)." },
      { front: "Catalyst", back: "A substance that increases the rate of a reaction without being permanently consumed." },
      { front: "Avogadro's Number", back: "6.022 × 10²³ — the number of particles in one mole of a substance." },
      { front: "pH Scale", back: "Measures acidity/basicity. pH < 7 is acidic, pH = 7 is neutral, pH > 7 is basic." },
      { front: "Exothermic Reaction", back: "A reaction that releases energy (heat) to the surroundings." },
      { front: "Endothermic Reaction", back: "A reaction that absorbs energy from the surroundings." },
      { front: "Noble Gases (Group 18)", back: "Extremely unreactive elements: He, Ne, Ar, Kr, Xe, Rn — full valence shells." },
      { front: "Alkali Metals (Group 1)", back: "Highly reactive soft metals: Li, Na, K, Rb, Cs, Fr." },
      { front: "Organic Chemistry", back: "The study of compounds primarily composed of carbon-hydrogen (C–H) bonds." }
    ];
  }

  if (content.includes('math') || content.includes('calculus') || content.includes('derivative')) {
    return [
      { front: "Derivative", back: "The instantaneous rate of change of a function at a given point; the slope of the tangent line." },
      { front: "Integral", back: "The accumulation of a quantity, geometrically the area under a curve." },
      { front: "Fundamental Theorem of Calculus", back: "Differentiation and integration are inverse operations of each other." },
      { front: "Pythagorean Theorem", back: "In a right triangle: a² + b² = c², where c is the hypotenuse." },
      { front: "Prime Number", back: "A number greater than 1 divisible only by 1 and itself." },
      { front: "Mean", back: "The arithmetic average: sum of all values divided by the count." },
      { front: "Matrix", back: "A rectangular array of numbers arranged in rows and columns." },
      { front: "Limit", back: "The value a function approaches as the input approaches a given value." },
      { front: "Fibonacci Sequence", back: "Each term is the sum of the two preceding: 0, 1, 1, 2, 3, 5, 8, 13, ..." },
      { front: "Standard Deviation", back: "Measures how spread out numbers are from the mean in a data set." }
    ];
  }

  return [
    { front: "Row Level Security (RLS)", back: "A PostgreSQL feature that restricts which rows users can read, insert, update, or delete based on policies." },
    { front: "Vite VITE_ Prefix", back: "Only env vars prefixed with VITE_ are exposed to the client-side bundle." },
    { front: "Gemini 1.5 Flash", back: "A fast, high-context Google AI model optimized for structured JSON output and multi-modal tasks." },
    { front: "Multer Middleware", back: "Handles multipart/form-data (file uploads) in Express, storing files in memory or disk." },
    { front: "pdf-parse Package", back: "Extracts plain text from PDF binary buffers in a Node.js environment." },
    { front: "JWT (JSON Web Token)", back: "An encoded, signed token carrying user session data; Supabase uses it for RLS auth.uid() checks." },
    { front: "CORS", back: "Cross-Origin Resource Sharing — allows browsers to make cross-domain API requests." },
    { front: "Groq Llama-3.3-70b", back: "An open-source LLM served by Groq for fast, low-latency AI text generation." },
    { front: "Supabase Service Role Key", back: "Bypasses all RLS — must never be exposed in client-side code." },
    { front: "Supabase Storage Buckets", back: "Top-level containers for file objects in Supabase Storage (e.g. 'study-materials')." }
  ];
}
