/**
 * server.js - Entry point for the ReviewLens Express API server
 *
 * This file:
 * 1. Loads environment variables from .env
 * 2. Creates the Express app
 * 3. Configures middleware (CORS, JSON parsing)
 * 4. Mounts route handlers
 * 5. Starts listening on the configured port
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables from .env file into process.env
// This MUST be called before accessing any env variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────────────
// MIDDLEWARE
// ──────────────────────────────────────────────

// CORS: Allow the React frontend (port 5173) to call our API
// Without this, the browser blocks cross-origin requests
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parse incoming JSON request bodies (e.g., POST data)
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────

// Health check endpoint - useful for testing if the server is running
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ReviewLens API is running',
    timestamp: new Date().toISOString(),
  });
});

// Route handlers will be added in later phases:
// app.use('/api/upload', require('./routes/upload'));
// app.use('/api/reviews', require('./routes/reviews'));
// app.use('/api/analytics', require('./routes/analytics'));

// ──────────────────────────────────────────────
// ERROR HANDLING
// ──────────────────────────────────────────────

// 404 handler - catches requests to undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
});

// Global error handler - catches errors thrown in route handlers
// Express recognizes this as an error handler because it has 4 parameters
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong',
  });
});

// ──────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 ReviewLens API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app; // Export for testing with Supertest
