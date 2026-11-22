/**
 * reviews.js - Review CRUD and Multi-Parameter Filtering Routes
 *
 * Requirements addressed:
 * - Review table data: reviewId, product, rating, reviewText, sentiment, topics, summary, needsReply
 * - Filters supported:
 *   - By product
 *   - By sentiment (positive, neutral, negative)
 *   - By topic (quality, delivery, price, packaging, support, size_fit, other)
 *   - By needsReply (true/false)
 *   - By mismatch (true/false - Bonus Feature #1)
 *   - Full-text search on reviewId, product, and reviewText
 * - Bounded pagination (page, limit) to prevent memory saturation
 */

const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

/**
 * GET /api/reviews
 * Paginated and filterable review list
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      product,
      sentiment,
      topic,
      needsReply,
      mismatch,
      search,
      batchId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    // 1. Product Filter
    if (product && product !== 'all') {
      filter.product = product;
    }

    // 2. Sentiment Filter
    if (sentiment && sentiment !== 'all') {
      filter.sentiment = sentiment.toLowerCase().trim();
    }

    // 3. Topic Filter
    if (topic && topic !== 'all') {
      filter.topics = topic.toLowerCase().trim();
    }

    // 4. Needs Reply Filter
    if (needsReply !== undefined && needsReply !== '' && needsReply !== 'all') {
      filter.needsReply = needsReply === 'true';
    }

    // 5. Rating-Sentiment Mismatch Filter (Bonus Feature #1)
    if (mismatch !== undefined && mismatch !== '' && mismatch !== 'all') {
      filter.isRatingSentimentMismatch = mismatch === 'true';
    }

    // 6. Batch ID Filter
    if (batchId) {
      filter.uploadBatchId = batchId;
    }

    // 7. Search Query across reviewText, product, reviewId
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { reviewText: searchRegex },
        { product: searchRegex },
        { reviewId: searchRegex },
        { summary: searchRegex },
      ];
    }

    // Pagination calculations
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Sort order
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query & count in parallel
    const [reviews, totalCount] = await Promise.all([
      Review.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Review.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    res.status(200).json({
      success: true,
      reviews,
      pagination: {
        totalReviews: totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reviews/:id
 * Retrieve a single review by MongoDB ID or reviewId
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let review;

    // Check if valid ObjectId or custom reviewId (e.g., R001)
    if (require('mongoose').Types.ObjectId.isValid(id)) {
      review = await Review.findById(id);
    } else {
      review = await Review.findOne({ reviewId: id });
    }

    if (!review) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Review with ID "${id}" was not found.`,
      });
    }

    res.status(200).json({ success: true, review });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
