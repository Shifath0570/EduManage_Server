/**
 * AI Question Paper Generation Service
 * Calls Google Gemini API securely on the backend.
 * Enforces strict Admin-defined question structure and marks distribution.
 */

/**
 * Calls Gemini REST API using native fetch with model fallback
 */
async function callGeminiApi(promptText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment variables.');
  }

  const models = [ 'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro'];
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
          temperature: 0.3
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
 * Validates and normalizes Admin question paper configuration
 */
function validateAndNormalizeConfig(config, totalMarks) {
  const mcqCount = Math.max(0, parseInt(config?.mcq?.count, 10) || 0);
  const mcqMarks = Math.max(1, parseInt(config?.mcq?.marksPerQuestion, 10) || 1);

  const shortCount = Math.max(0, parseInt(config?.short?.count, 10) || 0);
  const shortMarks = Math.max(1, parseInt(config?.short?.marksPerQuestion, 10) || 2);

  const creativeCount = Math.max(0, parseInt(config?.creative?.count, 10) || 0);
  const creativeMarks = Math.max(1, parseInt(config?.creative?.marksPerQuestion, 10) || 5);

  const mcqTotal = mcqCount * mcqMarks;
  const shortTotal = shortCount * shortMarks;
  const creativeTotal = creativeCount * creativeMarks;
  const calculatedTotal = mcqTotal + shortTotal + creativeTotal;

  if (calculatedTotal === 0) {
    throw new Error('Question configuration must have at least one section with question count > 0.');
  }

  if (totalMarks !== undefined && totalMarks !== null && Number(totalMarks) > 0) {
    const expectedTotal = Number(totalMarks);
    if (calculatedTotal !== expectedTotal) {
      const diff = Math.abs(calculatedTotal - expectedTotal);
      const direction = calculatedTotal > expectedTotal ? 'exceeded' : 'missing';
      throw new Error(
        `Question paper total (${calculatedTotal} marks) must equal the exam total marks (${expectedTotal} marks). Difference: ${diff} marks ${direction}.`
      );
    }
  }

  return {
    mcq: { count: mcqCount, marksPerQuestion: mcqMarks, totalMarks: mcqTotal },
    short: { count: shortCount, marksPerQuestion: shortMarks, totalMarks: shortTotal },
    creative: { count: creativeCount, marksPerQuestion: creativeMarks, totalMarks: creativeTotal },
    calculatedTotal
  };
}

/**
 * Generates an academic question paper structure strictly according to Admin configuration
 */
