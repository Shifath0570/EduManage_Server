const Assignment = require('../models/Assignment');

// Get all assignments
exports.getAssignments = async (req, res) => {
  try {
    // Sort by createdAt in descending order (newest first) and populate teacher details
    const assignments = await Assignment.find()
      .populate('teacherId', 'fullName email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get assignment by ID
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('teacherId', 'fullName email phone');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};




// Create a new assignment
exports.createAssignment = async (req, res) => {
  try {
    const assignmentInfo = req.body;

    const result = await Assignment.create(assignmentInfo);

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: result
    });
  } catch (error) {
    // Catch Mongoose Schema Validation Errors (HTTP 400 Bad Request)
    if (error.name === 'ValidationError') {
      const validationMessages = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: validationMessages
      });
    }

    // Catch Duplicate Key Errors (HTTP 409 Conflict)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate assignment entry found',
        error: error.keyValue
      });
    }

    // Unhandled application errors (HTTP 500 Internal Server Error)
    console.error('Create Assignment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while creating assignment',
      error: error.message
    });
  }
};







// Update assignment by ID
exports.updateAssignment = async (req, res) => {
  try {
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedAssignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: updatedAssignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment',
      error: error.message
    });
  }
};

// Delete assignment by ID
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    await Assignment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};