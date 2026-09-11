const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Assignment = require('../models/Assignment');
const AttendanceNotice = require('../models/AttendanceNotice');
const { normalizeClassNumber, normalizeGroup } = require('../config/classSubjects');

// Helper to normalize Class strings (e.g. "Class 5", "class-5", "5" -> "5")
const normalizeClass = (cls) => String(cls || '').replace(/^class[_\-\s]*/i, '').replace(/^Class\s*/i, '').trim();

// Helper to normalize Section strings (e.g. "Section A", "sec-a", "a" -> "A")
const normalizeSection = (sec) => String(sec || '').toUpperCase().replace(/^SECTION/i, '').replace(/^SEC[-_]/i, '').trim();

/**
 * Resolves user identity, role, and teacher assignments from request
 */
async function resolveUserAndAssignments(req) {
    const role = (
        req.user?.role ||
        req.headers['x-user-role'] ||
        req.body?.teacherRole ||
        req.body?.userRole ||
        req.query?.teacherRole ||
        req.query?.userRole ||
        req.query?.role ||
        ''
    ).toLowerCase().trim();

    const email = (
        req.user?.email ||
        req.headers['x-user-email'] ||
        req.body?.teacherEmail ||
        req.query?.teacherEmail ||
        req.query?.email ||
        ''
    ).toLowerCase().trim();

    const userId =
        req.user?.id ||
        req.headers['x-user-id'] ||
        req.body?.teacherId ||
        req.query?.teacherId ||
        req.query?.userId ||
        null;

    // Explicit check for admin
    if (role === 'admin' || req.headers['x-user-role'] === 'admin') {
        return { isTeacher: false, role: 'admin', email, userId, assignments: [] };
    }

    // Determine if request is from a teacher context
    const isTeacherRole = role === 'teacher' || (!role && email && (req.body?.teacherEmail || req.query?.teacherEmail || req.headers['x-user-email']));

    if (!isTeacherRole && !email && !userId) {
        return { isTeacher: false, role: role || 'admin', email, userId, assignments: [] };
    }

    const orQueries = [];
    if (email) {
        orQueries.push({ teacherEmail: email });
    }
    if (userId) {
        orQueries.push({ teacherId: String(userId) });
    }

    let teacherDoc = null;
    if (email) {
        teacherDoc = await Teacher.findOne({ email });
        if (teacherDoc) {
            orQueries.push({ teacherId: String(teacherDoc._id) });
            if (teacherDoc.teacherId) {
                orQueries.push({ teacherId: String(teacherDoc.teacherId) });
            }
        }
    }

    let assignments = [];
    if (orQueries.length > 0) {
        assignments = await Assignment.find({ $or: orQueries, status: { $ne: 'Inactive' } });
    }

    return {
        isTeacher: isTeacherRole || assignments.length > 0 || (email && !role.includes('admin')),
        role: role || 'teacher',
        email,
        userId: userId || (teacherDoc ? String(teacherDoc._id) : null),
        teacherDoc,
        assignments
    };
}

/**
 * Validates if teacher is assigned to take attendance for a given class, section, and subject
 */
