const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: 300
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Blog short description/summary is required'],
    trim: true,
    maxlength: 1000
  },
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    default: 'Education',
    trim: true
  },
  author: {
    type: String,
    default: 'School Administration',
    trim: true
  },
  authorEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  image: {
    type: String,
    required: [true, 'Cover image URL is required'],
    default: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop'
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['published', 'draft', 'archived'],
    default: 'published'
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
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
  collection: 'Blogs',
  timestamps: true
});

// Create index for search and slug
blogSchema.index({ title: 'text', description: 'text', content: 'text', category: 1 });

module.exports = mongoose.model('Blog', blogSchema);
