/**
 * Review.js - Mongoose Model for Customer Product Reviews
 *
 * Requirements addressed:
 * - Preserves original review details (reviewId, product, rating, reviewText)
 * - Captures cleaned/normalized text and its SHA-256 hash for deduplication and caching
 * - Handles ratings as Number or "unknown" for invalid/missing values
 * - Tracks duplicate status and references the original review
 * - Stores structured AI analysis (sentiment, topics, summary, needsReply)
 * - Restricts sentiment and topics to allowed enum values
 * - Tracks analysis lifecycle: 'pending', 'completed', 'analysis_failed'
 * - Tracks suggestedReply generated strictly on-demand
 * - Flags rating-sentiment mismatches (Bonus feature)
 */

const mongoose = require('mongoose');
const { ALLOWED_SENTIMENTS, ALLOWED_TOPICS } = require('../utils/constants');

const reviewSchema = new mongoose.Schema(
  {
    // Original Review Identifiers & Input Data
    reviewId: {
      type: String,
      required: [true, 'Review ID is required'],
      trim: true,
      index: true,
    },
    product: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    rating: {
      // Can be a number (1-5) or "unknown" if missing or invalid in CSV
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: 'unknown',
    },
    reviewText: {
      // Original text preserved as received from CSV
      type: String,
      default: '',
    },

    // Normalization & Deduplication Fields
    normalizedText: {
      type: String,
      default: '',
    },
    textHash: {
      // SHA-256 hash of normalized text for fast O(1) deduplication & cache lookup
      type: String,
      required: true,
      index: true,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
      index: true,
    },
    duplicateOf: {
      // Stores reviewId of original review if this record is a duplicate
      type: String,
      default: null,
    },

    // AI Analysis Results (populated from Gemini or Cache)
    sentiment: {
      type: String,
      enum: {
        values: [...ALLOWED_SENTIMENTS, null],
        message: '{VALUE} is not a valid sentiment',
      },
      default: null,
      index: true,
    },
    topics: {
      type: [String],
      validate: {
        validator: function (topicsArray) {
          if (!topicsArray || topicsArray.length === 0) return true;
          return topicsArray.every((topic) => ALLOWED_TOPICS.includes(topic));
        },
        message: 'One or more topics are invalid. Allowed: ' + ALLOWED_TOPICS.join(', '),
      },
      default: [],
      index: true,
    },
    summary: {
      type: String,
      default: null,
      trim: true,
    },
    needsReply: {
      type: Boolean,
      default: false,
      index: true,
    },

    // On-Demand Suggested Reply
    suggestedReply: {
      type: String,
      default: null,
    },
    replyGeneratedAt: {
      type: Date,
      default: null,
    },

    // Processing & Lifecycle Management
    analysisStatus: {
      type: String,
      enum: ['pending', 'completed', 'analysis_failed'],
      default: 'pending',
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    uploadBatchId: {
      type: String,
      required: true,
      index: true,
    },

    // Bonus: Mismatch Detection
    isRatingSentimentMismatch: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Compound indexes for optimal dashboard query performance
reviewSchema.index({ uploadBatchId: 1, sentiment: 1 });
reviewSchema.index({ product: 1, sentiment: 1 });
reviewSchema.index({ textHash: 1, isDuplicate: 1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
