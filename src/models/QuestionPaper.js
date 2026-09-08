const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    default: []
  },
  marks: {
    type: Number,
    required: true,
    default: 1
  },
  suggestedAnswer: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const sectionSchema = new mongoose.Schema({
  sectionTitle: {
    type: String,
    required: true,
    trim: true
  },
  instructions: {
    type: String,
    trim: true,
    default: ''
  },
  sectionMarks: {
    type: Number,
    required: true,
    default: 0
  },
  questions: {
    type: [questionSchema],
    default: []
  }
}, { _id: false });

const questionPaperSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    unique: true,
    index: true
  },
  examName: {
    type: String,
    required: true,
    trim: true
  },
  className: {
    type: String,
    required: true,
    trim: true
  },
  stream: {
    type: String,
    trim: true,
    default: null
  },
  section: {
    type: String,
    trim: true,
    default: 'A'
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  academicYear: {
    type: String,
    trim: true,
    default: new Date().getFullYear().toString()
  },
  examDate: {
    type: String,
    trim: true,
    default: ''
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 100
  },
  duration: {
    type: String,
    trim: true,
    default: '2 Hours 30 Minutes'
  },
  generalInstructions: {
    type: [String],
    default: [
      'Figures in the right margin indicate full marks.',
      'Answer all questions according to the instructions in each section.',
      'Write your roll number and class clearly on the answer script.'
    ]
  },
  sections: {
    type: [sectionSchema],
    default: []
  },
  generatedBy: {
    type: String,
    trim: true,
    default: 'AI Assistant'
  }
}, {
  collection: 'QuestionPapers',
  timestamps: true
});

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);

module.exports = QuestionPaper;
