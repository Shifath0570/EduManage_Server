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

// Pre-save middleware to auto-update status based on dates
noticeSchema.pre('save', function(next) {
  const now = new Date();
  
  // Auto-update status based on dates
  if (this.expiryDate && this.expiryDate < now) {
    this.status = 'expired';
    this.isActive = false;
  } else if (this.effectiveDate && this.effectiveDate <= now && this.expiryDate && this.expiryDate >= now) {
    this.status = 'published';
    this.isActive = true;
  }
  
  // Auto-update updatedAt
  this.updatedAt = now;
  next();
});

// Instance method to check if notice is currently active
noticeSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.isActive && 
         this.effectiveDate <= now && 
         this.expiryDate >= now &&
         this.status !== 'expired' &&
         this.status !== 'archived';
};

// Static method to get all active notices
noticeSchema.statics.getActiveNotices = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    effectiveDate: { $lte: now },
    expiryDate: { $gte: now },
    status: { $in: ['published', 'draft'] }
  }).sort({ effectiveDate: -1 });
};

// Static method to get expired notices
noticeSchema.statics.getExpiredNotices = function() {
  const now = new Date();
  return this.find({
    $or: [
      { expiryDate: { $lt: now } },
      { status: 'expired' }
    ]
  }).sort({ expiryDate: -1 });
};

// Index for better query performance
noticeSchema.index({ title: 1 });
noticeSchema.index({ effectiveDate: -1 });
noticeSchema.index({ expiryDate: 1 });
noticeSchema.index({ status: 1 });
noticeSchema.index({ isActive: 1 });

module.exports = mongoose.model('Notice', noticeSchema);