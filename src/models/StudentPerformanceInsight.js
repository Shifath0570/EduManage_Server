const mongoose = require('mongoose');

const studentPerformanceInsightSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  studentEmail: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  studentName: {
    type: String,
    trim: true
  },
  className: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  roll: {
    type: String,
    trim: true
  },
  latestExamName: {
    type: String,
    trim: true
  },
  latestExamType: {
    type: String,
    trim: true
  },
  latestExamDate: {
    type: String,
    trim: true
  },
  totalExamsEvaluated: {
    type: Number,
    default: 0
  },
  // Exact calculations verified by the backend
  metrics: {
    totalMarks: { type: Number, default: 0 },
    obtainedMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    gpa: { type: Number, default: 0.0 },
    grade: { type: String, default: 'N/A' },
    isPassed: { type: Boolean, default: true },
    totalSubjects: { type: Number, default: 0 },
    strongestSubject: { type: String, default: '' },
    weakestSubject: { type: String, default: '' },
    subjectBreakdown: [{
      subject: String,
      marksObtained: Number,
      totalMarks: Number,
      percentage: Number,
      grade: String,
      gpa: Number
    }]
  },
  // Structured AI-generated qualitative feedback
  insights: {
    headline: {
      type: String,
      default: ''
    },
    subline: {
      type: String,
      default: ''
    },
    performanceLevel: {
      type: String,
      enum: ['Outstanding', 'Excellent', 'Good', 'Satisfactory', 'Progressing', 'Needs Improvement'],
      default: 'Good'
    },
    compliment: {
      type: String,
      required: true
    },
    strengths: [{
      type: String
    }],
    improvementAreas: [{
      type: String
    }],
    recommendations: [{
      type: String
    }],
    nextGoal: {
      type: String,
      required: true
    },
    historicalComparison: {
      type: String,
      default: ''
    }
  },
  marksFingerprint: {
    type: String,
    trim: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'StudentPerformanceInsights',
  timestamps: true
});

studentPerformanceInsightSchema.index({ studentId: 1, marksFingerprint: 1 });

const StudentPerformanceInsight = mongoose.model('StudentPerformanceInsight', studentPerformanceInsightSchema);

module.exports = StudentPerformanceInsight;
