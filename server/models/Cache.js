/**
 * Cache.js - Mongoose Model for AI Review Analysis Cache
 *
 * Requirements addressed:
 * - Stores SHA-256 hash of normalized review text
 * - Enables O(1) lookup before dispatching Gemini API calls
 * - Avoids re-analyzing identical reviews across or within uploads
 * - Tracks hit count and timestamps for bonus cache analytics
 */

const mongoose = require('mongoose');
const { ALLOWED_SENTIMENTS, ALLOWED_TOPICS } = require('../utils/constants');

const cacheSchema = new mongoose.Schema(
  {
    textHash: {
      type: String,
      required: [true, 'Text hash is required for cache key'],
      unique: true,
      index: true,
    },
    normalizedText: {
      type: String,
      required: true,
    },
    analysis: {
      sentiment: {
        type: String,
        enum: ALLOWED_SENTIMENTS,
        required: true,
      },
      topics: {
        type: [String],
        validate: {
          validator: (arr) => arr.every((t) => ALLOWED_TOPICS.includes(t)),
          message: 'Cache analysis contains invalid topic',
        },
        default: [],
      },
      summary: {
        type: String,
        required: true,
      },
      needsReply: {
        type: Boolean,
        required: true,
      },
    },
    hitCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Cache = mongoose.model('Cache', cacheSchema);

module.exports = Cache;
