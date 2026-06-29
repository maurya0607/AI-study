import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { extractTextFromPdf } from './utils/pdfExtractor.js';
import { generateNotes } from './services/notesService.js';
import { generateQuiz } from './services/quizService.js';
import { solveDoubt } from './services/doubtService.js';
import { generatePlan } from './services/plannerService.js';
import { generateFlashcards } from './services/flashcardsService.js';
import { isGeminiConfigured, isGroqConfigured } from './utils/aiClient.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // Limit files to 50MB
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/ai-status', (req, res) => {
  res.json({
    gemini: isGeminiConfigured,
    groq: isGroqConfigured
  });
});

app.post('/api/extract-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please send a PDF file under the "file" field.' });
    }
    
    const isPdf = req.file.mimetype === 'application/pdf' || 
                  req.file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return res.status(400).json({ error: 'Unsupported file type. Only PDF documents are supported currently.' });
    }

    console.log(`[Parser] Extracting text from: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);
    const text = await extractTextFromPdf(req.file.buffer);
    
    res.json({ 
      text, 
      fileName: req.file.originalname,
      characterCount: text.length
    });
  } catch (error) {
    console.error('[Parser Error] PDF text extraction failed:', error);
    res.status(500).json({ error: 'Failed to extract text from PDF: ' + error.message });
  }
});

app.post('/api/generate-notes', async (req, res) => {
  try {
    const { documentId, documentText, style, provider } = req.body;
    if (!documentId || !documentText) {
      return res.status(400).json({ error: 'Missing documentId or documentText payload fields.' });
    }
    
    console.log(`[AI Notes] Generating notes in "${style || 'detailed'}" style for Document: ${documentId} using provider: ${provider || 'default'}`);
    const notes = await generateNotes(documentId, documentText, style, provider);
    res.json(notes);
  } catch (error) {
    console.error('[AI Notes Error] Note generation failed:', error);
    res.status(500).json({ error: 'AI Notes generation failed: ' + error.message });
  }
});

app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { documentId, documentText, quizType, provider } = req.body;
    if (!documentId || !documentText) {
      return res.status(400).json({ error: 'Missing documentId or documentText payload fields.' });
    }
    
    console.log(`[AI Quiz] Generating "${quizType || 'MCQ'}" quiz for Document: ${documentId} using provider: ${provider || 'default'}`);
    const quiz = await generateQuiz(documentId, documentText, quizType, provider);
    res.json(quiz);
  } catch (error) {
    console.error('[AI Quiz Error] Quiz generation failed:', error);
    res.status(500).json({ error: 'AI Quiz generation failed: ' + error.message });
  }
});

app.post('/api/generate-flashcards', async (req, res) => {
  try {
    const { documentId, documentText, provider } = req.body;
    if (!documentId || !documentText) {
      return res.status(400).json({ error: 'Missing documentId or documentText payload fields.' });
    }
    
    console.log(`[AI Flashcards] Generating flashcards for Document: ${documentId} using provider: ${provider || 'default'}`);
    const flashcards = await generateFlashcards(documentId, documentText, provider);
    res.json(flashcards);
  } catch (error) {
    console.error('[AI Flashcards Error] Flashcards generation failed:', error);
    res.status(500).json({ error: 'AI Flashcards generation failed: ' + error.message });
  }
});

app.post('/api/solve-doubt', async (req, res) => {
  try {
    const { userId, documentText, question, provider } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Missing question field.' });
    }
    
    console.log(`[AI Doubt] Solving: "${question.substring(0, 60)}..." using provider: ${provider || 'default'}`);
    const doubtResult = await solveDoubt(userId, documentText || '', question, provider);
    res.json(doubtResult);
  } catch (error) {
    console.error('[AI Doubt Error]:', error);
    res.status(500).json({ error: 'AI Doubt solving failed: ' + error.message });
  }
});

app.post('/api/generate-plan', async (req, res) => {
  try {
    const { userId, examDate, subjects, studyHours, learningGoals, provider } = req.body;
    if (!subjects || !studyHours) {
      return res.status(400).json({ error: 'Missing subjects or studyHours payload fields.' });
    }
    
    console.log(`[AI Planner] Creating plan targeting: ${Array.isArray(subjects) ? subjects.join(', ') : subjects} using provider: ${provider || 'default'}`);
    const plan = await generatePlan(userId, { examDate, subjects, studyHours, learningGoals }, provider);
    res.json(plan);
  } catch (error) {
    console.error('[AI Planner Error] Study planner failed:', error);
    res.status(500).json({ error: 'AI Study Planner failed: ' + error.message });
  }
});

app.post('/api/analyze-weakness', async (req, res) => {
  try {
    const { quizAttempts, provider } = req.body;
    console.log(`[AI Analysis] Analyzing ${quizAttempts?.length || 0} past quiz attempts using provider: ${provider || 'default'}`);
    
    // Dynamically import to avoid top-level import issues if file is new
    const { analyzeWeakness } = await import('./services/analysisService.js');
    const analysis = await analyzeWeakness(quizAttempts, provider);
    res.json(analysis);
  } catch (error) {
    console.error('[AI Analysis Error] Weakness analysis failed:', error);
    res.status(500).json({ error: 'AI Weakness Analysis failed: ' + error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 AI Study Assistant backend running at http://localhost:${port}`);
});
