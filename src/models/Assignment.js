const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    teacherId: {
        type: String,
        trim: true
    },
    classId: {
        type: String,
        required: [true, 'Class is required'],
        trim: true
    },
    sectionId: {
        type: String,
        required: [true, 'Section is required'],
        trim: true
    },
    subjectId: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true
    },
    academicYear: {
        type: String,
        required: [true, 'Academic year is required'],
        trim: true
    },
    assignedBy: {
        type: String,
        trim: true
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
}, {
    collection: "Assignments",
    timestamps: true
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;