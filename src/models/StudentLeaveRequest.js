
const mongoose = require('mongoose');

const studentLeaveRequestSchema = new mongoose.Schema(
  {
    // Link to the user/auth system
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // Embedded student details matching form payload
    student: {
      id: {
        type: String,
        required: true,
      },
      studentId: {
        type: String,
        trim: true,
        default: '',
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      className: {
        type: String,
        required: true,
        trim: true,
      },
      section: {
        type: String,
        required: true,
        trim: true,
      },
      roll: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
      },
    },
    leaveType: {
      type: String,
      enum: [
        'Sick Leave',
        'Casual / Personal Leave',
        'Family Function',
        'Medical Emergency',
      ],
      required: true,
      default: 'Sick Leave',
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
      index: true,
    },
  },
  {
    collection: 'StudentLeaveRequests',
    timestamps: true, // Automatically handles createdAt and updatedAt
  }
);

module.exports =
  mongoose.models.StudentLeaveRequest ||
  mongoose.model('StudentLeaveRequest', studentLeaveRequestSchema);







