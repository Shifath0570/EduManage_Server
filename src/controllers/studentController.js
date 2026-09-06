const Student = require('../models/Student');

// Get all students (with optional filtering by className, section, status)
exports.getStudents = async (req, res) => {
  try {
    const { className, class: classParam, section, status, stream, group } = req.query;

    const filter = {};
    const targetClass = className || classParam;
    const targetGroup = stream || group;

    if (targetClass && targetClass !== 'All') {
      const classNum = normalizeClassNumber(targetClass);
      const normGroup = normalizeGroup(targetGroup);

      if (classNum) {
        if (classNum >= 9 && normGroup) {
          // Strict Class 9 or 10 with group
          const mapKey = getClassSubjectMapKey(classNum, normGroup); // e.g. "class_9_businessStudies"
          const groupRegex = normGroup === 'businessStudies' ? 'business' : normGroup;
          filter.$and = filter.$and || [];
          filter.$and.push({
            $or: [
              { className: new RegExp(`^${mapKey}$|^class[\\s_-]*${classNum}[\\s_-]*${groupRegex}`, 'i') },
              {
                className: new RegExp(`^(class[\\s_-]+)?${classNum}($|[^0-9].*)`, 'i'),
                stream: new RegExp(`^${normGroup}$|^${groupRegex}$|^${targetGroup}$`, 'i')
              },
              {
                className: new RegExp(`^(class[\\s_-]+)?${classNum}($|[^0-9].*)`, 'i'),
                group: new RegExp(`^${normGroup}$|^${groupRegex}$|^${targetGroup}$`, 'i')
              }
            ]
          });
        } else if (classNum <= 8) {
          // Class 1 to 8: strictly match class 1..8 and NOT class 10
          filter.className = { $regex: new RegExp(`^(class[\\s_-]+)?${classNum}$`, 'i') };
        } else {
          // Class 9 or 10 without group specified
          filter.className = { $regex: new RegExp(`^(class[\\s_-]+)?${classNum}($|[^0-9].*)`, 'i') };
        }
      } else {
        const cleanClass = targetClass.replace(/^class[_\s-]/i, '').replace(/^Class\s*/i, '').trim();
        filter.className = { $regex: new RegExp(`^(class[\\s_-]+)?${cleanClass}($|[^0-9].*)`, 'i') };
      }
    }

    if (section && section !== 'All') {
      const cleanSection = section.toUpperCase().replace('SECTION', '').trim();
      filter.section = cleanSection;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    const students = await Student.find(filter).sort({ roll: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create a new student
exports.createStudent = async (req, res) => {
  try {
    const studentInfo = req.body;

    const result = await Student.create({
      ...studentInfo,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create student',
      error: error.message
    });
  }
};

// Update student by ID
exports.updateStudent = async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message
    });
  }
};

// Delete student by ID
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    await Student.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
