const Notice = require('../models/Notice');


exports.getNotices = async (req, res) => {
  try {
    const notices = await Notice.find(); 
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


exports.createNotice = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to create a notice'
      });
    }

    const { title, content, effectiveDate, expiryDate } = req.body;
    const { designation, contactNumber } = req.body.issuedBy || {};
    const notice = await Notice.create({
      title,
      content,
      issuedBy: {
        name: req.user.name,
        designation,
        email: req.user.email,
        contactNumber
      },
      effectiveDate,
      expiryDate
    });
    res.status(201).json({
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

exports.deleteNotice = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete a notice'
      });
    }

    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    const isOwner = notice.issuedBy.email === req.user.email;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notice'
      });
    }

    await notice.deleteOne();
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

