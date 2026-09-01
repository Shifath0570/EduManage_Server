const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: [true, 'Exam name is required'],
    trim: true
  },
  examType: {
    type: String,
    enum: ['Mid Term', 'Final', 'Class Test', 'Quiz', 'Other'],
    default: 'Mid Term'
  },
  className: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
    index: true
  },
  subject: {
    type: String,
    trim: true,
    default: 'All Subjects'
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks are required'],
    default: 100
  },
  passMarks: {
    type: Number,
    default: 40
  },
  examDate: {
    type: String,
    required: [true, 'Exam date is required']
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Active', 'Completed'],
    default: 'Active'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  collection: 'Exams',
  timestamps: true
});

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
