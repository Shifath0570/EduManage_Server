const StudentLeaveRequest = require('../models/StudentLeaveRequest');

// Get all student leave requests (supports status filtering via ?status=pending)
exports.getLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const leaveRequests = await StudentLeaveRequest.find(filter).sort({ createdAt: -1 });

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
    const leaveRequest = await StudentLeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Student leave request not found'
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

// Create a new student leave request
exports.createLeaveRequest = async (req, res) => {
  try {
    const leaveData = req.body;

    const result = await StudentLeaveRequest.create({
      ...leaveData,
      status: 'pending', // Default status on submit
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Student leave request submitted successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit student leave request",
      error: error.message
    });
  }
};

// Delete leave request by ID
exports.deleteLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await StudentLeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Student leave request not found'
      });
    }
    await StudentLeaveRequest.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Student leave request deleted successfully'
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
    const existingRequest = await StudentLeaveRequest.findById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Student leave request not found'
      });
    }

    // Update the record
    const updatedRequest = await StudentLeaveRequest.findByIdAndUpdate(
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
      message: "Student leave request updated successfully",
      data: updatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update student leave request",
      error: error.message
    });
  }
};