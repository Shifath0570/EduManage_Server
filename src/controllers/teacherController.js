const { GoogleGenAI, Type } = require("@google/genai");
const Teacher = require('../models/Teacher');
const ExcelJS = require('exceljs');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Get all teachers
exports.getAllTeachers = async (req, res) => {
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


// Get teacher by custom teacherId (or User ID reference)
exports.getTeacherByTeacherId = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Searches for matching string ID or populated object ID
    const teacher = await Teacher.findOne({
      $or: [
        { teacherId: teacherId },
        { 'teacherId._id': teacherId }
      ]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher record not found for the provided teacherId'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve teacher record',
      error: error.message
    });
  }
};

// Create a new teacher
exports.createTeacher = async (req, res) => {
  try {
    const teacherInfo = req.body;

    // Remove empty string fields so Mongoose default values apply
    Object.keys(teacherInfo).forEach((key) => {
      if (teacherInfo[key] === '' || teacherInfo[key] === null) {
        delete teacherInfo[key];
      }
    });

    const result = await Teacher.create(teacherInfo);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: result
    });
  } catch (error) {
    // Handle Duplicate Key Error (e.g., Duplicate Email)
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `A record with this ${duplicateField} already exists.`
      });
    }

    // Handle Mongoose Field Validation Errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

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




// AI Endpoint: Generates Mock Teacher Data using Gemini and streams down an .xlsx file
exports.generateTeacherExcel = async (req, res) => {
  try {
    const { count = 10, subject = 'General' } = req.body;

    // Strict JSON Schema mapping all non-default fields from Teacher model
    const teacherSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          teacherId: { type: Type.STRING },
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          gender: { type: Type.STRING },
          bloodGroup: { type: Type.STRING },
          qualifications: { type: Type.STRING },
          experienceYears: { type: Type.NUMBER },
          subjectSpecialization: { type: Type.STRING },
          joiningDate: { type: Type.STRING },
          employeeId: { type: Type.STRING },
          address: { type: Type.STRING },
          city: { type: Type.STRING },
          stateProvince: { type: Type.STRING },
          postCode: { type: Type.STRING },
          guardianName: { type: Type.STRING },
          guardianPhone: { type: Type.STRING },
          emergencyContact: { type: Type.STRING },
        },
        required: [
          'fullName',
          'email',
          'phone',
          'dateOfBirth',
          'gender',
          'qualifications',
          'experienceYears',
          'subjectSpecialization',
          'joiningDate',
          'address',
          'city',
          'stateProvince',
          'postCode',
          'guardianName',
          'guardianPhone',
        ],
      },
    };

    // 1. Request structured JSON records from Gemini 2.5 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate realistic mock teacher records for ${count} high school teachers specializing in ${subject}. Use realistic Bangladeshi names, unique valid emails, valid local phone numbers (+880...), real-looking addresses, YYYY-MM-DD date formats, and plausible qualifications (e.g., M.Sc in Physics, B.Ed). Ensure gender is strictly one of 'Male', 'Female', or 'Other'.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: teacherSchema,
        temperature: 0.7,
      },
    });

    const teachers = JSON.parse(response.text);

    // 2. Build the Excel Sheet via ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Generated Teachers');

    worksheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Full Name', key: 'fullName', width: 22 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Blood Group', key: 'bloodGroup', width: 12 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Joining Date', key: 'joiningDate', width: 15 },
      { header: 'Subject Specialization', key: 'subjectSpecialization', width: 22 },
      { header: 'Qualifications', key: 'qualifications', width: 20 },
      { header: 'Experience (Years)', key: 'experienceYears', width: 18 },
      { header: 'Address', key: 'address', width: 25 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State / Province', key: 'stateProvince', width: 18 },
      { header: 'Post Code', key: 'postCode', width: 12 },
      { header: 'Guardian Name', key: 'guardianName', width: 22 },
      { header: 'Guardian Phone', key: 'guardianPhone', width: 18 },
      { header: 'Emergency Contact', key: 'emergencyContact', width: 18 },
    ];

    // Header styling
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '081838' },
    };

    // Add rows
    teachers.forEach((teacher) => {
      worksheet.addRow(teacher);
    });

    // 3. Set output headers and stream the workbook to response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=teachers_${subject}_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating AI Teacher Excel data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel sheet using AI',
      error: error.message,
    });
  }
};







