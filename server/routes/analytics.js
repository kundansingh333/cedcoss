/**
 * analytics.js - Dashboard Aggregation Analytics Routes
 *
 * Requirements addressed:
 * - Summary cards: Total reviews, Positive %, Neutral %, Negative %, Needs reply count
 * - Visualizations: Sentiment distribution, Top 3 customer complaints, Top 3 customer praises
 * - Bonus 2: Rating-sentiment agreement percentage
 * - Bonus 3: Individual product analytics endpoint
 * - Bonus 4: AI call and cache usage statistics
 * - High-speed MongoDB aggregation pipelines utilizing compound indexes
 */

const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { getCacheStats } = require('../services/cacheManager');
const { ALLOWED_TOPICS, ALLOWED_SENTIMENTS } = require('../utils/constants');

/**
 * GET /api/analytics
 * Computes live dashboard metrics using MongoDB aggregation
 */
router.get('/', async (req, res, next) => {
  try {
    const { product, batchId } = req.query;

    // Base match filter
    const matchFilter = {};
    if (product && product !== 'all') {
      matchFilter.product = product;
    }
    if (batchId) {
      matchFilter.uploadBatchId = batchId;
    }

    // 1. Overall & Sentiment Counts
    const sentimentAggregation = await Review.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
        },
      },
    ]);

    let totalReviews = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let unclassifiedCount = 0;

    for (const item of sentimentAggregation) {
      totalReviews += item.count;
      if (item._id === 'positive') positiveCount = item.count;
      else if (item._id === 'neutral') neutralCount = item.count;
      else if (item._id === 'negative') negativeCount = item.count;
      else unclassifiedCount += item.count;
    }

    const calcPercent = (count) =>
      totalReviews > 0 ? Number(((count / totalReviews) * 100).toFixed(1)) : 0;

    const sentimentStats = {
      positive: { count: positiveCount, percentage: calcPercent(positiveCount) },
      neutral: { count: neutralCount, percentage: calcPercent(neutralCount) },
      negative: { count: negativeCount, percentage: calcPercent(negativeCount) },
      unclassified: { count: unclassifiedCount, percentage: calcPercent(unclassifiedCount) },
    };

    // 2. Reviews Requiring Support Reply
    const needsReplyCount = await Review.countDocuments({
      ...matchFilter,
      needsReply: true,
    });

    // 3. Top 3 Customer Complaints (Frequent topics in negative reviews)
    const complaintsAggregation = await Review.aggregate([
      { $match: { ...matchFilter, sentiment: 'negative' } },
      { $unwind: '$topics' },
      { $match: { topics: { $in: ALLOWED_TOPICS, $ne: 'other' } } },
      {
        $group: {
          _id: '$topics',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    const topComplaints = complaintsAggregation.map((c) => ({
      topic: c._id,
      count: c.count,
    }));

    // 4. Top 3 Customer Praises (Frequent topics in positive reviews)
    const praisesAggregation = await Review.aggregate([
      { $match: { ...matchFilter, sentiment: 'positive' } },
      { $unwind: '$topics' },
      { $match: { topics: { $in: ALLOWED_TOPICS, $ne: 'other' } } },
      {
        $group: {
          _id: '$topics',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    const topPraises = praisesAggregation.map((p) => ({
      topic: p._id,
      count: p.count,
    }));

    // 5. Rating-Sentiment Agreement Percentage (Bonus Feature #2)
    const mismatchCount = await Review.countDocuments({
      ...matchFilter,
      isRatingSentimentMismatch: true,
    });

    const ratedReviewsCount = await Review.countDocuments({
      ...matchFilter,
      rating: { $ne: 'unknown' },
    });

    const agreementPercentage =
      ratedReviewsCount > 0
        ? Number((((ratedReviewsCount - mismatchCount) / ratedReviewsCount) * 100).toFixed(1))
        : 100;

    // 6. Distinct Products for Filter Dropdowns
    const distinctProducts = await Review.distinct('product');

    // 7. Cache & AI Telemetry Stats (Bonus Feature #4)
    const cacheStats = await getCacheStats();

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalReviews,
          positivePercentage: sentimentStats.positive.percentage,
          neutralPercentage: sentimentStats.neutral.percentage,
          negativePercentage: sentimentStats.negative.percentage,
          needsReplyCount,
          needsReplyPercentage: calcPercent(needsReplyCount),
          ratingAgreementPercentage: agreementPercentage,
          mismatchCount,
        },
        sentimentDistribution: [
          { name: 'Positive', count: positiveCount, percentage: sentimentStats.positive.percentage, color: '#10B981' },
          { name: 'Neutral', count: neutralCount, percentage: sentimentStats.neutral.percentage, color: '#6B7280' },
          { name: 'Negative', count: negativeCount, percentage: sentimentStats.negative.percentage, color: '#EF4444' },
        ],
        topComplaints,
        topPraises,
        filterOptions: {
          products: distinctProducts.sort(),
          sentiments: ALLOWED_SENTIMENTS,
          topics: ALLOWED_TOPICS,
        },
        cacheTelemetry: cacheStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/products/:productName
 * Bonus Feature #3: Deep-dive analytics for an individual product
 */
router.get('/products/:productName', async (req, res, next) => {
  try {
    const { productName } = req.params;
    const decodedName = decodeURIComponent(productName);

    const reviews = await Review.find({ product: decodedName });
    if (reviews.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No reviews found for product "${decodedName}"`,
      });
    }

    const total = reviews.length;
    const positive = reviews.filter((r) => r.sentiment === 'positive').length;
    const negative = reviews.filter((r) => r.sentiment === 'negative').length;
    const neutral = reviews.filter((r) => r.sentiment === 'neutral').length;
    const needsReply = reviews.filter((r) => r.needsReply).length;

    // Calculate average rating for valid numeric ratings
    const numericRatings = reviews
      .map((r) => Number(r.rating))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 5);
    const avgRating =
      numericRatings.length > 0
        ? Number((numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length).toFixed(1))
        : 'unknown';

    res.status(200).json({
      success: true,
      product: decodedName,
      metrics: {
        totalReviews: total,
        averageRating: avgRating,
        positiveCount: positive,
        negativeCount: negative,
        neutralCount: neutral,
        positivePercentage: Number(((positive / total) * 100).toFixed(1)),
        needsReplyCount: needsReply,
      },
      recentReviews: reviews.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
