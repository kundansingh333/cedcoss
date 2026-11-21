/**
 * upload.js - Express Route for CSV File Upload and Initial Parsing
 *
 * Endpoint:
 * POST /api/upload
 * - Accepts multipart/form-data with a 'file' field
 * - Validates file size & type via handleUpload middleware
 * - Parses CSV using streaming csvParser service
 * - Generates an uploadBatchId to group the batch
 * - Automatically cleans up temporary upload files
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { handleUpload } = require('../middleware/uploadMiddleware');
const { parseCSV, cleanupFile } = require('../services/csvParser');

router.post('/', handleUpload, async (req, res, next) => {
  const filePath = req.file.path;

  try {
    // Generate unique batch ID for this upload session
    const uploadBatchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Parse CSV rows into structured records
    const rawRecords = await parseCSV(filePath);

    if (rawRecords.length === 0) {
      return res.status(400).json({
        error: 'Empty File',
        message: 'The uploaded CSV file contains no review rows.',
      });
    }

    // In Phase 4, we verify upload and parsing.
    // In Phase 5+, rawRecords pass into dataCleaner -> deduplicator -> batchProcessor.
    res.status(200).json({
      success: true,
      message: `Successfully parsed ${rawRecords.length} reviews from CSV.`,
      uploadBatchId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      totalRows: rawRecords.length,
      sampleReviews: rawRecords.slice(0, 3), // Return preview of first 3 rows
    });
  } catch (error) {
    next(error);
  } finally {
    // Clean up temporary file from disk to prevent storage buildup
    cleanupFile(filePath);
  }
});

module.exports = router;
