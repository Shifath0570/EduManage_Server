const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

/**
 * Record or update attendance session (upsert)
 * Supports dynamic Classes 1 through 10 and sections A-D
 * POST /api/attendance
 */
exports.saveAttendance = async (req, res) => {
    try {
        const { className, section, subject, date, teacherEmail, teacherName, records } = req.body;

        if (!className || !section || !subject || !date || !records || !Array.isArray(records)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide className, section, subject, date, and records array.'
            });
        }

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Records array cannot be empty.'
            });
        }

        // Optional: Log teacher info if provided
        const normalizedClass = className.replace(/^class[_\s-]/i, '').replace(/^Class\s*/i, '').trim();

        const totalStudents = records.length;
        const presentCount = records.filter(r => r.status === 'PRESENT').length;
        const absentCount = records.filter(r => r.status === 'ABSENT').length;
        const lateCount = records.filter(r => r.status === 'LATE').length;
        const excusedCount = records.filter(r => r.status === 'EXCUSED').length;

        const updateData = {
            className: normalizedClass,
            section: section.toUpperCase().trim(),
            subject: subject.trim(),
            date: date.trim(),
            teacherEmail: (teacherEmail || req.user?.email || 'teacher@edumanage.com').toLowerCase().trim(),
            teacherName: teacherName || req.user?.name || 'Teacher',
            records,
            totalStudents,
            presentCount,
            absentCount,
            lateCount,
            excusedCount
        };

        const attendance = await Attendance.findOneAndUpdate(
            {
                className: updateData.className,
                section: updateData.section,
                subject: updateData.subject,
                date: updateData.date
            },
            updateData,
            { upsert: true, new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Attendance saved successfully',
            data: attendance
        });
    } catch (error) {
        console.error('Save attendance error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to save attendance'
        });
    }
};

/**
 * Get attendance records with filters
 * GET /api/attendance
 */
exports.getAttendance = async (req, res) => {
    try {
        const {
            className,
            class: classParam,
            section,
            subject,
            date,
            month,
            teacherEmail,
            teacher,
            studentId,
            studentEmail,
            studentName,
            search
        } = req.query;

        const filter = {};

        const targetClass = className || classParam;
        if (targetClass && targetClass !== 'All') {
            const cleanClass = targetClass.replace(/^class[_\s-]/i, '').replace(/^Class\s*/i, '').trim();
            filter.className = { $regex: new RegExp(`^(class[\\s_-]+)?${cleanClass}($|[^0-9].*)`, 'i') };
        }

        if (section && section !== 'All') {
            filter.section = section.toUpperCase().replace('SECTION', '').trim();
        }

        if (subject && subject !== 'All') {
            filter.subject = { $regex: new RegExp(`^${subject}$`, 'i') };
        }

        if (date) {
            filter.date = date;
        } else if (month) {
            // Month format: YYYY-MM
            filter.date = { $regex: new RegExp(`^${month}`) };
        }

        const targetTeacher = teacherEmail || teacher;
        if (targetTeacher && targetTeacher !== 'All') {
            filter.$or = [
                { teacherEmail: { $regex: targetTeacher, $options: 'i' } },
                { teacherName: { $regex: targetTeacher, $options: 'i' } }
            ];
        }

        if (studentId || studentEmail || studentName || search) {
            const term = studentId || studentEmail || studentName || search;
            filter.records = {
                $elemMatch: {
                    $or: [
                        { studentId: { $regex: term, $options: 'i' } },
                        { studentName: { $regex: term, $options: 'i' } },
                        { studentEmail: { $regex: term, $options: 'i' } },
                        { roll: { $regex: term, $options: 'i' } }
                    ]
                }
            };
        }

        const attendances = await Attendance.find(filter).sort({ date: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: attendances.length,
            data: attendances
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch attendance records'
        });
    }
};

/**
 * Get individual student attendance report
 * GET /api/attendance/student/:identifier
 */
