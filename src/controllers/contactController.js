const ContactMessage = require('../models/ContactMessage');

/**
 * POST /api/contact
 * Public: Submit a new contact message
 */
exports.submitContactMessage = async (req, res) => {
  try {
    const { name, email, phone, role, subject, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Your name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Your email address is required.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Message subject is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const newMessage = new ContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      role: role?.trim() || 'School Administrator',
      subject: subject.trim(),
      message: message.trim(),
      status: 'unread',
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. Our team will contact you shortly!',
      data: newMessage,
    });
  } catch (error) {
    console.error('Error in submitContactMessage:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit contact message.',
    });
  }
};

/**
 * GET /api/contact
 * Admin Only: Get all contact messages with optional filters
 */
exports.getAllContactMessages = async (req, res) => {
  try {
    const role = (req.user?.role || req.headers['x-user-role'] || req.query?.userRole || '').toLowerCase().trim();
    if (role !== 'admin' && req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only administrators can view contact messages.',
      });
    }

    const { status, role: senderRole, search, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (senderRole && senderRole !== 'all') {
      filter.role = { $regex: new RegExp(`^${senderRole.trim()}$`, 'i') };
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { subject: { $regex: term, $options: 'i' } },
        { message: { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await ContactMessage.countDocuments(filter);
    const unreadCount = await ContactMessage.countDocuments({ status: 'unread' });
    const messages = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      data: messages,
    });
  } catch (error) {
    console.error('Error in getAllContactMessages:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch contact messages.',
    });
  }
};

/**
 * PATCH /api/contact/:id
 * Admin Only: Update contact message status (read, unread, replied, archived)
 */
exports.updateMessageStatus = async (req, res) => {
  try {
    const role = (req.user?.role || req.headers['x-user-role'] || req.body?.userRole || '').toLowerCase().trim();
    if (role !== 'admin' && req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only administrators can update contact messages.',
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedAt = new Date();

    const updated = await ContactMessage.findByIdAndUpdate(id, updateData, { new: true });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact message updated.',
      data: updated,
    });
  } catch (error) {
    console.error('Error in updateMessageStatus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update contact message.',
    });
  }
};

/**
 * DELETE /api/contact/:id
 * Admin Only: Delete contact message
 */
exports.deleteContactMessage = async (req, res) => {
  try {
    const role = (req.user?.role || req.headers['x-user-role'] || req.body?.userRole || '').toLowerCase().trim();
    if (role !== 'admin' && req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only administrators can delete contact messages.',
      });
    }

    const { id } = req.params;
    const deleted = await ContactMessage.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact message deleted successfully.',
    });
  } catch (error) {
    console.error('Error in deleteContactMessage:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete contact message.',
    });
  }
};
