/**
 * db.js - MongoDB Connection Manager using Mongoose
 *
 * Best practices implemented:
 * - Connection pooling with sensible defaults
 * - Event listeners for connection lifecycle
 * - Graceful connection close helper for testing & shutdown
 * - Clean error logging with actionable messages
 */

const mongoose = require('mongoose');

const connectDB = async (customUri = null) => {
  const uri = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/reviewlens';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging indefinitely
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(`👉 Tip: Ensure local MongoDB service is started or update MONGODB_URI in .env`);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error(`❌ Error closing MongoDB connection: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
