const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String,
      required: [true, 'Teacher ID is required'],
      trim: true
    },
    classId: {
      type: String,
      required: [true, 'Class ID is required'],
      trim: true
    },
    groupId: {
      type: String,
      trim: true,
      default: 'N/A',
      validate: {
        validator: function (value) {
          // If class is Class 9 or 10, groupId cannot be empty or 'N/A'
          const isSSCClass = this.classId === 'class_9' || this.classId === 'class_10';
          if (isSSCClass) {
            return value && value.trim() !== '' && value !== 'N/A';
          }
          return true;
        },
        message: 'Group is required for Class 9 and Class 10'
      }
    },
    sectionId: {
      type: String,
      required: [true, 'Section ID is required'],
      trim: true
    },
    teacherName: {
      type: String,
      required: [true, 'Teacher Name is required'],
      trim: true
    },
    teacherEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    subjectId: {
      type: String,
      required: [true, 'Subject ID is required'],
      trim: true
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true
    },
    assignedBy: {
      type: String,
      trim: true,
      default: ''
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    }
  },
  {
    collection: 'Assignments',
    timestamps: true
  }
);

module.exports = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);