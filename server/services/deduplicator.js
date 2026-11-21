/**
 * deduplicator.js - Duplicate Detection Service using SHA-256 Hashes
 *
 * Requirements addressed:
 * - Detect duplicate reviews using normalized review text
 * - Ensure duplicate reviews are analyzed only ONCE by AI
 * - Point duplicate reviews to original review ID via `duplicateOf`
 * - Check duplicates both within the current upload batch and against existing MongoDB records
 * - Separate reviews into:
 *   1. uniqueReviews (to be sent for Gemini AI analysis or Cache lookup)
 *   2. duplicateReviews (reuse original analysis without calling AI)
 *   3. emptyReviews (marked as completed with default neutral status)
 */

const Review = require('../models/Review');
const Cache = require('../models/Cache');

/**
 * Deduplicates an array of cleaned review records
 * @param {Array<Object>} cleanedRecords - Records from dataCleaner
 * @param {string} uploadBatchId - Identifier for the current upload session
 * @returns {Promise<Object>} Categorized reviews and stats
 */
const deduplicateReviews = async (cleanedRecords, uploadBatchId) => {
  const seenHashesInBatch = new Map(); // textHash -> reviewId
  const processedRecords = [];

  const uniqueReviews = [];
  const duplicateReviews = [];
  const emptyReviews = [];

  for (const record of cleanedRecords) {
    const { isEmpty, textHash, reviewId } = record;

    // 1. Handle Empty Review Text
    if (isEmpty) {
      const emptyDoc = {
        ...record,
        uploadBatchId,
        isDuplicate: false,
        duplicateOf: null,
        sentiment: 'neutral',
        topics: ['other'],
        summary: 'No review text provided by customer.',
        needsReply: false,
        analysisStatus: 'completed',
      };
      emptyReviews.push(emptyDoc);
      processedRecords.push(emptyDoc);
      continue;
    }

    // 2. Check Intra-Batch Duplicate (already seen earlier in this same CSV)
    if (seenHashesInBatch.has(textHash)) {
      const originalReviewId = seenHashesInBatch.get(textHash);
      const duplicateDoc = {
        ...record,
        uploadBatchId,
        isDuplicate: true,
        duplicateOf: originalReviewId,
        analysisStatus: 'pending', // Will inherit analysis from original in Phase 6/8
      };
      duplicateReviews.push(duplicateDoc);
      processedRecords.push(duplicateDoc);
      continue;
    }

    // 3. Check Cross-Batch Duplicate (exists in MongoDB from a previous upload)
    const existingDbReview = await Review.findOne({
      textHash,
      isDuplicate: false,
    }).select('reviewId sentiment topics summary needsReply analysisStatus');

    if (existingDbReview) {
      const duplicateDoc = {
        ...record,
        uploadBatchId,
        isDuplicate: true,
        duplicateOf: existingDbReview.reviewId,
        sentiment: existingDbReview.sentiment,
        topics: existingDbReview.topics,
        summary: existingDbReview.summary,
        needsReply: existingDbReview.needsReply,
        analysisStatus: existingDbReview.analysisStatus,
      };
      duplicateReviews.push(duplicateDoc);
      processedRecords.push(duplicateDoc);
      // Register this hash so subsequent records in the batch also point to it
      seenHashesInBatch.set(textHash, existingDbReview.reviewId);
      continue;
    }

    // 4. Truly Unique Review
    seenHashesInBatch.set(textHash, reviewId);
    const uniqueDoc = {
      ...record,
      uploadBatchId,
      isDuplicate: false,
      duplicateOf: null,
      analysisStatus: 'pending',
    };
    uniqueReviews.push(uniqueDoc);
    processedRecords.push(uniqueDoc);
  }

  return {
    processedRecords,
    uniqueReviews,
    duplicateReviews,
    emptyReviews,
    stats: {
      total: cleanedRecords.length,
      uniqueCount: uniqueReviews.length,
      duplicateCount: duplicateReviews.length,
      emptyCount: emptyReviews.length,
    },
  };
};

module.exports = {
  deduplicateReviews,
};
