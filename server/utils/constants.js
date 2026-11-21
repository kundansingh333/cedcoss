/**
 * constants.js - Centralized constants for the ReviewLens application
 *
 * Why centralize constants?
 * - Single source of truth for allowed values
 * - Easy to update if requirements change
 * - Used for validation of AI responses
 * - Prevents typos (import instead of re-typing strings)
 */

// The assessment specifies exactly these sentiment values
const ALLOWED_SENTIMENTS = ['positive', 'neutral', 'negative'];

// The assessment specifies exactly these topic values
const ALLOWED_TOPICS = [
  'quality',
  'delivery',
  'price',
  'packaging',
  'support',
  'size_fit',
  'other',
];

// Batch processing configuration
const BATCH_SIZE = 5; // Process 5 reviews at a time (assessment requirement)

// Retry configuration for API calls
const MAX_RETRIES = 3;              // Max retry attempts for rate limits
const INITIAL_BACKOFF_MS = 1000;    // Start with 1 second wait
const MAX_BACKOFF_MS = 32000;       // Cap at 32 seconds

// AI response validation retry
const AI_VALIDATION_RETRIES = 1;    // Retry invalid responses once (assessment requirement)

// File upload limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max file size
const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel'];

module.exports = {
  ALLOWED_SENTIMENTS,
  ALLOWED_TOPICS,
  BATCH_SIZE,
  MAX_RETRIES,
  INITIAL_BACKOFF_MS,
  MAX_BACKOFF_MS,
  AI_VALIDATION_RETRIES,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
};
