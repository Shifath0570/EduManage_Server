const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  roll: {
    type: String,
    required: true,
    trim: true
  },
  className: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  section: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  exam: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  marksObtained: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalMarks: {
    type: Number,
    default: 100
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B', 'C', 'D', 'F'],
    default: 'F'
  },
  gpa: {
    type: Number,
    default: 0.0
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  collection: 'Marks',
  timestamps: true
});

// Index to ensure compound uniqueness for Student + Exam + Subject + Class + Section
markSchema.index(
  { studentId: 1, exam: 1, subject: 1, className: 1, section: 1 },
  { unique: true }
);

const Mark = mongoose.model('Mark', markSchema);

module.exports = Mark;
