/**
 * cacheManager.js - SHA-256 Hash-Based Caching Service
 *
 * Requirements addressed:
 * - Check the cache before making an AI request
 * - Reuse previous AI analysis for identical reviews
 * - Store cached analysis in MongoDB (Cache model)
 * - Track AI calls vs cache hits
 * - Bulk cache lookups & bulk cache insertions for high performance
 */

const Cache = require('../models/Cache');

/**
 * Checks cache for a single SHA-256 text hash
 * @param {string} textHash - 64-character SHA-256 hash
 * @returns {Promise<Object>} { isHit: boolean, analysis: Object|null }
 */
const checkCache = async (textHash) => {
  if (!textHash) return { isHit: false, analysis: null };

  try {
    const cachedEntry = await Cache.findOneAndUpdate(
      { textHash },
      {
        $inc: { hitCount: 1 },
        $set: { lastAccessedAt: new Date() },
      },
      { new: true }
    );

    if (cachedEntry) {
      return {
        isHit: true,
        analysis: cachedEntry.analysis,
      };
    }

    return { isHit: false, analysis: null };
  } catch (err) {
    console.warn(`⚠️ Cache check error for hash ${textHash}:`, err.message);
    return { isHit: false, analysis: null };
  }
};

/**
 * Performs a bulk cache lookup for an array of unique reviews in a single query
 * @param {Array<Object>} reviews - Reviews to check
 * @returns {Promise<Object>} { cacheHits, cacheMisses, stats }
 */
const checkBatchCache = async (reviews) => {
  if (!reviews || reviews.length === 0) {
    return {
      cacheHits: [],
      cacheMisses: [],
      stats: { total: 0, hitCount: 0, missCount: 0 },
    };
  }

  const hashes = reviews.map((r) => r.textHash).filter(Boolean);

  try {
    // 1. Single database query for all hashes
    const cachedDocs = await Cache.find({ textHash: { $in: hashes } });
    const cacheMap = new Map();

    for (const doc of cachedDocs) {
      cacheMap.set(doc.textHash, doc.analysis);
    }

    const cacheHits = [];
    const cacheMisses = [];
    const hitHashes = [];

    // 2. Partition reviews into hits and misses
    for (const review of reviews) {
      if (cacheMap.has(review.textHash)) {
        const cachedAnalysis = cacheMap.get(review.textHash);
        cacheHits.push({
          ...review,
          sentiment: cachedAnalysis.sentiment,
          topics: cachedAnalysis.topics,
          summary: cachedAnalysis.summary,
          needsReply: cachedAnalysis.needsReply,
          analysisStatus: 'completed',
          isFromCache: true,
        });
        hitHashes.push(review.textHash);
      } else {
        cacheMisses.push(review);
      }
    }

    // 3. Increment hit counters in the background
    if (hitHashes.length > 0) {
      await Cache.updateMany(
        { textHash: { $in: hitHashes } },
        {
          $inc: { hitCount: 1 },
          $set: { lastAccessedAt: new Date() },
        }
      );
    }

    return {
      cacheHits,
      cacheMisses,
      stats: {
        total: reviews.length,
        hitCount: cacheHits.length,
        missCount: cacheMisses.length,
      },
    };
  } catch (err) {
    console.warn('⚠️ Bulk cache check error:', err.message);
    // On cache lookup failure, gracefully treat all as cache misses
    return {
      cacheHits: [],
      cacheMisses: reviews,
      stats: { total: reviews.length, hitCount: 0, missCount: reviews.length },
    };
  }
};

/**
 * Stores a new AI analysis in the MongoDB Cache collection
 * @param {string} textHash
 * @param {string} normalizedText
 * @param {Object} analysis - { sentiment, topics, summary, needs_reply }
 */
const storeInCache = async (textHash, normalizedText, analysis) => {
  if (!textHash || !analysis) return null;

  try {
    const entry = await Cache.findOneAndUpdate(
      { textHash },
      {
        $setOnInsert: {
          textHash,
          normalizedText: normalizedText || '',
          analysis: {
            sentiment: analysis.sentiment,
            topics: analysis.topics,
            summary: analysis.summary,
            needsReply: Boolean(analysis.needs_reply || analysis.needsReply),
          },
          hitCount: 0,
        },
        $set: { lastAccessedAt: new Date() },
      },
      { upsert: true, new: true }
    );
    return entry;
  } catch (err) {
    console.warn(`⚠️ Failed to store analysis in cache for hash ${textHash}:`, err.message);
    return null;
  }
};

/**
 * Bulk stores multiple completed AI analyses into Cache
 * @param {Array<Object>} reviews
 */
const bulkStoreInCache = async (reviews) => {
  const validForCache = reviews.filter(
    (r) => r.analysisStatus === 'completed' && r.textHash && r.sentiment && !r.isFromCache
  );

  if (validForCache.length === 0) return 0;

  const ops = validForCache.map((review) => ({
    updateOne: {
      filter: { textHash: review.textHash },
      update: {
        $setOnInsert: {
          textHash: review.textHash,
          normalizedText: review.normalizedText || '',
          analysis: {
            sentiment: review.sentiment,
            topics: review.topics,
            summary: review.summary,
            needsReply: Boolean(review.needsReply !== undefined ? review.needsReply : review.needs_reply),
          },
          hitCount: 0,
        },
        $set: { lastAccessedAt: new Date() },
      },
      upsert: true,
    },
  }));

  try {
    const result = await Cache.bulkWrite(ops, { ordered: false });
    return result.upsertedCount + result.modifiedCount;
  } catch (err) {
    console.warn('⚠️ Bulk cache write error:', err.message);
    return 0;
  }
};

/**
 * Retrieves aggregate telemetry on cache and AI usage (Bonus Feature #4)
 */
const getCacheStats = async () => {
  try {
    const totalEntries = await Cache.countDocuments();
    const hitsAggregation = await Cache.aggregate([
      { $group: { _id: null, totalHits: { $sum: '$hitCount' } } },
    ]);

    const totalHits = hitsAggregation.length > 0 ? hitsAggregation[0].totalHits : 0;

    return {
      totalCachedUniqueReviews: totalEntries,
      totalCacheHits: totalHits,
    };
  } catch (err) {
    return { totalCachedUniqueReviews: 0, totalCacheHits: 0 };
  }
};

module.exports = {
  checkCache,
  checkBatchCache,
  storeInCache,
  bulkStoreInCache,
  getCacheStats,
};
