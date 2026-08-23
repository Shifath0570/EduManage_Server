const Notice = require('../models/Notice');


// get all notices
exports.getNotices = async (req, res) => {
  try {
    // Sort by createdAt in descending order (newest first)
    const notices = await Notice.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: notices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
//get notice by id
exports.getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    res.status(200).json({
      success: true,
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// create a new notice
exports.createNotice = async (req, res) => {
  try {
    const noticeInfo = req.body;

    const result = await Notice.create({
      ...noticeInfo,
      createdAt: new Date()
    });

        res.status(201).json({
            success: true,
            message: "Notice created successfully",
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create notice",
            error: error.message,
        });
    }
};

exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    await Notice.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