function isTeacherAuthorizedForAttendance(teacherInfo, targetClass, targetSection, targetSubject) {
    if (!teacherInfo.isTeacher) return true; // Admin has full access

    const { assignments } = teacherInfo;
    if (!assignments || assignments.length === 0) return false;

    const targetClassNum = normalizeClassNumber(targetClass);
    const cleanSec = normalizeSection(targetSection) || 'A';
    const cleanSub = String(targetSubject || '').toLowerCase().trim();

    return assignments.some((a) => {
        // 1. Class match
        const aClassNum = normalizeClassNumber(a.classId);
        if (aClassNum !== targetClassNum) return false;

        // 2. Section match (if assigned section is specific and not "All")
        if (a.sectionId && a.sectionId !== 'All') {
            const aSec = normalizeSection(a.sectionId);
            if (aSec && aSec !== cleanSec) return false;
        }

        // 3. Subject match
        if (a.subjectId && a.subjectId !== 'All') {
            const aSub = String(a.subjectId).toLowerCase().trim();
            const normASub = aSub.replace(/[\s_-]+/g, '');
            const normTSub = cleanSub.replace(/[\s_-]+/g, '');
            if (normASub !== normTSub) return false;
        }

        return true;
    });
}

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

        // Authorize teacher assignment
        const teacherInfo = await resolveUserAndAssignments(req);
        if (teacherInfo.isTeacher) {
            const isAuthorized = isTeacherAuthorizedForAttendance(teacherInfo, className, section, subject);
            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: `Unauthorized: You are not assigned to take attendance for Class ${className} - Section ${section} (${subject}).`
                });
            }
        }

        const normalizedClass = normalizeClass(className);
        const normalizedSection = normalizeSection(section);

        const totalStudents = records.length;
        const presentCount = records.filter(r => r.status === 'PRESENT').length;
        const absentCount = records.filter(r => r.status === 'ABSENT').length;
        const lateCount = records.filter(r => r.status === 'LATE').length;
        const excusedCount = records.filter(r => r.status === 'EXCUSED').length;

        const updateData = {
            className: normalizedClass,
            section: normalizedSection,
            subject: subject.trim(),
            date: date.trim(),
            teacherEmail: (teacherEmail || teacherInfo.email || req.user?.email || 'teacher@edumanage.com').toLowerCase().trim(),
            teacherName: teacherName || req.user?.name || teacherInfo.teacherDoc?.fullName || 'Teacher',
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

        // Teacher assignment scoping
        const teacherInfo = await resolveUserAndAssignments(req);
        if (teacherInfo.isTeacher) {
            if (!teacherInfo.assignments || teacherInfo.assignments.length === 0) {
                return res.status(200).json({
                    success: true,
                    count: 0,
                    data: []
                });
            }

            const assignmentOr = teacherInfo.assignments.map((a) => {
                const aClassNum = normalizeClassNumber(a.classId);
                const cond = {};
                if (aClassNum) {
                    cond.className = { $regex: new RegExp(`^(class[\\s_-]+)?${aClassNum}($|[^0-9].*)`, 'i') };
                }
                if (a.sectionId && a.sectionId !== 'All') {
                    const aSec = normalizeSection(a.sectionId);
                    if (aSec) {
                        cond.section = aSec;
                    }
                }
                if (a.subjectId && a.subjectId !== 'All') {
                    cond.subject = { $regex: new RegExp(`^${a.subjectId.trim()}$`, 'i') };
                }
                return cond;
            });

            if (filter.$and) {
                filter.$and.push({ $or: assignmentOr });
            } else {
                filter.$and = [{ $or: assignmentOr }];
            }
        }

        const targetClass = className || classParam;
        if (targetClass && targetClass !== 'All') {
            const cleanClass = normalizeClass(targetClass);
            filter.className = { $regex: new RegExp(`^(class[\\s_-]+)?${cleanClass}($|[^0-9].*)`, 'i') };
        }

        if (section && section !== 'All') {
            filter.section = normalizeSection(section);
        }

        if (subject && subject !== 'All') {
            filter.subject = { $regex: new RegExp(`^${subject.trim()}$`, 'i') };
        }

        if (date) {
            filter.date = date;
        } else if (month) {
            // Month format: YYYY-MM
            filter.date = { $regex: new RegExp(`^${month}`) };
        }

        const targetTeacher = teacherEmail || teacher;
        if (targetTeacher && targetTeacher !== 'All' && !teacherInfo.isTeacher) {
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

/**
 * Generate AI Attendance Warning using Gemini API
 */
async function generateAIAttendanceNoticeWithGemini(details) {
    const {
        studentName,
        roll,
        className,
        section,
        subject,
        attendancePercentage,
        isEligible,
        date,
        teacherName,
        totalClasses,
        presentCount,
        absentCount
    } = details;

    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `You are an academic advisor at EduManage School.
Write a SHORT, SIMPLE, and IMPACTFUL attendance notice (maximum 3 to 4 concise sentences, under 60 words total).

Student Details:
- Name: ${studentName} (Roll: ${roll || 'N/A'})
- Class: Class ${className}-${section} | Subject: ${subject}
- Current Attendance: ${attendancePercentage}% (Minimum Required: 75%)
- Exam Eligibility: ${isEligible ? 'Eligible (Caution)' : 'INELIGIBLE (Below 75%)'}

Rules:
1. Keep it short, simple, and direct. No fluff.
2. ${!isEligible 
    ? `Clearly state: Attendance is ${attendancePercentage}% (below 75%). As per school rules, you cannot sit for the exams. Instruct them to be regular in every class immediately to restore eligibility.`
    : `State: Attendance is ${attendancePercentage}%. Warn that missing classes risks falling below 75%. Urge them to remain regular in class.`}
3. Use bold text for key points.`;

    if (apiKey) {
        const models = [
            'gemini-3.5-flash',
            'gemini-3.7-flash',
            'gemini-3.6-flash',
            'gemini-3.5-flash-lite',
            'gemini-flash-latest',
            'gemini-3.1-flash-lite'
        ];

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (aiText && aiText.trim()) {
                        return aiText.trim();
                    }
                }
            } catch (err) {
                console.warn(`Gemini model ${model} failed, trying next fallback:`, err.message);
            }
        }
    }

    // Fallback concise and impactful templates
    if (!isEligible) {
        return `⚠️ **Exam Ineligibility Warning:** Dear **${studentName}**, your attendance in **${subject}** is **${attendancePercentage}%**, which is below the mandatory **75%** threshold. Under school policy, you **cannot sit for the upcoming examinations**. You must attend all remaining classes regularly and without fail to recover your eligibility.`;
    } else {
        return `📋 **Attendance Advisory:** Dear **${studentName}**, your attendance in **${subject}** is currently **${attendancePercentage}%**. While you currently meet the **75%** threshold, further absences will put your exam eligibility at risk. Please stay regular and punctual in all upcoming classes.`;
    }
}

