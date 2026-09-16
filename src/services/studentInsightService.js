/**
 * Student Performance Insight AI Service
 * Analyzes verified student exam marks and generates personalized, encouraging performance insights.
 * Calls Google Gemini securely from the backend and persists structured insights.
 */

const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const StudentPerformanceInsight = require('../models/StudentPerformanceInsight');

// Helper to calculate Grade and GPA based on marks percentage
const calculateGradeAndGpa = (marksObtained, totalMarks = 100) => {
  const score = Number(marksObtained);
  const total = Number(totalMarks) || 100;
  const percentage = total > 0 ? (score / total) * 100 : 0;

  if (percentage >= 80) return { grade: 'A+', gpa: 5.0 };
  if (percentage >= 70) return { grade: 'A', gpa: 4.0 };
  if (percentage >= 60) return { grade: 'A-', gpa: 3.5 };
  if (percentage >= 50) return { grade: 'B', gpa: 3.0 };
  if (percentage >= 40) return { grade: 'C', gpa: 2.0 };
  if (percentage >= 33) return { grade: 'D', gpa: 1.0 };
  return { grade: 'F', gpa: 0.0 };
};

/**
 * Call Gemini REST API with model fallback
 */
async function callGeminiApi(promptText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment variables.');
  }

  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-2.5-pro'
  ];
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
      console.warn(`[Student Insight AI Service] Model ${model} failed, trying next:`, err.message);
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini API.');
}

/**
 * Safely parses JSON from AI response
 */
