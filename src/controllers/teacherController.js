// const Teacher = require('../models/Teacher');

// // ==================== CREATE ====================

// /**
//  * Create a new teacher
//  * POST /api/teachers
//  */
// exports.createTeacher = async (req, res) => {
//   try {
//     const { teacherId, email } = req.body;

//     // Check if teacherId already exists
//     const existingTeacherId = await Teacher.findOne({ teacherId });
//     if (existingTeacherId) {
//       return res.status(400).json({
//         success: false,
//         message: `Teacher with ID ${teacherId} already exists`
//       });
//     }

//     // Check if email already exists
//     const existingEmail = await Teacher.findOne({ email });
//     if (existingEmail) {
//       return res.status(400).json({
//         success: false,
//         message: `Teacher with email ${email} already exists`
//       });
//     }

//     const teacher = new Teacher(req.body);
//     await teacher.save();

//     res.status(201).json({
//       success: true,
//       message: 'Teacher created successfully',
//       data: teacher
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//       error: error.errors
//     });
//   }
// };

// /**
//  * Create multiple teachers at once
//  * POST /api/teachers/bulk
//  */
// exports.createBulkTeachers = async (req, res) => {
//   try {
//     const teachers = req.body;
    
//     if (!Array.isArray(teachers)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Request body must be an array of teachers'
//       });
//     }

//     const createdTeachers = await Teacher.insertMany(teachers, { 
//       ordered: false // Continue even if some fail
//     });

//     res.status(201).json({
//       success: true,
//       message: `${createdTeachers.length} teachers created successfully`,
//       data: createdTeachers
//     });
//   } catch (error) {
//     // Handle duplicate key errors
//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Duplicate teacherId or email found',
//         details: error.keyValue
//       });
//     }
//     res.status(400).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ==================== READ ====================

// /**
//  * Get all teachers with pagination, filtering, sorting
//  * GET /api/teachers
//  */
// exports.getAllTeachers = async (req, res) => {
//   try {
//     // Pagination
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     // Filtering
//     const filter = {};
//     if (req.query.className) filter.className = req.query.className;
//     if (req.query.section) filter.section = req.query.section.toUpperCase();
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.subject) filter.subjects = req.query.subject;
//     if (req.query.minStudentCount) {
//       filter.studentCount = { $gte: parseInt(req.query.minStudentCount) };
//     }
//     if (req.query.maxStudentCount) {
//       filter.studentCount = { 
//         ...filter.studentCount, 
//         $lte: parseInt(req.query.maxStudentCount) 
//       };
//     }
//     if (req.query.search) {
//       filter.$or = [
//         { name: { $regex: req.query.search, $options: 'i' } },
//         { email: { $regex: req.query.search, $options: 'i' } },
//         { phone: { $regex: req.query.search, $options: 'i' } }
//       ];
//     }

//     // Sorting
//     const sort = {};
//     if (req.query.sortBy) {
//       const fields = req.query.sortBy.split(',');
//       const order = req.query.order === 'desc' ? -1 : 1;
//       fields.forEach(field => {
//         sort[field] = order;
//       });
//     } else {
//       sort.createdAt = -1; // Default sort by newest
//     }

//     // Field selection
//     let select = req.query.fields;
//     if (select) {
//       select = select.split(',').join(' ');
//     }

//     // Execute query
//     const teachers = await Teacher.find(filter)
//       .select(select)
//       .sort(sort)
//       .skip(skip)
//       .limit(limit);

//     const total = await Teacher.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       data: teachers,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get single teacher by ID
//  * GET /api/teachers/:id
//  */
// exports.getTeacherById = async (req, res) => {
//   try {
//     const teacher = await Teacher.findById(req.params.id);
    
//     if (!teacher) {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: teacher
//     });
//   } catch (error) {
//     if (error.kind === 'ObjectId') {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get teacher by teacherId
//  * GET /api/teachers/id/:teacherId
//  */
// exports.getTeacherByTeacherId = async (req, res) => {
//   try {
//     const teacher = await Teacher.findOne({ 
//       teacherId: parseInt(req.params.teacherId) 
//     });
    
