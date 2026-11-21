/**
 * db.js - MongoDB connection configuration
 *
 * This file exports a function that connects to MongoDB using Mongoose.
 * The connection string comes from the MONGODB_URI environment variable.
 * We'll call this function from server.js in Phase 3.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit with failure code - can't run without DB
  }
};

module.exports = connectDB;
