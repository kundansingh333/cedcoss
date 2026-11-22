/**
 * upload.js - Complete Multi-Stage Review Processing Pipeline
 *
 * Full Pipeline Stages:
 * Stage 1: Multer Upload Validation (MIME check, 5MB limit, single file)
 * Stage 2: Streaming CSV Parsing (csv-parser, BOM removal, header normalization)
 * Stage 3: Data Cleaning (numeric ratings vs 'unknown', Unicode normalizer, Hindi/Hinglish/emojis)
 * Stage 4: Deduplication (SHA-256 hash matching, intra-batch & cross-batch detection)
 * Stage 5: Hash-Based Cache Lookup (O(1) MongoDB Cache check for unique reviews)
 * Stage 6: Batch AI Analysis (Gemini 3.8 Flash, strict schema, batches of 5, exponential backoff)
 * Stage 7: Cache Update (Bulk store newly analyzed reviews for future uploads)
 * Stage 8: Duplicate Inheritance (Duplicates inherit analysis without invoking AI)
 * Stage 9: Database Persistence (Bulk insert all processed records into Review collection)
 * Stage 10: Temporary File Cleanup (Guaranteed unlink in finally block)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { handleUpload } = require('../middleware/uploadMiddleware');
const { parseCSV, cleanupFile } = require('../services/csvParser');
const { cleanReviewRecord } = require('../services/dataCleaner');
const { deduplicateReviews } = require('../services/deduplicator');
const { checkBatchCache, bulkStoreInCache } = require('../services/cacheManager');
const { processInBatches } = require('../services/batchProcessor');
const Review = require('../models/Review');

router.post('/', handleUpload, async (req, res, next) => {
  const filePath = req.file.path;
  const pipelineStartTime = Date.now();

  try {
    const uploadBatchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // ─── STAGE 1 & 2: PARSE CSV ──────────────────────────────────────────────
    const rawRecords = await parseCSV(filePath);
    if (rawRecords.length === 0) {
      return res.status(400).json({
        error: 'Empty File',
        message: 'The uploaded CSV file contains no review rows.',
      });
    }

    // ─── STAGE 3: CLEAN DATA & COMPUTE SHA-256 HASHES ────────────────────────
    const cleanedRecords = rawRecords.map(cleanReviewRecord);

    // ─── STAGE 4: DEDUPLICATE REVIEWS ────────────────────────────────────────
    const { uniqueReviews, duplicateReviews, emptyReviews, stats: dedupStats } =
      await deduplicateReviews(cleanedRecords, uploadBatchId);

    // ─── STAGE 5: HASH-BASED CACHE CHECK ─────────────────────────────────────
    const { cacheHits, cacheMisses, stats: cacheStats } =
      await checkBatchCache(uniqueReviews);

    // ─── STAGE 6: BATCH AI ANALYSIS FOR CACHE MISSES ONLY ────────────────────
    let newlyAnalyzedReviews = [];
    let aiBatchMetrics = { totalTimeMs: 0, batchCount: 0 };

    if (cacheMisses.length > 0) {
      console.log(`🤖 Dispatching ${cacheMisses.length} cache misses to Gemini batch processor...`);
      const batchResult = await processInBatches(cacheMisses);
      newlyAnalyzedReviews = batchResult.results;
      aiBatchMetrics = batchResult.metrics;

      // ─── STAGE 7: STORE NEW AI ANALYSES INTO CACHE ─────────────────────────
      await bulkStoreInCache(newlyAnalyzedReviews);
    } else {
      console.log('⚡ All unique reviews resolved via Cache! 0 Gemini API calls needed.');
    }

    // Build lookup map of completed analyses by textHash for duplicate inheritance
    const analysisMap = new Map();
    for (const r of [...cacheHits, ...newlyAnalyzedReviews]) {
      if (r.analysisStatus === 'completed') {
        analysisMap.set(r.textHash, {
          sentiment: r.sentiment,
          topics: r.topics,
          summary: r.summary,
          needsReply: Boolean(r.needsReply !== undefined ? r.needsReply : r.needs_reply),
        });
      }
    }

    // ─── STAGE 8: DUPLICATE INHERITANCE ──────────────────────────────────────
    const resolvedDuplicates = duplicateReviews.map((dup) => {
      if (analysisMap.has(dup.textHash)) {
        const inherited = analysisMap.get(dup.textHash);
        return {
          ...dup,
          sentiment: inherited.sentiment,
          topics: inherited.topics,
          summary: inherited.summary,
          needsReply: inherited.needsReply,
          analysisStatus: 'completed',
        };
      }
      return dup;
    });

    // Merge all records for final database persistence
    const allFinalRecords = [
      ...cacheHits,
      ...newlyAnalyzedReviews,
      ...resolvedDuplicates,
      ...emptyReviews,
    ];

    // Detect Rating-Sentiment Mismatches (Bonus Feature #1)
    const recordsWithMismatchFlag = allFinalRecords.map((r) => {
      const numRating = Number(r.rating);
      let mismatch = false;
      if (!isNaN(numRating) && r.sentiment) {
        if ((numRating >= 4 && r.sentiment === 'negative') || (numRating <= 2 && r.sentiment === 'positive')) {
          mismatch = true;
        }
      }
      return {
        ...r,
        isRatingSentimentMismatch: mismatch,
      };
    });

    // ─── STAGE 9: PERSIST ALL RECORDS TO MONGODB ─────────────────────────────
    await Review.insertMany(recordsWithMismatchFlag, { ordered: false });

    const totalPipelineTimeMs = Date.now() - pipelineStartTime;

    // ─── RETURN DETAILED TELEMETRY ───────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: `Successfully processed ${cleanedRecords.length} reviews.`,
      uploadBatchId,
      fileName: req.file.originalname,
      telemetry: {
        totalReviews: cleanedRecords.length,
        uniqueReviews: dedupStats.uniqueCount,
        duplicateReviews: dedupStats.duplicateCount,
        emptyReviews: dedupStats.emptyCount,
        cacheHits: cacheStats.hitCount,
        cacheMisses: cacheStats.missCount,
        aiCallsDispatched: cacheMisses.length,
        batchesProcessed: aiBatchMetrics.batchCount,
        totalProcessingTimeMs: totalPipelineTimeMs,
      },
      sampleReviews: recordsWithMismatchFlag.slice(0, 5),
    });
  } catch (error) {
    next(error);
  } finally {
    // ─── STAGE 10: CLEANUP TEMPORARY FILE ────────────────────────────────────
    cleanupFile(filePath);
  }
});

module.exports = router;
