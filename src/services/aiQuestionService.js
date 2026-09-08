/**
 * AI Question Paper Generation Service
 * Calls Google Gemini API securely on the backend.
 */

const { getValidSubjects } = require('../config/classSubjects');

/**
 * Calls Gemini REST API using native fetch with model fallback
 */
async function callGeminiApi(promptText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment variables.');
  }

  const models = [ 'gemini-3.6-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.4
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Gemini API returned status ${response.status} (${model})`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Empty response received from Gemini AI model.');
      }

      return rawText;
    } catch (err) {
      lastError = err;
      console.warn(`[AI Question Service] Model ${model} failed, trying next:`, err.message);
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini API.');
}

/**
 * Cleans and safely parses JSON from AI response
 */
function safeParseJson(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Generates an academic question paper structure for an exam
 */
async function generateExamQuestionPaper(examData) {
  const {
    examName,
    className,
    stream,
    section,
    subject,
    totalMarks = 100,
    duration = '2 Hours 30 Minutes',
    academicYear = new Date().getFullYear().toString(),
    description = ''
  } = examData;

  const streamInfo = stream ? ` (Group/Stream: ${stream})` : '';

  const prompt = `You are a Senior Academic Curriculum Expert and School Examination Paper Setter for secondary and primary education.
Generate a complete, formal, and curriculum-aligned Question Paper based on the following exam parameters:

- School Name: EduManage Model School & College
- Examination: ${examName} (${academicYear})
- Target Class: ${className}${streamInfo}
- Section: ${section || 'A'}
- Subject: ${subject}
- Full Marks: ${totalMarks}
- Time Allowed / Duration: ${duration || '2 Hours 30 Minutes'}
- Specific Notes / Instructions: ${description || 'Follow standard national curriculum syllabus'}

Requirements for the Question Paper:
1. The questions must be strictly appropriate in difficulty and terminology for ${className}${streamInfo} and subject "${subject}".
2. Organize the question paper into clear, structured sections:
   - Section A: Multiple Choice Questions (MCQ) - Include 4 distinct plausible options (labeled A, B, C, D) for each question.
   - Section B: Short Answer Questions - Concise conceptual / definition / calculation questions.
   - Section C: Descriptive / Broad / Creative Questions - Comprehensive questions testing deep understanding or problem-solving.
3. The sum of all question marks across all sections MUST EXACTLY equal ${totalMarks}.
4. Provide general instructions typical of school board examinations.

Output MUST BE strict, valid JSON matching this exact JSON schema:
{
  "generalInstructions": [
    "Figures in the right margin indicate full marks.",
    "Read each question carefully before answering.",
    "Write your roll number and name clearly on the answer script."
  ],
  "sections": [
    {
      "sectionTitle": "Section A: Multiple Choice Questions (MCQ)",
      "instructions": "Choose the correct answer for each of the following questions.",
      "sectionMarks": 20,
      "questions": [
        {
          "questionNumber": 1,
          "question": "Question text here?",
          "options": [
            "A) Option 1",
            "B) Option 2",
            "C) Option 3",
            "D) Option 4"
          ],
          "marks": 1,
          "suggestedAnswer": "A"
        }
      ]
    },
    {
      "sectionTitle": "Section B: Short Answer Questions",
      "instructions": "Answer the following questions briefly.",
      "sectionMarks": 30,
      "questions": [
        {
          "questionNumber": 1,
          "question": "Question text here?",
          "options": [],
          "marks": 5,
          "suggestedAnswer": "Brief answer key / guideline"
        }
      ]
    },
    {
      "sectionTitle": "Section C: Creative & Descriptive Questions",
      "instructions": "Answer the following in-depth questions.",
      "sectionMarks": 50,
      "questions": [
        {
          "questionNumber": 1,
          "question": "Question text here?",
          "options": [],
          "marks": 10,
          "suggestedAnswer": "Expected answer outline"
        }
      ]
    }
  ]
}

Return ONLY the raw JSON object. Do not include any explanations outside the JSON.`;

  const rawJson = await callGeminiApi(prompt);
  const parsed = safeParseJson(rawJson);

  if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    throw new Error('AI generated an invalid question paper format.');
  }

  return {
    generalInstructions: parsed.generalInstructions || [
      'Figures in the right margin indicate full marks.',
      'Answer all questions according to the instructions in each section.',
      'Write your roll number and class clearly on the answer script.'
    ],
    sections: parsed.sections.map((sec, secIdx) => ({
      sectionTitle: sec.sectionTitle || `Section ${String.fromCharCode(65 + secIdx)}`,
      instructions: sec.instructions || '',
      sectionMarks: Number(sec.sectionMarks) || 0,
      questions: (sec.questions || []).map((q, qIdx) => ({
        questionNumber: Number(q.questionNumber) || qIdx + 1,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        marks: Number(q.marks) || 1,
        suggestedAnswer: q.suggestedAnswer || ''
      }))
    }))
  };
}

module.exports = {
  generateExamQuestionPaper
};
