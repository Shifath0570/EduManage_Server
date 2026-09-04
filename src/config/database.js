const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('MONGODB_URI is not defined in environment variables.');
      return;
    }
    const db = await mongoose.connect(uri);
    isConnected = db.connections[0].readyState;
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
  }
};

module.exports = connectDB;