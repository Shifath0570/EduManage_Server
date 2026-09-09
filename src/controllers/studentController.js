const Student = require('../models/Student');
const { GoogleGenAI, Type } = require('@google/genai');
const ExcelJS = require('exceljs');
const {
  normalizeClassNumber,
  normalizeGroup,
  getClassSubjectMapKey
} = require('../config/classSubjects');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Get all students (with optional filtering by className, section, status, stream/group)
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



// Get student by User ID, Mongo _id, or Student Roll/ID
exports.getStudentByStudentId = async (req, res) => {
  try {
    const { stuId } = req.params;

    // Searches for matching string ID or populated object ID
    const student = await Student.findOne({
      $or: [
        { stuId: stuId },
        { 'stuId._id': stuId }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found for the provided stuId'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student record',
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



// AI Endpoint: Generates Mock Data using Gemini and streams down an .xlsx file
exports.generateStudentExcel = async (req, res) => {
  try {
    const { count = 10, className = 'class_9_science' } = req.body;

    // Strict JSON Schema for Structured Gemini Output
    const studentSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          studentId: { type: Type.STRING },
          name: { type: Type.STRING },
          roll: { type: Type.STRING },
          email: { type: Type.STRING },
          gender: { type: Type.STRING },
          phone: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          admissionDate: { type: Type.STRING },
          className: { type: Type.STRING },
          section: { type: Type.STRING },
          guardianName: { type: Type.STRING },
          guardianPhone: { type: Type.STRING },
          address: { type: Type.STRING },
        },
        required: [
          'studentId', 'name', 'roll', 'email', 'gender',
          'phone', 'dateOfBirth', 'admissionDate', 'className',
          'section', 'guardianName', 'guardianPhone', 'address'
        ],
      },
    };

    // 1. Request dynamic structured JSON records from Gemini 2.5 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate realistic mock student records for ${count} students in ${className}. Use realistic Bangladeshi names, valid local phone numbers (+880...), real-looking addresses, valid dates, and sequential roll numbers starting from 1.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: studentSchema,
        temperature: 0.7,
      },
    });

    const students = JSON.parse(response.text);

    // 2. Build the Excel Sheet via ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Generated Students');

    worksheet.columns = [
      { header: 'Student ID', key: 'studentId', width: 15 },
      { header: 'Full Name', key: 'name', width: 22 },
      { header: 'Roll', key: 'roll', width: 10 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Admission Date', key: 'admissionDate', width: 15 },
      { header: 'Class Name', key: 'className', width: 20 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Guardian Name', key: 'guardianName', width: 22 },
      { header: 'Guardian Phone', key: 'guardianPhone', width: 18 },
      { header: 'Address', key: 'address', width: 30 },
    ];

    // Header styling
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '081838' },
    };

    // Add rows
    students.forEach((student) => {
      worksheet.addRow(student);
    });

    // 3. Output file response headers and stream stream workbook
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students_${className}_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating AI Excel data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel sheet using AI',
      error: error.message
    });
  }
};