/**
 * Generate and send AI Attendance Warning Notice for an absent student
 * POST /api/attendance/ai-warning
 */
exports.sendAIAttendanceWarning = async (req, res) => {
    try {
        const {
            studentId,
            studentName,
            studentEmail,
            roll,
            className,
            section,
            subject,
            date,
            teacherName,
            teacherEmail
        } = req.body;

        if (!studentName || !className || !subject) {
            return res.status(400).json({
                success: false,
                message: 'Missing required student or class parameters.'
            });
        }

        // Calculate student's attendance stats dynamically
        const identifier = studentEmail || studentId || roll || studentName;
        const regex = new RegExp(`^${identifier.trim()}$`, 'i');

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
        });

        let totalClasses = 0;
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let subjectTotal = 0;
        let subjectPresent = 0;
        let subjectAbsent = 0;
        let subjectLate = 0;

        attendances.forEach(session => {
            const studentRecord = session.records.find(r =>
                (r.studentEmail && r.studentEmail.toLowerCase() === identifier.toLowerCase()) ||
                r.studentId === identifier ||
                r.roll === identifier ||
                r.studentName.toLowerCase() === identifier.toLowerCase()
            );

            if (studentRecord) {
                totalClasses++;
                if (studentRecord.status === 'PRESENT') presentCount++;
                else if (studentRecord.status === 'ABSENT') absentCount++;
                else if (studentRecord.status === 'LATE') lateCount++;

                if (session.subject && session.subject.toLowerCase() === subject.toLowerCase()) {
                    subjectTotal++;
                    if (studentRecord.status === 'PRESENT') subjectPresent++;
                    else if (studentRecord.status === 'ABSENT') subjectAbsent++;
                    else if (studentRecord.status === 'LATE') subjectLate++;
                }
            }
        });

        // Calculate subject-specific or overall percentage
        const targetTotal = subjectTotal > 0 ? subjectTotal : totalClasses;
        const targetPresent = subjectTotal > 0 ? (subjectPresent + subjectLate) : (presentCount + lateCount);
        const attendancePercentage = targetTotal > 0 ? Math.round((targetPresent / targetTotal) * 100) : 0;

        const isEligibleForExam = attendancePercentage >= 75;
        const status = isEligibleForExam ? 'ATTENDANCE_WARNING' : 'EXAM_INELIGIBLE_WARNING';
        const title = isEligibleForExam
            ? `Attendance Advisory Notice • ${subject}`
            : `⚠️ Exam Ineligibility Warning: Attendance Below 75% (${attendancePercentage}%) • ${subject}`;

        const aiMessage = await generateAIAttendanceNoticeWithGemini({
            studentName,
            roll,
            className,
            section,
            subject,
            attendancePercentage,
            isEligible: isEligibleForExam,
            date: date || new Date().toISOString().split('T')[0],
            teacherName: teacherName || req.user?.name || 'Teacher',
            totalClasses: targetTotal,
            presentCount: targetPresent,
            absentCount: subjectTotal > 0 ? subjectAbsent : absentCount
        });

        const noticeDoc = await AttendanceNotice.create({
            studentId: studentId || `STU-${roll || '0'}`,
            studentEmail: (studentEmail || '').toLowerCase().trim(),
            studentName,
            roll: String(roll || ''),
            className: String(className),
            section: String(section),
            subject: String(subject),
            date: date || new Date().toISOString().split('T')[0],
            teacherName: teacherName || req.user?.name || 'Teacher',
            teacherEmail: (teacherEmail || req.user?.email || '').toLowerCase().trim(),
            attendancePercentage,
            threshold: 75,
            isEligibleForExam,
            status,
            title,
            message: aiMessage,
            totalClasses: targetTotal,
            presentCount: targetPresent,
            absentCount: subjectTotal > 0 ? subjectAbsent : absentCount
        });

        res.status(200).json({
            success: true,
            message: isEligibleForExam
                ? `AI Attendance Advisory sent to ${studentName} (${attendancePercentage}% attendance).`
                : `AI Exam Ineligibility Warning sent to ${studentName} (${attendancePercentage}% < 75%).`,
            data: noticeDoc
        });
    } catch (error) {
        console.error('AI Attendance Warning Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate and send AI attendance warning notice'
        });
    }
};

