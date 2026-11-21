/**
 * upload.js - Express Route for CSV File Upload, Cleaning & Deduplication
 *
 * Pipeline Flow:
 * 1. Multer upload validation (file size, MIME type)
 * 2. Streaming CSV parsing
 * 3. Data cleaning (ratings, Unicode normalization, whitespace, empty check)
 * 4. SHA-256 hashing and duplicate detection
 * 5. Batch persistence to MongoDB Review collection
 * 6. Temporary file cleanup from disk
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { handleUpload } = require('../middleware/uploadMiddleware');
const { parseCSV, cleanupFile } = require('../services/csvParser');
const { cleanReviewRecord } = require('../services/dataCleaner');
const { deduplicateReviews } = require('../services/deduplicator');
const Review = require('../models/Review');

router.post('/', handleUpload, async (req, res, next) => {
  const filePath = req.file.path;

  try {
    // Generate unique batch ID
    const uploadBatchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 1. Parse CSV
    const rawRecords = await parseCSV(filePath);

    if (rawRecords.length === 0) {
      return res.status(400).json({
        error: 'Empty File',
        message: 'The uploaded CSV file contains no review rows.',
      });
    }

    // 2. Clean each record (ratings, emojis, Hindi/Hinglish normalization)
    const cleanedRecords = rawRecords.map(cleanReviewRecord);

    // 3. Detect duplicates using SHA-256 normalized text hash
    const { processedRecords, uniqueReviews, duplicateReviews, emptyReviews, stats } =
      await deduplicateReviews(cleanedRecords, uploadBatchId);

    // 4. Save processed reviews to MongoDB
    await Review.insertMany(processedRecords, { ordered: false });

    res.status(200).json({
      success: true,
      message: `Processed ${stats.total} reviews: ${stats.uniqueCount} unique, ${stats.duplicateCount} duplicate, ${stats.emptyCount} empty.`,
      uploadBatchId,
      fileName: req.file.originalname,
      stats,
      sampleProcessedReviews: processedRecords.slice(0, 5),
    });
  } catch (error) {
    next(error);
  } finally {
    // Always cleanup temporary upload file
    cleanupFile(filePath);
  }
});

module.exports = router;
