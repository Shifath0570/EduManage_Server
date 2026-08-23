const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  issuedBy: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    designation: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true
    }
  },
  issuedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  content: {
    subject: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    fullText: {
      type: String,
      required: true,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'expired'],
    default: 'published'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'Notices',
  timestamps: true // This automatically manages createdAt and updatedAt
});


module.exports = mongoose.model('Notice', noticeSchema);