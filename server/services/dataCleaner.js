/**
 * dataCleaner.js - Review Data Cleaning & Normalization Service
 *
 * Requirements addressed:
 * - Handle empty review text
 * - Handle missing ratings (convert to 'unknown')
 * - Treat invalid ratings (non-numeric, out-of-range 1-5) as 'unknown'
 * - Clean whitespace, tabs, and line breaks
 * - Support Hindi, Hinglish, emojis, and messy user input
 * - Normalize text for robust duplicate detection (case-folding, punctuation & emoji stripping)
 * - Preserve all original review information intact
 */

const crypto = require('crypto');

/**
 * Validates and cleans a rating value
 * - Numbers 1 through 5 are preserved as integers
 * - Empty, undefined, null, 'N/A', or invalid scores become 'unknown'
 * @param {any} rawRating
 * @returns {number|string} Valid rating (1-5) or 'unknown'
 */
const cleanRating = (rawRating) => {
  if (rawRating === undefined || rawRating === null) {
    return 'unknown';
  }

  const str = String(rawRating).trim();
  if (str === '' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') {
    return 'unknown';
  }

  const num = Number(str);
  // Check if it's a valid integer/float between 1 and 5
  if (!isNaN(num) && Number.isFinite(num) && num >= 1 && num <= 5) {
    // Return rounded integer for standard star ratings
    return Math.round(num);
  }

  return 'unknown';
};

/**
 * Normalizes review text for accurate deduplication:
 * 1. Converts to lowercase (case-insensitivity)
 * 2. Removes emojis & symbols so emoji variations don't mask identical text
 * 3. Removes punctuation (! ? . , ' " : ; - _ ( ) [ ] { } / \ ` ~)
 * 4. Preserves alphanumeric Latin characters and Unicode Devanagari (Hindi) scripts
 * 5. Collapses multiple spaces, tabs, and newlines into a single space
 * @param {string} text
 * @returns {string} Cleaned, normalized string
 */
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return (
    text
      // 1. Lowercase (handles Hinglish & English)
      .toLowerCase()
      // 2. Remove emojis and pictographs using Unicode property escapes
      .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
      // 3. Remove punctuation and special symbols, keeping Latin letters, Devanagari (\u0900-\u097F), and numbers
      .replace(/[^\p{L}\p{N}\u0900-\u097F\s]/gu, '')
      // 4. Collapse consecutive whitespace characters into a single space
      .replace(/\s+/g, ' ')
      // 5. Trim leading and trailing whitespace
      .trim()
  );
};

/**
 * Generates a deterministic SHA-256 hash of normalized text
 * @param {string} normalizedText
 * @returns {string} 64-character hexadecimal SHA-256 hash
 */
const generateTextHash = (normalizedText) => {
  return crypto.createHash('sha256').update(normalizedText || '').digest('hex');
};

/**
 * Cleans a single raw review record parsed from CSV
 * Preserves original text, cleans rating, and generates normalized text & hash
 * @param {Object} rawRecord
 * @returns {Object} Cleaned record
 */
const cleanReviewRecord = (rawRecord) => {
  const originalText = rawRecord.reviewText ? String(rawRecord.reviewText).trim() : '';
  const normalized = normalizeText(originalText);
  const hash = generateTextHash(normalized);
  const rating = cleanRating(rawRecord.rating);

  return {
    reviewId: String(rawRecord.reviewId || '').trim(),
    product: String(rawRecord.product || 'Unknown Product').trim(),
    rating: rating,
    reviewText: originalText, // Original text preserved untouched!
    normalizedText: normalized, // Cleaned for deduplication & hashing
    textHash: hash, // SHA-256 for O(1) deduplication & cache lookup
    isEmpty: normalized.length === 0, // Flag for empty reviews
  };
};

module.exports = {
  cleanRating,
  normalizeText,
  generateTextHash,
  cleanReviewRecord,
};
