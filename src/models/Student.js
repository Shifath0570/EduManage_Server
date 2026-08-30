const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    roll: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    profileImage: {
        type: String,
        default: 'default-teacher.jpg'
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
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'male'
    },
    guardianName: {
        type: String,
        trim: true,
        default: ''
    },
    guardianPhone: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    collection: 'Students',
    timestamps: true
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
