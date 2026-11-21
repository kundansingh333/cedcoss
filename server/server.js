/**
 * server.js - Entry point for the ReviewLens Express API server
 *
 * This file:
 * 1. Loads environment variables from .env
 * 2. Connects to MongoDB
 * 3. Configures middleware (CORS, JSON parsing)
 * 4. Mounts API routes
 * 5. Handles 404 and global errors
 * 6. Starts listening on the configured port
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

// Load environment variables from .env in project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────────────
// MIDDLEWARE
// ──────────────────────────────────────────────

// CORS configuration: Allow client origin
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ReviewLens API is running',
    database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes (Placeholder routes created in Phase 2)
app.use('/api/upload', require('./routes/upload'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reply', require('./routes/reply'));

// ──────────────────────────────────────────────
// ERROR HANDLING
// ──────────────────────────────────────────────

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred on the server',
  });
});

// ──────────────────────────────────────────────
// SERVER STARTUP WITH DB CONNECTION
// ──────────────────────────────────────────────

const startServer = async () => {
  try {
    // Attempt database connection
    await connectDB();
  } catch (err) {
    console.warn('⚠️ Starting server with disconnected database. Check your MongoDB service.');
  }

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 ReviewLens API server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });

  return server;
};

// Start when executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
