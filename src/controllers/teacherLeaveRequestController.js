const TeacherLeaveRequest = require('../models/TeacherLeaveRequest');

// Get all leave requests
exports.getLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const leaveRequests = await TeacherLeaveRequest.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: leaveRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};




// Get leave request by ID
exports.getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await TeacherLeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    res.status(200).json({
      success: true,
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create a new leave request
exports.createLeaveRequest = async (req, res) => {
  try {
    const leaveData = req.body;

    const result = await TeacherLeaveRequest.create({
      ...leaveData,
      status: 'pending', // Default status on submit
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Leave request submitted successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit leave request",
      error: error.message
    });
  }
};




// Delete leave request by ID
exports.deleteLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await TeacherLeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    await TeacherLeaveRequest.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update leave request by ID (e.g., status changes or updating details)
exports.updateLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if leave request exists
    const existingRequest = await TeacherLeaveRequest.findById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Update the record
    const updatedRequest = await TeacherLeaveRequest.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedAt: new Date()
      },
      {
        new: true, // Return the updated document
        runValidators: true // Run model validations
      }
    );

    res.status(200).json({
      success: true,
      message: "Leave request updated successfully",
      data: updatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update leave request",
      error: error.message
    });
  }
};