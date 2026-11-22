/**
 * reply.js - Express Router for On-Demand Suggested Replies
 *
 * Requirements addressed:
 * - Generate a professional, empathetic customer support reply addressing specific complaint/praise
 * - Strictly ON-DEMAND: Only generated when triggered by user action, never upfront during CSV processing
 * - Persists suggestedReply and replyGeneratedAt on the Review document
 * - Idempotent: Returns previously generated reply unless explicitly requested to regenerate
 * - Defense in depth: Untrusted review text encapsulated in security boundaries
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const { generateSupportReply } = require('../services/geminiService');

/**
 * Helper to find review by either MongoDB _id or reviewId (e.g., 'R001')
 */
const findReviewById = async (idParam) => {
  if (mongoose.Types.ObjectId.isValid(idParam)) {
    const review = await Review.findById(idParam);
    if (review) return review;
  }
  return await Review.findOne({ reviewId: idParam });
};

/**
 * @route   POST /api/reply/:id/reply
 * @desc    Generate or retrieve an on-demand suggested customer support reply
 * @access  Public
 */
router.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    const review = await findReviewById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Review with ID "${id}" could not be found.`,
      });
    }

    // Check if reply has already been generated (avoid redundant AI calls unless forced)
    if (review.suggestedReply && force !== 'true' && force !== true) {
      return res.status(200).json({
        success: true,
        data: {
          id: review._id,
          reviewId: review.reviewId,
          product: review.product,
          rating: review.rating,
          needsReply: review.needsReply,
          suggestedReply: review.suggestedReply,
          replyGeneratedAt: review.replyGeneratedAt,
          fromCache: true,
        },
      });
    }

    // Generate reply using Gemini 3.8 Flash (with resilient HA fallback)
    const replyText = await generateSupportReply(review);

    // Persist to Review document
    review.suggestedReply = replyText;
    review.replyGeneratedAt = new Date();
    await review.save();

    return res.status(200).json({
      success: true,
      data: {
        id: review._id,
        reviewId: review.reviewId,
        product: review.product,
        rating: review.rating,
        needsReply: review.needsReply,
        suggestedReply: review.suggestedReply,
        replyGeneratedAt: review.replyGeneratedAt,
        fromCache: false,
      },
    });
  } catch (error) {
    console.error(`Error in reply route for ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to generate customer support reply.',
    });
  }
});

/**
 * @route   GET /api/reply/:id/reply
 * @desc    Fetch existing suggested reply without generating a new one
 * @access  Public
 */
router.get('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const review = await findReviewById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Review with ID "${id}" could not be found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: review._id,
        reviewId: review.reviewId,
        product: review.product,
        suggestedReply: review.suggestedReply,
        replyGeneratedAt: review.replyGeneratedAt,
        hasReply: Boolean(review.suggestedReply),
      },
    });
  } catch (error) {
    console.error(`Error fetching reply for ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

module.exports = router;
