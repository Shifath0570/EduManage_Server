const mongoose = require('mongoose');

// Teacher Schema
const teacherSchema = new mongoose.Schema({
    teacherId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        match: [/^01\d{9}$|^01\d{2}-\d{6,8}$/, 'Please provide a valid phone number']
    },
    subjects: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v && v.length > 0;
            },
            message: 'A teacher must have at least one subject'
        }
    },
    className: {
        type: String,
        required: true,
        trim: true,
        enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        default: '1'
    },
    section: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        enum: ['A', 'B', 'C', 'D', 'E'],
        default: 'A'
    },
    studentCount: {
        type: Number,
        required: true,
        min: 0,
        max: 60,
        default: 0
    },
    status: {
        type: String,
        required: true,
        enum: ['Active', 'Inactive', 'Suspended'],
        default: 'Active'
    },
    // Optional fields for additional functionality
    joiningDate: {
        type: Date,
        default: Date.now
    },
    address: {
        type: String,
        trim: true
    },
    profilePicture: {
        type: String,
        default: 'default-teacher.jpg'
    }
}, {
    collection: "Teachers",
    timestamps: true // Adds createdAt and updatedAt fields automatically

});

// Create the model
const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;