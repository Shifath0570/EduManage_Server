
const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    teacherId: {
        type: String,
        trim: true
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    dateOfBirth: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'male', 'female', 'other'],
        required: true
    },
    bloodGroup: {
        type: String
    },
    profilePhoto: {
        type: String,
        default: 'default-teacher.jpg'
    },
    qualifications: {
        type: String,
        required: true
    },
    experienceYears: {
        type: Number,
        default: 0
    },
    subjectSpecialization: {
        type: String,
        required: true
    },
    joiningDate: {
        type: String,
        required: true
    },
    employeeId: {
        type: String
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true
    },
    stateProvince: {
        type: String,
        required: true
    },
    postCode: {
        type: String,
        required: true
    },
    guardianName: {
        type: String,
        required: true
    },
    guardianPhone: {
        type: String,
        required: true
    },
    emergencyContact: {
        type: String
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Suspended'],
        default: 'Active'
    }
}, {
    collection: "Teachers",
    timestamps: true
});

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;