/**
 * Get all attendance notices for a student
 * GET /api/attendance/notices/student/:identifier
 */
exports.getStudentAttendanceNotices = async (req, res) => {
    try {
        const { identifier } = req.params;
        if (!identifier) {
            return res.status(400).json({ success: false, message: 'Identifier is required' });
        }

        const regex = new RegExp(`^${identifier.trim()}$`, 'i');

        const notices = await AttendanceNotice.find({
            $or: [
                { studentEmail: regex },
                { studentId: regex },
                { roll: regex },
                { studentName: regex }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: notices.length,
            data: notices
        });
    } catch (error) {
        console.error('Get student attendance notices error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch student attendance notices'
        });
    }
};

/**
 * Get all attendance notices with filters
 * GET /api/attendance/notices
 */
exports.getAttendanceNotices = async (req, res) => {
    try {
        const { className, section, subject, date, teacherEmail, isEligibleForExam } = req.query;
        const filter = {};

        if (className && className !== 'All') filter.className = String(className);
        if (section && section !== 'All') filter.section = String(section);
        if (subject && subject !== 'All') filter.subject = String(subject);
        if (date) filter.date = String(date);
        if (teacherEmail) filter.teacherEmail = teacherEmail.toLowerCase().trim();
        if (isEligibleForExam !== undefined) filter.isEligibleForExam = isEligibleForExam === 'true';

        const notices = await AttendanceNotice.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: notices.length,
            data: notices
        });
    } catch (error) {
        console.error('Get attendance notices error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch attendance notices'
        });
    }
};