function safeParseJson(rawText) {
  let cleaned = String(rawText || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Creates a unique fingerprint of the student's mark records to detect changes
 */
function generateMarksFingerprint(marks) {
  if (!marks || marks.length === 0) return 'empty';
  const parts = marks
    .map((m) => `${m._id}_${m.exam}_${m.subject}_${m.marksObtained}_${m.totalMarks}_${m.updatedAt || m.createdAt}`)
    .sort()
    .join('|');
  return Buffer.from(parts).toString('base64').slice(0, 48);
}

/**
 * Computes deterministic verified metrics and historical comparisons
 */
function computeStudentMetricsAndHistory(rawMarks, examDocs) {
  const examMap = new Map();
  (examDocs || []).forEach((ex) => {
    examMap.set(ex.examName.toLowerCase().trim(), ex);
  });

  // Enrich raw marks
  const enriched = rawMarks.map((m) => {
    const examDoc = examMap.get(m.exam.toLowerCase().trim());
    const total = Number(m.totalMarks) || Number(examDoc?.totalMarks) || 100;
    const score = Number(m.marksObtained) || 0;
    const pct = total > 0 ? Number(((score / total) * 100).toFixed(1)) : 0;
    const { grade, gpa } = calculateGradeAndGpa(score, total);

    return {
      _id: m._id,
      examName: m.exam,
      examType: examDoc?.examType || 'Examination',
      examDate: examDoc?.examDate || '',
      subject: m.subject,
      totalMarks: total,
      marksObtained: score,
      percentage: pct,
      grade: m.grade || grade,
      gpa: typeof m.gpa === 'number' ? m.gpa : gpa,
      createdAt: m.createdAt || new Date(),
      updatedAt: m.updatedAt || new Date()
    };
  });

  // Group by exam
  const examGroupMap = new Map();
  enriched.forEach((m) => {
    const key = m.examName;
    if (!examGroupMap.has(key)) {
      examGroupMap.set(key, {
        examName: m.examName,
        examType: m.examType,
        examDate: m.examDate,
        createdAt: m.createdAt,
        subjects: []
      });
    }
    examGroupMap.get(key).subjects.push(m);
  });

  // Sort exams chronologically
  const examGroups = Array.from(examGroupMap.values()).map((g) => {
    const totalMarks = g.subjects.reduce((sum, s) => sum + s.totalMarks, 0);
    const obtainedMarks = g.subjects.reduce((sum, s) => sum + s.marksObtained, 0);
    const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(1)) : 0;
    const gpaSum = g.subjects.reduce((sum, s) => sum + s.gpa, 0);
    const avgGpa = g.subjects.length > 0 ? Number((gpaSum / g.subjects.length).toFixed(2)) : 0;
    const hasFail = g.subjects.some((s) => s.grade === 'F' || s.gpa === 0);
    const gpa = hasFail ? 0.0 : avgGpa;

    let grade = 'F';
    if (!hasFail && g.subjects.length > 0) {
      if (gpa >= 5.0) grade = 'A+';
      else if (gpa >= 4.0) grade = 'A';
      else if (gpa >= 3.5) grade = 'A-';
      else if (gpa >= 3.0) grade = 'B';
      else if (gpa >= 2.0) grade = 'C';
      else if (gpa >= 1.0) grade = 'D';
    }

    return {
      ...g,
      totalMarks,
      obtainedMarks,
      percentage,
      gpa,
      grade,
      isPassed: !hasFail
    };
  });

  // Latest exam vs previous exam
  examGroups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latestGroup = examGroups[0] || null;
  const previousGroup = examGroups.length > 1 ? examGroups[1] : null;

  // Overall metrics across all marks
  const totalSubjects = enriched.length;
  const totalMarks = enriched.reduce((sum, m) => sum + m.totalMarks, 0);
  const obtainedMarks = enriched.reduce((sum, m) => sum + m.marksObtained, 0);
  const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(1)) : 0;
  const gpaSum = enriched.reduce((sum, m) => sum + m.gpa, 0);
  const hasAnyFail = enriched.some((m) => m.grade === 'F' || m.gpa === 0);
  const rawGpa = totalSubjects > 0 ? Number((gpaSum / totalSubjects).toFixed(2)) : 0;
  const gpa = hasAnyFail ? 0.0 : rawGpa;

  let grade = 'F';
  if (!hasAnyFail && totalSubjects > 0) {
    if (gpa >= 5.0) grade = 'A+';
    else if (gpa >= 4.0) grade = 'A';
    else if (gpa >= 3.5) grade = 'A-';
    else if (gpa >= 3.0) grade = 'B';
    else if (gpa >= 2.0) grade = 'C';
    else if (gpa >= 1.0) grade = 'D';
  }

  // Strongest and weakest subject based on latest or all marks
  const activeSubjects = latestGroup ? latestGroup.subjects : enriched;
  const sortedSubjects = [...activeSubjects].sort((a, b) => b.percentage - a.percentage);

  const strongestSubject = sortedSubjects.length > 0 ? `${sortedSubjects[0].subject} (${sortedSubjects[0].percentage}%)` : '';
  const weakestSubject = sortedSubjects.length > 0 ? `${sortedSubjects[sortedSubjects.length - 1].subject} (${sortedSubjects[sortedSubjects.length - 1].percentage}%)` : '';

  // Historical comparison text if previous exam exists
  let factualHistoricalDiff = '';
  if (latestGroup && previousGroup) {
    const diffPct = (latestGroup.percentage - previousGroup.percentage).toFixed(1);
    const sign = Number(diffPct) >= 0 ? '+' : '';
    factualHistoricalDiff = `Previous Exam: "${previousGroup.examName}" (${previousGroup.percentage}%, GPA ${previousGroup.gpa.toFixed(2)}) -> Latest Exam: "${latestGroup.examName}" (${latestGroup.percentage}%, GPA ${latestGroup.gpa.toFixed(2)}). Net change: ${sign}${diffPct}%.`;
  }

  return {
    latestGroup,
    previousGroup,
    totalExamsEvaluated: examGroups.length,
    factualHistoricalDiff,
    metrics: {
      totalMarks,
      obtainedMarks,
      percentage,
      gpa,
      grade,
      isPassed: !hasAnyFail && totalSubjects > 0,
      totalSubjects,
      strongestSubject,
      weakestSubject,
      subjectBreakdown: activeSubjects.map((s) => ({
        subject: s.subject,
        marksObtained: s.marksObtained,
        totalMarks: s.totalMarks,
        percentage: s.percentage,
        grade: s.grade,
        gpa: s.gpa
      }))
    }
  };
}

/**
 * Generate fallback rule-based insight when AI is offline or rate-limited
 */
