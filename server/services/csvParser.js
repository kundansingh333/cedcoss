/**
 * csvParser.js - Streaming CSV Parser Service
 *
 * Capabilities:
 * - Streams CSV file using 'csv-parser' for memory efficiency on large files
 * - Automatically strips UTF-8 BOM (\ufeff) commonly added by Excel
 * - Flexible header mapping: handles variations like 'review_id', 'Review ID', 'reviewId'
 * - Preserves raw line numbers for debugging problematic CSV records
 * - Safely cleans up the temporary uploaded file from disk after parsing
 */

const fs = require('fs');
const csv = require('csv-parser');

/**
 * Maps raw CSV header names to standard application keys
 * e.g., 'Review ID' -> 'reviewId', 'review_text' -> 'reviewText'
 */
const normalizeHeader = (header) => {
  // Strip BOM if present and trim whitespace
  const clean = header.replace(/^\ufeff/, '').trim().toLowerCase();

  if (['review_id', 'reviewid', 'review id', 'id'].includes(clean)) {
    return 'reviewId';
  }
  if (['product', 'product_name', 'product name', 'item'].includes(clean)) {
    return 'product';
  }
  if (['rating', 'ratings', 'stars', 'score'].includes(clean)) {
    return 'rating';
  }
  if (['review_text', 'reviewtext', 'review text', 'review', 'comment', 'text'].includes(clean)) {
    return 'reviewText';
  }

  return clean;
};

/**
 * Parses a CSV file from disk into an array of structured row objects
 * @param {string} filePath - Absolute path to the CSV file
 * @returns {Promise<Array<Object>>} - Array of parsed review objects
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const records = [];
    let rowNumber = 1; // Row 1 is header

    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found at path: ${filePath}`));
    }

    const stream = fs.createReadStream(filePath);

    stream
      .pipe(
        csv({
          mapHeaders: ({ header }) => normalizeHeader(header),
          skipEmptyLines: true,
          trim: true,
        })
      )
      .on('data', (row) => {
        rowNumber++;
        records.push({
          rowNumber,
          reviewId: row.reviewId || `ROW_${rowNumber}`,
          product: row.product || 'Unknown Product',
          rating: row.rating !== undefined ? row.rating : '',
          reviewText: row.reviewText !== undefined ? row.reviewText : '',
        });
      })
      .on('end', () => {
        resolve(records);
      })
      .on('error', (err) => {
        reject(new Error(`Failed to parse CSV file: ${err.message}`));
      });
  });
};

/**
 * Safely removes a file from disk if it exists
 * @param {string} filePath
 */
const cleanupFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to clean up temp file ${filePath}: ${err.message}`);
  }
};

module.exports = {
  parseCSV,
  cleanupFile,
  normalizeHeader,
};
