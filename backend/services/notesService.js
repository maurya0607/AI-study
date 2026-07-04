import { generateText, isAIConfigured } from '../utils/aiClient.js';
import { supabase, isConfigured as isSupabaseConfigured } from '../config/supabaseClient.js';
import crypto from 'crypto';

export async function generateNotes(documentId, documentText, style = 'detailed', provider = 'groq') {
  const noteStyle = style.toLowerCase();
  let notesContent = '';
  
  if (isAIConfigured) {
    try {
      const prompt = `
        You are an elite academic tutor. Analyze the following study text and generate structured notes in the style: "${noteStyle}".
        
        CRITICAL INSTRUCTIONS:
        - ALL notes MUST be derived STRICTLY and EXCLUSIVELY from the provided "Study Text Content".
        - DO NOT use any outside knowledge.
        - DO NOT invent or hallucinate facts. If the document is very short, output short notes.

        Note Styles to follow:
        - "summary": High-level overview, key themes, critical ideas, and a final wrap-up summary.
        - "detailed": Thorough, comprehensive breakdown of every major concept. Use hierarchy, bold key terms, add bullet lists, and define terminology.
        - "exam": Focus on high-yield exam points, potential test questions (Q&A format), critical equations or formulas, and quick revision cards.
        - "bullet": Minimalist, ultra-concise bulleted list of facts, terms, definitions, and key takeaways. No fluff.
        
        Write your output in clean, readable Markdown. Make it visually appealing with headers (h1, h2, h3), lists, blockquotes, and tables where helpful.
        Do not include any meta-commentary (like "Here are your notes:"). Start writing the notes directly.
        
        Study Text Content:
        """
        ${documentText.slice(0, 30000)}
        """
      `;
      
      notesContent = await generateText(prompt, { provider });
    } catch (error) {
      console.error('AI notes generation failed, falling back to mock:', error);
      notesContent = getMockNotes(style, documentText);
    }
  } else {

    notesContent = getMockNotes(style, documentText);
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        document_id: documentId,
        generated_notes: notesContent
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Database error saving notes: ${error.message}`);
    }
    return data;
  } else {

    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      generated_notes: notesContent,
      created_at: new Date().toISOString()
    };
  }
}

function getMockNotes(style, text) {
  const title = "Generated Study Notes";
  
  if (style === 'summary') {
    return `# 📝 ${title} (Summary Layout)

## Executive Summary
This document provides a conceptual overview of the uploaded learning material. The core focus is to distill primary concepts, identify core terminology, and establish relationships between key sections.

## Key Themes
1. **Core Concept Introduction**: The primary framework introduces fundamental definitions and foundational theories.
2. **Methodology & Systems**: Explains how components function relative to one another in real-world scenarios.
3. **Implications & Applications**: Explores critical outcomes, research directions, and modern industry use cases.

## Core Takeaways
> [!NOTE]
> Understanding the relationship between these foundational principles is essential for mastery of the subject matter.

- Distills complex definitions into digestible sub-categories.
- Integrates theoretical schemas with practical execution strategies.
- Promotes analytical comparison across different frameworks.

## Final Summary
In conclusion, the document serves as an entry point for advanced study, outlining the critical structures, systems, and practical limitations that students need to master.
`;
  } else if (style === 'exam') {
    return `# 🎓 ${title} (Exam Prep Layout)

## High-Yield Points
- **Foundational Rules**: Always prioritize foundational concepts when examining complex systems.
- **Key Equation**: $E = mc^2$ (or similar field-specific rules of action).
- **Core Process Flow**: Input $\\rightarrow$ Transformation $\\rightarrow$ Output Analysis.

## Practice Q&A (High-Probability Exam Questions)

**Q1: Explain the primary mechanism behind this system's main process.**
*A1:* The system functions via three discrete stages: initialization, execution, and review. Initialization reads local variables, execution parses the operational parameters, and review verifies correct execution.

**Q2: What is the main differentiator between these two processes?**
*A2:* Process A relies on static structures created during initialization, whereas Process B is highly dynamic and evaluates conditions in real-time.

## Revision Flashcards
- **Flashcard 1**: What is the root cause? (Answer: Environmental configuration mismatch).
- **Flashcard 2**: When is the system active? (Answer: During runtime execution).
`;
  } else if (style === 'bullet') {
    return `# 📌 ${title} (Concise Bullet Layout)

* **Introduction**: Foundations of the subject matter.
* **Key Definition 1**: Core system architecture operates on standard patterns.
* **Key Definition 2**: Modules communicate via interface endpoints.
* **Core Mechanisms**:
    * Phase 1: Context parsing
    * Phase 2: Text classification
    * Phase 3: Knowledge mapping
* **Critical Takeaways**:
    * Reduces overhead compared to legacy methods.
    * Highly adaptable to varied content inputs.
    * Relies on standard APIs.
* **Limitations**: Requires clear structured text inputs for maximum efficacy.
`;
  } else {

    return `# 📘 ${title} (Detailed Layout)

## Chapter 1: Introduction and Core Concepts
The text explores the fundamental principles governing this topic. At its core, the subject deals with the integration of structured theoretical knowledge and direct, real-world application. Understanding this duality is crucial for advanced study.

### 1.1 Key Definitions
- **Foundational Schema**: The blueprint or structural design representing the core system.
- **Dynamic Interface**: The responsive gateway enabling data and action exchange.
- **Validation Engine**: The sub-component tasked with checking credentials and parsing syntax.

---

## Chapter 2: Functional Mechanics and Workflow
How does this system function in practical scenarios? Let us walk through the operational workflow in a sequential manner:

\`\`\`mermaid
graph TD
    A["File Upload"] --> B["Text Extraction"]
    B --> C["Gemini AI Parsing"]
    C --> D["Database Insertion"]
    D --> E["Interactive UI Dashboard"]
\`\`\`

### 2.2 Deep Dive into AI Processing
1. **Extraction**: Reading raw text streams and purging special characters.
2. **Contextual Analysis**: Evaluating key themes and identifying vocabulary.
3. **Structured Mapping**: Generating structured markdown blocks, equations, and code blocks for study.

---

## Chapter 3: Critical Analysis & Summary
In this final analysis, we examine the efficacy, advantages, and notable limitations. The primary benefit lies in the rapid summarization of extensive documents, allowing learners to scan, quiz, and plan their study within minutes.
`;
  }
}