function generateFallbackInsight(studentName, metrics, factualHistoricalDiff) {
  const pct = metrics.percentage;
  let performanceLevel = 'Good';
  let headline = `You are doing fantastic in your examinations so far! If you keep going like this, top honors are definitely within your reach!`;
  let subline = `Keep up this wonderful performance. Staying consistent at the top will take you very far!`;
  let strengths = [metrics.strongestSubject || 'Academic consistency'];
  let improvementAreas = [metrics.weakestSubject ? `Focus on strengthening ${metrics.weakestSubject}` : 'Further concept revision'];
  let recommendations = [
    'Review key concepts regularly through structured practice.',
    'Clarify doubts promptly with teachers and peers.'
  ];
  let nextGoal = `Target achieving an overall score of ${Math.min(100, Math.ceil((pct + 5) / 5) * 5)}%+ in the upcoming assessment.`;

  if (pct >= 80) {
    performanceLevel = 'Outstanding';
    headline = `You're absolutely crushing your exams so far! If you keep going like this, the top rank is yours!`;
    subline = `Keep up this fantastic performance. Staying dedicated and consistent at the top of the leaderboard will take you far!`;
    strengths = [metrics.strongestSubject || 'Mastery of core concepts', 'Analytical problem solving'];
    recommendations = [
      'Challenge yourself with advanced problem sets and analytical exercises.',
      'Maintain your structured routine and daily study habits.'
    ];
    nextGoal = `Maintain 85%+ excellence across all subjects in the next term.`;
  } else if (pct >= 60) {
    performanceLevel = 'Excellent';
    headline = `You are making wonderful progress across your subjects! If you keep pushing forward like this, great success is ahead!`;
    subline = `Keep up this strong dedication. Your steady effort and consistency will take you to the very top!`;
    recommendations = [
      'Focus dedicated revision on subjects with lower scores.',
      'Practice timed mock tests before major exams.'
    ];
    nextGoal = `Aim to elevate your overall performance to 75%+ in the next evaluation.`;
  } else if (pct >= 40) {
    performanceLevel = 'Satisfactory';
    headline = `You are building great momentum in your exams! Keep up this determination and you will reach higher milestones!`;
    subline = `Stay consistent with your daily practice and review. Every step forward brings you closer to your goals!`;
    recommendations = [
      'Allocate extra daily time to fundamental concepts.',
      'Work through past exam papers and clarify questions with teachers.'
    ];
    nextGoal = `Work towards reaching 60%+ in your next exam with steady daily practice.`;
  } else {
    performanceLevel = 'Progressing';
    headline = `You have tremendous potential waiting to shine! Take it one step at a time and a great comeback is yours!`;
    subline = `Focus on consistent daily study sessions. With persistence and practice, you can achieve any goal!`;
    recommendations = [
      'Schedule regular daily review for fundamental formulas and definitions.',
      'Seek guidance from teachers during office hours for challenging topics.'
    ];
    nextGoal = `Target a 50%+ benchmark in upcoming chapter tests with focused practice.`;
  }

  return {
    performanceLevel,
    headline,
    subline,
    compliment: `${headline} ${subline}`,
    strengths,
    improvementAreas,
    recommendations,
    nextGoal,
    historicalComparison: factualHistoricalDiff ? `Academic Trend: ${factualHistoricalDiff}` : ''
  };
}

/**
 * Generates and saves an AI Student Performance Insight
 */
