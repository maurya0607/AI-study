import { generateText, isAIConfigured } from '../utils/aiClient.js';
import { supabase, isConfigured as isSupabaseConfigured } from '../config/supabaseClient.js';
import crypto from 'crypto';

export async function generatePlan(userId, inputs, provider = 'groq') {
  const { examDate, subjects, studyHours, learningGoals } = inputs;
  let planData = {};
  
  if (isAIConfigured) {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const subjectsStr = Array.isArray(subjects) ? subjects.join(', ') : subjects;
      
      const prompt = `
        You are an expert academic advisor. Generate a personalized 7-day study plan based on the following student details:
        - Current Date: ${currentDate}
        - Exam Target Date: ${examDate || 'Flexible'}
        - Subjects to Study: ${subjectsStr}
        - Available Study Time: ${studyHours || 2} hours per day
        - Student Objectives/Goals: "${learningGoals || 'Master all topics'}"
        
        The output MUST be a valid JSON object. Do NOT wrap it in markdown code blocks like \`\`\`json. Return ONLY raw JSON text.
        
        The JSON structure MUST follow this exact schema:
        {
          "summary": "A 1-2 sentence encouraging strategy summary.",
          "weeklyGoals": ["Goal 1", "Goal 2", "Goal 3"],
          "schedule": [
            {
              "day": "Day 1",
              "subject": "Subject Name",
              "topic": "Core Topic",
              "duration": "${studyHours || 2} hours",
              "tasks": [
                "Specific actionable task 1",
                "Specific actionable task 2",
                "Specific actionable task 3"
              ],
              "revisionTask": "Revision task from previous concepts"
            }
          ]
        }
      `;
      
      let rawText = (await generateText(prompt, { provider })).trim();

      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
      }
      
      planData = JSON.parse(rawText);
    } catch (error) {
      console.error('AI planner generation failed, falling back to mock:', error);
      planData = getMockPlan(inputs);
    }
  } else {
    planData = getMockPlan(inputs);
  }

  if (isSupabaseConfigured && userId) {
    const { data, error } = await supabase
      .from('study_plans')
      .insert({
        user_id: userId,
        plan_data: planData
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Database error saving study plan: ${error.message}`);
    }
    return data;
  } else {

    return {
      id: crypto.randomUUID(),
      user_id: userId || crypto.randomUUID(),
      plan_data: planData,
      created_at: new Date().toISOString()
    };
  }
}

function getMockPlan(inputs) {
  const { examDate, subjects, studyHours, learningGoals } = inputs;
  const subjectsList = Array.isArray(subjects) ? subjects : [subjects || 'Core Material'];
  const primarySubject = subjectsList[0] || 'Core Material';
  const secondarySubject = subjectsList[1] || 'Practice & Review';
  const hours = studyHours || 3;
  const target = learningGoals || 'Prepare for upcoming examinations';
  
  return {
    summary: `Structured 7-day sprint targeting ${subjectsList.join(', ')} to successfully prepare for the exam on ${examDate || 'next week'}.`,
    weeklyGoals: [
      `Review core definitions and theories in ${primarySubject}`,
      `Solve practice assessments and trace knowledge gaps in ${secondarySubject}`,
      `Conduct final mock-exam revision and flashcard drills`
    ],
    schedule: [
      {
        day: "Day 1",
        subject: primarySubject,
        topic: "Foundations & Vocabulary",
        duration: `${hours} hours`,
        tasks: [
          "Read introduction chapters and extract text outlines",
          "Identify and highlight 10 key terms",
          "Create visual comparison matrix for central components"
        ],
        revisionTask: "Review introductory notes created earlier"
      },
      {
        day: "Day 2",
        subject: primarySubject,
        topic: "Core Methodology & Applications",
        duration: `${hours} hours`,
        tasks: [
          "Study functional workflows and standard use cases",
          "Solve 3 sample calculation or analysis problems",
          "Write 1-page summary summarizing methodology rules"
        ],
        revisionTask: "Quick review of Day 1 vocabulary list"
      },
      {
        day: "Day 3",
        subject: secondarySubject,
        topic: "Systems Setup & Testing",
        duration: `${hours} hours`,
        tasks: [
          "Review technical specifications and installation guidelines",
          "Walk through structural diagrams and note core interfaces",
          "Answer 5 conceptual review questions"
        ],
        revisionTask: "Revise Day 2 methodology guidelines"
      },
      {
        day: "Day 4",
        subject: secondarySubject,
        topic: "Security & Validation Policies",
        duration: `${hours} hours`,
        tasks: [
          "Understand authorization schemas and Row Level Security definitions",
          "Create mock verification lists for security tests",
          "Draft policy examples mapping to target tables"
        ],
        revisionTask: "Re-read primary subject summary sheet"
      },
      {
        day: "Day 5",
        subject: "General Integration",
        topic: "Full-Stack Mock Scenarios",
        duration: `${hours} hours`,
        tasks: [
          "Build small local proof-of-concept tests for verification",
          "Trace error response loops and document debugging patterns",
          "Participate in mock-testing simulation"
        ],
        revisionTask: "Review security schemas from Day 4"
      },
      {
        day: "Day 6",
        subject: "Revision",
        topic: "High-Yield Practice Questions",
        duration: `${hours} hours`,
        tasks: [
          "Generate AI-powered flashcards for active recall",
          "Answer comprehensive mock-exam under timed conditions",
          "Clarify doubt zones with AI teaching assistant chatbot"
        ],
        revisionTask: "Deep review of all wrong answers in mock assessments"
      },
      {
        day: "Day 7",
        subject: "Review",
        topic: "Final Warm-up Sprint",
        duration: `${hours} hours`,
        tasks: [
          "Review exam-sheet cheatsheet containing formulas and equations",
          "Check off all elements from weekly objectives task list",
          "Relax and sleep early to ensure peak exam readiness"
        ],
        revisionTask: "15-minute quick scroll through all visual cards"
      }
    ]
  };
}
