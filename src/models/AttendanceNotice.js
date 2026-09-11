const mongoose = require('mongoose');

const attendanceNoticeSchema = new mongoose.Schema(
  {
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
      required: true,
      trim: true
    },
    roll: {
      type: String,
      trim: true
    },
    className: {
      type: String,
      required: true,
      trim: true
    },
    section: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true
    },
    teacherName: {
      type: String,
      default: 'Teacher'
    },
    teacherEmail: {
      type: String,
      default: ''
    },
    attendancePercentage: {
      type: Number,
      required: true
    },
    threshold: {
      type: Number,
      default: 75
    },
    isEligibleForExam: {
      type: Boolean,
      required: true
    },
    status: {
      type: String,
      enum: ['EXAM_INELIGIBLE_WARNING', 'ATTENDANCE_WARNING', 'REGULARITY_ADVISORY'],
      default: 'ATTENDANCE_WARNING'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    totalClasses: {
      type: Number,
      default: 0
    },
    presentCount: {
      type: Number,
      default: 0
    },
    absentCount: {
      type: Number,
      default: 0
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    collection: 'AttendanceNotices',
    timestamps: true
  }
);

module.exports = mongoose.models.AttendanceNotice || mongoose.model('AttendanceNotice', attendanceNoticeSchema);