async function generateOrUpdateStudentInsight(studentIdOrStudentDoc, options = {}) {
  try {
    const { force = false } = options;

    // 1. Resolve Student Document
    let student = null;
    if (studentIdOrStudentDoc && typeof studentIdOrStudentDoc === 'object' && studentIdOrStudentDoc._id) {
      student = studentIdOrStudentDoc;
    } else {
      const idStr = String(studentIdOrStudentDoc).trim();
      const orQuery = [{ studentId: idStr }, { stuId: idStr }];
      if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
        orQuery.push({ _id: idStr });
      }
      student = await Student.findOne({ $or: orQuery });
    }

    if (!student) {
      throw new Error(`Student record not found for "${studentIdOrStudentDoc}"`);
    }

    const resolvedStudentId = student.studentId || student.stuId || String(student._id);

    // 2. Fetch all verified Mark records strictly for this student
    const studentQueryConditions = [
      { studentId: resolvedStudentId },
      { studentId: String(student._id) }
    ];
    if (student.studentId) studentQueryConditions.push({ studentId: student.studentId });
    if (student.stuId) studentQueryConditions.push({ studentId: student.stuId });
    if (student.name && student.className && student.roll) {
      studentQueryConditions.push({
        studentName: new RegExp(`^${student.name.trim()}$`, 'i'),
        className: new RegExp(`^${student.className.trim()}$`, 'i'),
        roll: String(student.roll).trim()
      });
    }

    const rawMarks = await Mark.find({ $or: studentQueryConditions }).sort({ createdAt: -1 });

    if (rawMarks.length === 0) {
      return {
        hasData: false,
        student: {
          studentId: resolvedStudentId,
          name: student.name,
          className: student.className,
          section: student.section,
          roll: student.roll
        },
        message: 'No examination marks recorded yet for this student.'
      };
    }

    // 3. Check Fingerprint & Cached Insight
    const currentFingerprint = generateMarksFingerprint(rawMarks);
    const existingInsight = await StudentPerformanceInsight.findOne({ studentId: resolvedStudentId });

    if (existingInsight && !force && existingInsight.marksFingerprint === currentFingerprint) {
      return {
        hasData: true,
        cached: true,
        data: existingInsight
      };
    }

    // 4. Enrich with Exam details
    const examNames = [...new Set(rawMarks.map((m) => m.exam))];
    const examDocs = await Exam.find({ examName: { $in: examNames } });

    const {
      latestGroup,
      totalExamsEvaluated,
      factualHistoricalDiff,
      metrics
    } = computeStudentMetricsAndHistory(rawMarks, examDocs);

    const studentFirstName = (student.name || 'Student').split(' ')[0];

    // 5. Build strict AI Prompt for a high-energy 2-3 line punchy complement banner
    const subjectSummaryList = metrics.subjectBreakdown
      .map((s) => `- ${s.subject}: ${s.marksObtained}/${s.totalMarks} (${s.percentage}%, Grade: ${s.grade}, GPA: ${s.gpa.toFixed(2)})`)
      .join('\n');

    const prompt = `You are a high-energy, warm, encouraging, and inspirational Academic Mentor for EduManage School.
Analyze the following VERIFIED student examination performance and generate a punchy, 2 to 3 line motivational compliment banner for the student in English.

STUDENT DETAILS:
- Name: ${student.name} (Preferred: ${studentFirstName})
- Class: ${student.className}, Section: ${student.section || 'A'}, Roll: ${student.roll || '-'}
- Latest Exam: ${latestGroup ? latestGroup.examName : 'General Term'} (${latestGroup ? latestGroup.examType : 'Exam'})
- Total Exams in Record: ${totalExamsEvaluated}

VERIFIED ACADEMIC METRICS (SOURCE OF TRUTH):
- Overall Percentage: ${metrics.percentage}%
- Overall GPA: ${metrics.gpa.toFixed(2)} (Grade: ${metrics.grade})
- Strongest Subject: ${metrics.strongestSubject}
- Subject Needing Focus: ${metrics.weakestSubject}

SUBJECT BREAKDOWN:
${subjectSummaryList}

${factualHistoricalDiff ? `HISTORICAL PROGRESS:\n${factualHistoricalDiff}\n` : ''}

STYLE INSTRUCTIONS:
1. Generate an exciting, inspiring 2-line main headline ("headline") in vibrant English (e.g. "You're absolutely crushing your exams so far! If you keep going like this, the top rank is yours!").
2. Generate an encouraging 1-line subtitle ("subline") (e.g. "Keep up this fantastic performance. Staying consistent at the top of the leaderboard will take you very far!").
3. Tone MUST be 100% positive, energetic, and student-friendly.
4. FORBIDDEN words: ["bad student", "failure", "weak student", "lazy", "poor student", "unsuccessful", "terrible", "hopeless"].
5. Provide actionable recommendations and next goal.

Return STRICT JSON matching this schema:
{
  "headline": "Punchy 1-2 line main compliment headline...",
  "subline": "Inspiring 1-line supporting motivation...",
  "performanceLevel": "Outstanding" | "Excellent" | "Good" | "Satisfactory" | "Progressing",
  "compliment": "Full compliment text...",
  "strengths": ["Key strength 1", "Key strength 2"],
  "improvementAreas": ["Key focus area"],
  "recommendations": ["Actionable tip 1", "Actionable tip 2"],
  "nextGoal": "Target milestone...",
  "historicalComparison": ""
}

Output ONLY valid JSON.`;

    let generatedInsights = null;

    try {
      const rawAiText = await callGeminiApi(prompt);
      const parsedJson = safeParseJson(rawAiText);

      if (parsedJson && (parsedJson.headline || parsedJson.compliment)) {
        const validLevels = ['Outstanding', 'Excellent', 'Good', 'Satisfactory', 'Progressing'];
        let normLevel = parsedJson.performanceLevel || 'Good';
        if (!validLevels.includes(normLevel)) {
          normLevel = metrics.percentage >= 80 ? 'Outstanding' : metrics.percentage >= 60 ? 'Excellent' : metrics.percentage >= 40 ? 'Satisfactory' : 'Progressing';
        }

        const headlineText = parsedJson.headline || parsedJson.compliment;
        const sublineText = parsedJson.subline || 'Keep up this fantastic performance and stay consistent!';

        generatedInsights = {
          headline: String(headlineText).trim(),
          subline: String(sublineText).trim(),
          performanceLevel: normLevel,
          compliment: String(parsedJson.compliment || `${headlineText} ${sublineText}`).trim(),
          strengths: Array.isArray(parsedJson.strengths) && parsedJson.strengths.length > 0 ? parsedJson.strengths : [metrics.strongestSubject || 'Consistent participation'],
          improvementAreas: Array.isArray(parsedJson.improvementAreas) && parsedJson.improvementAreas.length > 0 ? parsedJson.improvementAreas : [metrics.weakestSubject || 'General review'],
          recommendations: Array.isArray(parsedJson.recommendations) && parsedJson.recommendations.length > 0 ? parsedJson.recommendations : ['Practice daily problem solving.'],
          nextGoal: String(parsedJson.nextGoal || 'Maintain high academic momentum.').trim(),
          historicalComparison: parsedJson.historicalComparison || (factualHistoricalDiff ? `Academic Trend: ${factualHistoricalDiff}` : '')
        };
      }
    } catch (aiErr) {
      console.warn('[Student Insight Service] Gemini generation failed, using rule-based fallback:', aiErr.message);
      generatedInsights = generateFallbackInsight(studentFirstName, metrics, factualHistoricalDiff);
    }

    if (!generatedInsights) {
      generatedInsights = generateFallbackInsight(studentFirstName, metrics, factualHistoricalDiff);
    }

    // 6. Persist / Upsert in Database
    const insightDocData = {
      studentId: resolvedStudentId,
      studentEmail: (student.email || '').toLowerCase().trim(),
      studentName: student.name || 'Student',
      className: student.className || '',
      section: student.section || 'A',
      roll: String(student.roll || '-'),
      latestExamName: latestGroup ? latestGroup.examName : '',
      latestExamType: latestGroup ? latestGroup.examType : 'Exam',
      latestExamDate: latestGroup ? latestGroup.examDate : '',
      totalExamsEvaluated,
      metrics,
      insights: generatedInsights,
      marksFingerprint: currentFingerprint,
      generatedAt: new Date()
    };

    const savedDoc = await StudentPerformanceInsight.findOneAndUpdate(
      { studentId: resolvedStudentId },
      insightDocData,
      { upsert: true, new: true, runValidators: true }
    );

    return {
      hasData: true,
      cached: false,
      data: savedDoc
    };
  } catch (error) {
    console.error('generateOrUpdateStudentInsight error:', error);
    throw error;
  }
}

module.exports = {
  calculateGradeAndGpa,
  generateOrUpdateStudentInsight
};
