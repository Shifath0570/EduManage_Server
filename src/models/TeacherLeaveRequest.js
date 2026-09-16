
const mongoose = require('mongoose');

const teacherLeaveRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References your User collection/model
      required: true,
      index: true, // Speeds up queries filtering by userId
    },
    teacher: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      department: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: false,
        trim: true,
        lowercase: true,
      },
    },
    leaveType: {
      type: String,
      enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity/Paternity Leave'],
      required: true,
      default: 'Casual Leave',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    applicationText: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    collection: 'TeacherLeaveRequests',
    timestamps: true, // Automatically handles createdAt and updatedAt fields
  }
);

module.exports = mongoose.model('TeacherLeaveRequest', teacherLeaveRequestSchema);