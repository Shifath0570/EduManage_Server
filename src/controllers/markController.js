const Mark = require('../models/Mark');

// Helper to calculate Grade and GPA based on marks percentage
const calculateGradeAndGpa = (marksObtained, totalMarks = 100) => {
  const score = Number(marksObtained);
  const total = Number(totalMarks) || 100;
  const percentage = total > 0 ? (score / total) * 100 : 0;

  if (percentage >= 80) return { grade: 'A+', gpa: 5.0 };
  if (percentage >= 70) return { grade: 'A', gpa: 4.0 };
  if (percentage >= 60) return { grade: 'A-', gpa: 3.5 };
  if (percentage >= 50) return { grade: 'B', gpa: 3.0 };
  if (percentage >= 40) return { grade: 'C', gpa: 2.0 };
  if (percentage >= 33) return { grade: 'D', gpa: 1.0 };
  return { grade: 'F', gpa: 0.0 };
};

/**
 * Save or update marks for students (bulk upsert)
 * POST /api/marks
 */
exports.saveMarks = async (req, res) => {
  try {
    const { className, class: classParam, section, exam, subject, records } = req.body;

    const targetClass = className || classParam;

    if (!targetClass || !section || !exam || !subject || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide className, section, exam, subject, and records array.'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Records array cannot be empty.'
      });
    }

    const cleanClass = targetClass.replace('class_', '').replace('Class', '').replace('class-', '').trim();
    const formattedClass = `Class ${cleanClass}`;
    const cleanSection = section.toUpperCase().replace('SECTION', '').trim();
    const cleanExam = exam.trim();
    const cleanSubject = subject.trim();

    // Drop legacy conflicting unique indexes (e.g. exam_1_className_1_subject_1) if present
    try {
      const indexes = await Mark.collection.indexes();
      for (const idx of indexes) {
        if (idx.name !== '_id_' && idx.unique && (!idx.key || !idx.key.studentId)) {
          console.log(`Dropping legacy unique index on Marks: ${idx.name}`);
          await Mark.collection.dropIndex(idx.name);
        }
      }
    } catch (idxErr) {
      // Collection or index may not exist yet
    }

    const savedMarks = [];

    for (const item of records) {
      const studentId = item.studentId || item._id;
      if (!studentId) continue;

      const marksObtained = Math.min(100, Math.max(0, Number(item.marksObtained || item.marks || 0)));
      const totalMarks = Number(item.totalMarks) || 100;
      const { grade, gpa } = calculateGradeAndGpa(marksObtained, totalMarks);

      const updateData = {
        studentId: String(studentId).trim(),
        studentName: (item.studentName || item.name || 'Student').trim(),
        roll: String(item.roll || '0').trim(),
        className: formattedClass,
        section: cleanSection,
        exam: cleanExam,
        subject: cleanSubject,
        marksObtained,
        totalMarks,
        grade,
        gpa,
        remarks: item.remarks || ''
      };

      const record = await Mark.findOneAndUpdate(
        {
          studentId: updateData.studentId,
          exam: updateData.exam,
          subject: updateData.subject,
          className: updateData.className,
          section: updateData.section
        },
        updateData,
        { upsert: true, new: true, runValidators: true }
      );

      savedMarks.push(record);
    }

    res.status(200).json({
      success: true,
      message: `Marks saved successfully for ${savedMarks.length} students.`,
      count: savedMarks.length,
      data: savedMarks
    });
  } catch (error) {
    console.error('Save marks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save marks'
    });
  }
};

/**
 * Get marks with filters
 * GET /api/marks
 */
exports.getMarks = async (req, res) => {
  try {
    const { className, class: classParam, section, exam, subject, studentId } = req.query;

    const filter = {};

    const targetClass = className || classParam;
    if (targetClass && targetClass !== 'All') {
      const cleanClass = targetClass.replace('class_', '').replace('Class', '').replace('class-', '').trim();
      filter.className = { $regex: new RegExp(`^${cleanClass}$|^Class ${cleanClass}$|^class_${cleanClass}$`, 'i') };
    }

    if (section && section !== 'All') {
      const cleanSection = section.toUpperCase().replace('SECTION', '').trim();
      filter.section = cleanSection;
    }

    if (exam && exam !== 'All') {
      filter.exam = { $regex: new RegExp(`^${exam.trim()}$`, 'i') };
    }

    if (subject && subject !== 'All') {
      filter.subject = { $regex: new RegExp(`^${subject.trim()}$`, 'i') };
    }

    if (studentId) {
      filter.studentId = String(studentId).trim();
    }

    const marks = await Mark.find(filter).sort({ roll: 1, studentId: 1 });

    res.status(200).json({
      success: true,
      count: marks.length,
      data: marks
    });
  } catch (error) {
    console.error('Get marks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch marks'
    });
  }
};