//     if (!teacher) {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: teacher
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get teachers by class and section
//  * GET /api/teachers/class/:className/section/:section
//  */
// exports.getTeachersByClassAndSection = async (req, res) => {
//   try {
//     const { className, section } = req.params;
    
//     const teachers = await Teacher.find({
//       className,
//       section: section.toUpperCase()
//     }).sort({ name: 1 });

//     res.status(200).json({
//       success: true,
//       count: teachers.length,
//       data: teachers
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get teachers by subject
//  * GET /api/teachers/subject/:subject
//  */
// exports.getTeachersBySubject = async (req, res) => {
//   try {
//     const subject = req.params.subject;
    
//     const teachers = await Teacher.find({
//       subjects: subject,
//       status: 'Active'
//     }).select('name email phone className section');

//     res.status(200).json({
//       success: true,
//       count: teachers.length,
//       data: teachers
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get teacher statistics
//  * GET /api/teachers/stats
//  */
// exports.getTeacherStats = async (req, res) => {
//   try {
//     const stats = await Teacher.aggregate([
//       {
//         $facet: {
//           totalTeachers: [{ $count: 'count' }],
//           byStatus: [
//             { $group: { _id: '$status', count: { $sum: 1 } } }
//           ],
//           byClass: [
//             { $group: { _id: '$className', count: { $sum: 1 } } }
//           ],
//           bySubject: [
//             { $unwind: '$subjects' },
//             { $group: { _id: '$subjects', count: { $sum: 1 } } },
//             { $sort: { count: -1 } }
//           ],
//           averageStudentCount: [
//             { $group: { 
//               _id: null, 
//               average: { $avg: '$studentCount' },
//               max: { $max: '$studentCount' },
//               min: { $min: '$studentCount' }
//             } }
//           ]
//         }
//       }
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         total: stats[0].totalTeachers[0]?.count || 0,
//         byStatus: stats[0].byStatus,
//         byClass: stats[0].byClass,
//         bySubject: stats[0].bySubject,
//         studentStats: stats[0].averageStudentCount[0] || { average: 0, max: 0, min: 0 }
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ==================== UPDATE ====================

// /**
//  * Update teacher by ID
//  * PUT /api/teachers/:id
//  */
// exports.updateTeacher = async (req, res) => {
//   try {
//     // Prevent updating teacherId if it conflicts
//     if (req.body.teacherId) {
//       const existing = await Teacher.findOne({ 
//         teacherId: req.body.teacherId,
//         _id: { $ne: req.params.id }
//       });
//       if (existing) {
//         return res.status(400).json({
//           success: false,
//           message: `Teacher with ID ${req.body.teacherId} already exists`
//         });
//       }
//     }

//     // Prevent updating email if it conflicts
//     if (req.body.email) {
//       const existing = await Teacher.findOne({ 
//         email: req.body.email,
//         _id: { $ne: req.params.id }
//       });
//       if (existing) {
//         return res.status(400).json({
//           success: false,
//           message: `Teacher with email ${req.body.email} already exists`
//         });
//       }
//     }

//     const teacher = await Teacher.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       {
//         new: true, // Return updated document
//         runValidators: true // Run schema validations
//       }
//     );

//     if (!teacher) {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Teacher updated successfully',
//       data: teacher
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//       error: error.errors
//     });
//   }
// };

// /**
//  * Update teacher status (Activate/Deactivate)
//  * PATCH /api/teachers/:id/status
//  */
// exports.updateTeacherStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
    
//     if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid status. Must be Active, Inactive, or Suspended'
//       });
//     }

//     const teacher = await Teacher.findByIdAndUpdate(
//       req.params.id,
//       { status },
//       { new: true, runValidators: true }
//     );