exports.getStudentAttendance = async (req, res) => {
    try {
        const { identifier } = req.params;
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Student identifier (email or ID or roll) is required'
            });
        }

        const regex = new RegExp(`^${identifier.trim()}$`, 'i');

        // Find all attendance sessions containing this student
        const attendances = await Attendance.find({
            records: {
                $elemMatch: {
                    $or: [
                        { studentEmail: regex },
                        { studentId: regex },
                        { roll: regex },
                        { studentName: regex }
                    ]
                }
            }
        }).sort({ date: -1 });

        let totalClasses = 0;
        let present = 0;
        let absent = 0;
        let late = 0;
        let excused = 0;

        const subjectStats = {};
        const history = [];

        attendances.forEach(session => {
            const studentRecord = session.records.find(r =>
                (r.studentEmail && r.studentEmail.toLowerCase() === identifier.toLowerCase()) ||
                r.studentId === identifier ||
                r.roll === identifier ||
                r.studentName.toLowerCase() === identifier.toLowerCase()
            );

            if (studentRecord) {
                totalClasses++;
                const status = studentRecord.status;

                if (status === 'PRESENT') present++;
                else if (status === 'ABSENT') absent++;
                else if (status === 'LATE') late++;
                else if (status === 'EXCUSED') excused++;

                // Subject stats
                if (!subjectStats[session.subject]) {
                    subjectStats[session.subject] = {
                        subject: session.subject,
                        total: 0,
                        present: 0,
                        absent: 0,
                        late: 0,
                        excused: 0,
                        percentage: 0
                    };
                }

                subjectStats[session.subject].total++;
                if (status === 'PRESENT') subjectStats[session.subject].present++;
                else if (status === 'ABSENT') subjectStats[session.subject].absent++;
                else if (status === 'LATE') subjectStats[session.subject].late++;
                else if (status === 'EXCUSED') subjectStats[session.subject].excused++;

                history.push({
                    sessionId: session._id,
                    className: session.className,
                    section: session.section,
                    subject: session.subject,
                    date: session.date,
                    teacherName: session.teacherName,
                    status: studentRecord.status,
                    remarks: studentRecord.remarks || ''
                });
            }
        });

        // Compute percentages
        const attendancePercentage = totalClasses > 0 ? Math.round(((present + late) / totalClasses) * 100) : 0;

        Object.keys(subjectStats).forEach(subj => {
            const s = subjectStats[subj];
            s.percentage = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
        });

        res.status(200).json({
            success: true,
            data: {
                studentIdentifier: identifier,
                summary: {
                    totalClasses,
                    present,
                    absent,
                    late,
                    excused,
                    attendancePercentage
                },
                subjectBreakdown: Object.values(subjectStats),
                history
            }
        });
    } catch (error) {
        console.error('Get student attendance error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch student attendance'
        });
    }
};

/**
 * Get school attendance statistics (Admin & overview metrics)
 * GET /api/attendance/stats
 */
exports.getAttendanceStats = async (req, res) => {
    try {
        const totalSessions = await Attendance.countDocuments();
        
        const aggregation = await Attendance.aggregate([
            {
                $group: {
                    _id: null,
                    totalStudentsMarked: { $sum: '$totalStudents' },
                    totalPresent: { $sum: '$presentCount' },
                    totalAbsent: { $sum: '$absentCount' },
                    totalLate: { $sum: '$lateCount' },
                    totalExcused: { $sum: '$excusedCount' }
                }
            }
        ]);

        const classWise = await Attendance.aggregate([
            {
                $group: {
                    _id: '$className',
                    sessions: { $sum: 1 },
                    totalStudents: { $sum: '$totalStudents' },
                    totalPresent: { $sum: '$presentCount' },
                    totalAbsent: { $sum: '$absentCount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totals = aggregation[0] || {
            totalStudentsMarked: 0,
            totalPresent: 0,
            totalAbsent: 0,
            totalLate: 0,
            totalExcused: 0
        };

        const overallPercentage = totals.totalStudentsMarked > 0
            ? Math.round(((totals.totalPresent + totals.totalLate) / totals.totalStudentsMarked) * 100)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                totalSessions,
                totals,
                overallPercentage,
                classWise
            }
        });
    } catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch attendance stats'
        });
    }
};