async function generateExamQuestionPaper(examData, rawConfig) {
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

  // Validate and normalize admin-defined question configuration
  const validConfig = validateAndNormalizeConfig(rawConfig || examData.questionConfiguration, totalMarks);
  const { mcq, short, creative, calculatedTotal } = validConfig;

  const streamInfo = stream ? ` (Group/Stream: ${stream})` : '';

  // Build section instructions based on configuration
  const sectionSpecs = [];
  if (mcq.count > 0) {
    sectionSpecs.push(`- Section A (MCQ): EXACTLY ${mcq.count} Multiple Choice Questions, worth ${mcq.marksPerQuestion} mark each (Section total: ${mcq.totalMarks} marks). Each question MUST have exactly 4 plausible options labeled 'A', 'B', 'C', 'D', and a 'suggestedAnswer' indicating the correct option.`);
  }
  if (short.count > 0) {
    sectionSpecs.push(`- Section B (Short Answer): EXACTLY ${short.count} Short Conceptual / Definition / Problem questions, worth ${short.marksPerQuestion} marks each (Section total: ${short.totalMarks} marks). Each question MUST include a concise 'suggestedAnswer'.`);
  }
  if (creative.count > 0) {
    sectionSpecs.push(`- Section C (Creative / Broad): EXACTLY ${creative.count} Analytical / Creative / Comprehensive questions, worth ${creative.marksPerQuestion} marks each (Section total: ${creative.totalMarks} marks). Each question MUST include a 'suggestedAnswer' outline.`);
  }

  const prompt = `You are a Senior Academic Curriculum Expert and School Examination Paper Setter for secondary and primary education.
Generate high quality, curriculum-aligned questions for the following examination:

EXAMINATION DETAILS:
- School: EduManage Model School & College
- Examination: ${examName} (${academicYear})
- Target Class: ${className}${streamInfo}
- Section: ${section || 'A'}
- Subject: ${subject}
- Full Marks: ${calculatedTotal}
- Duration: ${duration || '2 Hours 30 Minutes'}
- Notes: ${description || 'Follow standard national curriculum syllabus'}

STRICT ADMIN QUESTION CONFIGURATION (MANDATORY):
You MUST NOT decide or alter question counts or marks. Generate EXACTLY what is specified below:
${sectionSpecs.join('\n')}

GRAND TOTAL MARKS: EXACTLY ${calculatedTotal} marks.

CRITICAL RULES:
1. Questions must be age-appropriate and relevant to ${className}${streamInfo} - ${subject}.
2. Do NOT generate fewer questions or more questions than specified.
3. Every MCQ must have 4 options: ["A) ...", "B) ...", "C) ...", "D) ..."].

Output MUST BE strict, valid JSON matching this schema:
{
  "generalInstructions": [
    "Figures in the right margin indicate full marks.",
    "Answer all questions according to instructions in each section.",
    "Write your roll number and name clearly on the answer script."
  ],
  "sections": [
    ${mcq.count > 0 ? `{
      "type": "mcq",
      "sectionTitle": "Section A: Multiple Choice Questions (MCQ)",
      "instructions": "Choose the correct answer for each of the following questions.",
      "sectionMarks": ${mcq.totalMarks},
      "questions": [
        {
          "questionNumber": 1,
          "question": "Question text...",
          "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
          "marks": ${mcq.marksPerQuestion},
          "suggestedAnswer": "A"
        }
      ]
    },` : ''}
    ${short.count > 0 ? `{
      "type": "short",
      "sectionTitle": "Section B: Short Answer Questions",
      "instructions": "Answer the following questions briefly.",
      "sectionMarks": ${short.totalMarks},
      "questions": [
        {
          "questionNumber": 1,
          "question": "Question text...",
          "options": [],
          "marks": ${short.marksPerQuestion},
          "suggestedAnswer": "Answer guideline..."
        }
      ]
    },` : ''}
    ${creative.count > 0 ? `{
      "type": "creative",
      "sectionTitle": "Section C: Creative & Descriptive Questions",
      "instructions": "Answer the following in-depth questions.",
      "sectionMarks": ${creative.totalMarks},
      "questions": [
        {
          "questionNumber": 1,
          "question": "Question text...",
          "options": [],
          "marks": ${creative.marksPerQuestion},
          "suggestedAnswer": "Answer guideline..."
        }
      ]
    }` : ''}
  ]
}

Return ONLY the raw JSON object. No explanations outside JSON.`;

  const rawJson = await callGeminiApi(prompt);
  const parsed = safeParseJson(rawJson);

  if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    throw new Error('AI generated an invalid question paper format.');
  }

  // Strict backend normalization & verification
  const normalizedSections = [];

  // 1. Process MCQ Section
  if (mcq.count > 0) {
    const aiSec = parsed.sections.find((s) => s.type === 'mcq' || (s.sectionTitle && s.sectionTitle.toLowerCase().includes('multiple choice')) || (s.sectionTitle && s.sectionTitle.toLowerCase().includes('mcq')));
    const rawQuestions = aiSec?.questions || [];

    const finalQuestions = rawQuestions.slice(0, mcq.count).map((q, idx) => ({
      questionNumber: idx + 1,
      question: q.question || `Multiple choice question ${idx + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['A) Option A', 'B) Option B', 'C) Option C', 'D) Option D'],
      marks: mcq.marksPerQuestion,
      suggestedAnswer: q.suggestedAnswer || ''
    }));

    // If AI generated fewer than requested, fill placeholders to protect system integrity
    while (finalQuestions.length < mcq.count) {
      const idx = finalQuestions.length;
      finalQuestions.push({
        questionNumber: idx + 1,
        question: `Question ${idx + 1} regarding ${subject}`,
        options: ['A) Option A', 'B) Option B', 'C) Option C', 'D) Option D'],
        marks: mcq.marksPerQuestion,
        suggestedAnswer: 'A'
      });
    }

    normalizedSections.push({
      sectionTitle: aiSec?.sectionTitle || 'Section A: Multiple Choice Questions (MCQ)',
      instructions: aiSec?.instructions || 'Choose the correct answer for each of the following questions.',
      sectionMarks: mcq.totalMarks,
      questions: finalQuestions
    });
  }

  // 2. Process Short Questions Section
  if (short.count > 0) {
    const aiSec = parsed.sections.find((s) => s.type === 'short' || (s.sectionTitle && s.sectionTitle.toLowerCase().includes('short')));
    const rawQuestions = aiSec?.questions || [];

    const finalQuestions = rawQuestions.slice(0, short.count).map((q, idx) => ({
      questionNumber: idx + 1,
      question: q.question || `Short question ${idx + 1}`,
      options: [],
      marks: short.marksPerQuestion,
      suggestedAnswer: q.suggestedAnswer || ''
    }));

    while (finalQuestions.length < short.count) {
      const idx = finalQuestions.length;
      finalQuestions.push({
        questionNumber: idx + 1,
        question: `Define/explain the fundamental concept of ${subject} (Question ${idx + 1}).`,
        options: [],
        marks: short.marksPerQuestion,
        suggestedAnswer: 'Brief explanation.'
      });
    }

    normalizedSections.push({
      sectionTitle: aiSec?.sectionTitle || 'Section B: Short Answer Questions',
      instructions: aiSec?.instructions || 'Answer the following questions briefly.',
      sectionMarks: short.totalMarks,
      questions: finalQuestions
    });
  }

  // 3. Process Creative Questions Section
  if (creative.count > 0) {
    const aiSec = parsed.sections.find((s) => s.type === 'creative' || (s.sectionTitle && (s.sectionTitle.toLowerCase().includes('creative') || s.sectionTitle.toLowerCase().includes('descriptive') || s.sectionTitle.toLowerCase().includes('broad'))));
    const rawQuestions = aiSec?.questions || [];

    const finalQuestions = rawQuestions.slice(0, creative.count).map((q, idx) => ({
      questionNumber: idx + 1,
      question: q.question || `Creative question ${idx + 1}`,
      options: [],
      marks: creative.marksPerQuestion,
      suggestedAnswer: q.suggestedAnswer || ''
    }));

    while (finalQuestions.length < creative.count) {
      const idx = finalQuestions.length;
      finalQuestions.push({
        questionNumber: idx + 1,
        question: `Analyze and describe the application of ${subject} principles (Question ${idx + 1}).`,
        options: [],
        marks: creative.marksPerQuestion,
        suggestedAnswer: 'Comprehensive analysis.'
      });
    }

    normalizedSections.push({
      sectionTitle: aiSec?.sectionTitle || 'Section C: Creative & Descriptive Questions',
      instructions: aiSec?.instructions || 'Answer the following in-depth questions.',
      sectionMarks: creative.totalMarks,
      questions: finalQuestions
    });
  }

  return {
    generalInstructions: parsed.generalInstructions || [
      'Figures in the right margin indicate full marks.',
      'Answer all questions according to the instructions in each section.',
      'Write your roll number and class clearly on the answer script.'
    ],
    sections: normalizedSections,
    questionConfiguration: validConfig
  };
}

module.exports = {
  validateAndNormalizeConfig,
  generateExamQuestionPaper
};