//     if (!teacher) {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: `Teacher status updated to ${status}`,
//       data: teacher
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Add subject to teacher
//  * PATCH /api/teachers/:id/subjects
//  */
// exports.addSubjectToTeacher = async (req, res) => {
//   try {
//     const { subject } = req.body;
    
//     if (!subject) {
//       return res.status(400).json({
//         success: false,
//         message: 'Subject is required'
//       });
//     }

//     const teacher = await Teacher.findByIdAndUpdate(
//       req.params.id,
//       { $addToSet: { subjects: subject } }, // Add if not exists
//       { new: true, runValidators: true }
//     );

//     if (!teacher) {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: `Subject "${subject}" added successfully`,
//       data: teacher
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Remove subject from teacher
//  * DELETE /api/teachers/:id/subjects/:subject
//  */
// exports.removeSubjectFromTeacher = async (req, res) => {
//   try {
//     const { subject } = req.params;

//     const teacher = await Teacher.findByIdAndUpdate(
//       req.params.id,
//       { $pull: { subjects: subject } },
//       { new: true, runValidators: true }
//     );

//     if (!teacher) {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: `Subject "${subject}" removed successfully`,
//       data: teacher
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ==================== DELETE ====================

// /**
//  * Delete teacher by ID
//  * DELETE /api/teachers/:id
//  */
// exports.deleteTeacher = async (req, res) => {
//   try {
//     const teacher = await Teacher.findByIdAndDelete(req.params.id);
    
//     if (!teacher) {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Teacher deleted successfully',
//       data: {
//         deletedTeacher: {
//           id: teacher._id,
//           name: teacher.name,
//           teacherId: teacher.teacherId
//         }
//       }
//     });
//   } catch (error) {
//     if (error.kind === 'ObjectId') {
//       return res.status(404).json({
//         success: false,
//         message: 'Teacher not found'
//       });
//     }
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Delete all teachers (careful!)
//  * DELETE /api/teachers/all
//  */
// exports.deleteAllTeachers = async (req, res) => {
//   try {
//     // Optional: Add authentication check here
//     const result = await Teacher.deleteMany({});
    
//     res.status(200).json({
//       success: true,
//       message: `${result.deletedCount} teachers deleted successfully`
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ==================== COMPLEX QUERIES ====================

// /**
//  * Get teachers with overloaded classrooms (> 50 students)
//  * GET /api/teachers/overloaded
//  */
// exports.getOverloadedTeachers = async (req, res) => {
//   try {
//     const teachers = await Teacher.find({
//       studentCount: { $gt: 50 }
//     }).sort({ studentCount: -1 });

//     res.status(200).json({
//       success: true,
//       count: teachers.length,
//       data: teachers
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get teachers by multiple classes
//  * POST /api/teachers/by-classes
//  */
// exports.getTeachersByClasses = async (req, res) => {
//   try {
//     const { classes } = req.body;
    
//     if (!classes || !Array.isArray(classes)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide an array of class names'
//       });
//     }

//     const teachers = await Teacher.find({
//       className: { $in: classes },
//       status: 'Active'
//     }).sort({ className: 1, name: 1 });

//     res.status(200).json({
//       success: true,
//       count: teachers.length,
//       data: teachers
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get all unique subjects taught
//  * GET /api/teachers/subjects/all
//  */
// exports.getAllSubjects = async (req, res) => {
//   try {
//     const result = await Teacher.distinct('subjects');
    
//     res.status(200).json({
//       success: true,
//       count: result.length,
//       data: result.sort()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


const Teacher = require('../models/Teacher');

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    // Sort by createdAt in descending order (newest first)
    const teachers = await Teacher.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: teachers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create a new teacher
exports.createTeacher = async (req, res) => {
  try {
    const teacherInfo = req.body;

    const result = await Teacher.create({
      ...teacherInfo,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create teacher',
      error: error.message
    });
  }
};

// Update teacher by ID
exports.updateTeacher = async (req, res) => {
  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: updatedTeacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher',
      error: error.message
    });
  }
};

// Delete teacher by ID
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    await Teacher.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};












