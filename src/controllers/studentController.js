// const Student = require('../models/Student');

// // Initial seed data for common classes so rosters are never empty
// // const defaultSeedStudents = [
// //     // Class 10 - Section A
// //     { studentId: "STU-1001", name: "Rahim Ahmed", roll: "01", email: "rahim@example.com", phone: "01710000001", className: "10", section: "A", status: "Active", gender: "male" },
// //     { studentId: "STU-1002", name: "Karim Chowdhury", roll: "02", email: "karim@example.com", phone: "01710000002", className: "10", section: "A", status: "Active", gender: "male" },
// //     { studentId: "STU-1003", name: "Hasan Mahmud", roll: "03", email: "hasan@example.com", phone: "01710000003", className: "10", section: "A", status: "Active", gender: "male" },
// //     { studentId: "STU-1004", name: "Ahmed Faruk", roll: "04", email: "ahmed@example.com", phone: "01710000004", className: "10", section: "A", status: "Active", gender: "male" },
// //     { studentId: "STU-1005", name: "Sakib Al Hasan", roll: "05", email: "sakib@example.com", phone: "01710000005", className: "10", section: "A", status: "Active", gender: "male" },
// //     { studentId: "STU-1006", name: "Nusrat Jahan", roll: "06", email: "nusrat@example.com", phone: "01710000006", className: "10", section: "A", status: "Active", gender: "female" },
// //     { studentId: "STU-1007", name: "Sadia Islam", roll: "07", email: "sadia@example.com", phone: "01710000007", className: "10", section: "A", status: "Active", gender: "female" },

// //     // Class 10 - Section B
// //     { studentId: "STU-1008", name: "Tanvir Hossain", roll: "01", email: "tanvir@example.com", phone: "01710000008", className: "10", section: "B", status: "Active", gender: "male" },
// //     { studentId: "STU-1009", name: "Farhana Akter", roll: "02", email: "farhana@example.com", phone: "01710000009", className: "10", section: "B", status: "Active", gender: "female" },
// //     { studentId: "STU-1010", name: "Mehedi Hasan", roll: "03", email: "mehedi@example.com", phone: "01710000010", className: "10", section: "B", status: "Active", gender: "male" },

// //     // Class 9 - Section A
// //     { studentId: "STU-0901", name: "Riadul Islam", roll: "01", email: "riad@example.com", phone: "01710000011", className: "9", section: "A", status: "Active", gender: "male" },
// //     { studentId: "STU-0902", name: "Anika Tabassum", roll: "02", email: "anika@example.com", phone: "01710000012", className: "9", section: "A", status: "Active", gender: "female" },
// //     { studentId: "STU-0903", name: "Shahriar Kabir", roll: "03", email: "shahriar@example.com", phone: "01710000013", className: "9", section: "A", status: "Active", gender: "male" },

// //     // Class 8 - Section A
// //     { studentId: "STU-0801", name: "Arafat Hossain", roll: "01", email: "arafat@example.com", phone: "01710000014", className: "8", section: "A", status: "Active", gender: "male" },
// //     { studentId: "STU-0802", name: "Meherun Tisha", roll: "02", email: "tisha@example.com", phone: "01710000015", className: "8", section: "A", status: "Active", gender: "female" },
// //     { studentId: "STU-0803", name: "Mohammad Sami", roll: "03", email: "sami@example.com", phone: "01710000016", className: "8", section: "A", status: "Active", gender: "male" },

// //     // Class 7 - Section A
// //     { studentId: "STU-0701", name: "Jannat Ara", roll: "01", email: "jannat@example.com", phone: "01710000017", className: "7", section: "A", status: "Active", gender: "female" },
// //     { studentId: "STU-0702", name: "Tahmid Rahman", roll: "02", email: "tahmid@example.com", phone: "01710000018", className: "7", section: "A", status: "Active", gender: "male" }
// // ];

// /**
//  * Get students filtered by className and section
//  * GET /api/students
//  */
// exports.getStudents = async (req, res) => {
//     try {
//         const { className, class: classParam, section, status } = req.query;

//         // Auto-seed if students collection is empty
//         const count = await Student.countDocuments();
//         if (count === 0) {
//             await Student.insertMany(defaultSeedStudents);
//         }

//         const filter = {};
//         const targetClass = className || classParam;
//         if (targetClass && targetClass !== 'All') {
//             const cleanClass = targetClass.replace('class_', '').replace('Class', '').replace('class-', '').trim();
//             filter.className = { $regex: new RegExp(`^${cleanClass}$|^Class ${cleanClass}$`, 'i') };
//         }

//         if (section && section !== 'All') {
//             const cleanSection = section.toUpperCase().replace('SECTION', '').trim();
//             filter.section = cleanSection;
//         }

//         if (status && status !== 'All') {
//             filter.status = status;
//         }

//         const students = await Student.find(filter).sort({ roll: 1, name: 1 });

//         res.status(200).json({
//             success: true,
//             count: students.length,
//             data: students
//         });
//     } catch (error) {
//         console.error('Get students error:', error);
//         res.status(500).json({
//             success: false,
//             message: error.message || 'Failed to fetch students'
//         });
//     }
// };

// /**
//  * Create a new student
//  * POST /api/students
//  */
// exports.createStudent = async (req, res) => {
//     try {
//         const { studentId, name, email, roll, className, class: classParam, section } = req.body;
//         const normalizedClass = (className || classParam || '10').replace('class_', '').replace('Class', '').replace('class-', '').trim();
//         const normalizedSection = (section || 'A').toUpperCase().replace('SECTION', '').trim();

//         const student = new Student({
//             ...req.body,
//             studentId: studentId || `STU-${Date.now().toString().slice(-4)}`,
//             className: normalizedClass,
//             section: normalizedSection
//         });

//         await student.save();

//         res.status(201).json({
//             success: true,
//             message: 'Student created successfully',
//             data: student
//         });
//     } catch (error) {
//         console.error('Create student error:', error);
//         res.status(400).json({
//             success: false,
//             message: error.message || 'Failed to create student'
//         });
//     }
// };

const Student = require('../models/Student');

// Get all students (with optional filtering by className, section, status)
exports.getStudents = async (req, res) => {
  try {
    const { className, class: classParam, section, status } = req.query;

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











