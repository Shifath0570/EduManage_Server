const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        trim: true
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    studentEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    roll: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
        default: 'PRESENT'
    },
    remarks: {
        type: String,
        trim: true,
        default: ''
    }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        trim: true
    },
    section: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD for reliable day-level grouping
        required: true,
        trim: true,
        index: true
    },
    teacherEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    teacherName: {
        type: String,
        trim: true,
        default: 'Teacher'
    },
    totalStudents: {
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
    lateCount: {
        type: Number,
        default: 0
    },
    excusedCount: {
        type: Number,
        default: 0
    },
    records: [attendanceRecordSchema]
}, {
    collection: 'Attendance',
    timestamps: true
});

// Ensure a single class/section/subject can only have one attendance session per date
attendanceSchema.index({ className: 1, section: 1, subject: 1, date: 1 }, { unique: true });

// Pre-save hook to calculate status counts automatically
attendanceSchema.pre('save', function (next) {
    if (this.records && Array.isArray(this.records)) {
        this.totalStudents = this.records.length;
        this.presentCount = this.records.filter(r => r.status === 'PRESENT').length;
        this.absentCount = this.records.filter(r => r.status === 'ABSENT').length;
        this.lateCount = this.records.filter(r => r.status === 'LATE').length;
        this.excusedCount = this.records.filter(r => r.status === 'EXCUSED').length;
    }
    next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
