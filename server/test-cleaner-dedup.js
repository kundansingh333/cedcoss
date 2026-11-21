/**
 * test-cleaner-dedup.js - Test suite for Phase 5 Data Cleaning & Duplicate Detection
 *
 * Verifies:
 * 1. cleanRating() edge cases (1-5, N/A, empty, invalid strings, negative numbers)
 * 2. normalizeText() handling of:
 *    - Hindi (Devanagari script)
 *    - Hinglish
 *    - Emojis stripping
 *    - Punctuation removal and whitespace collapsing
 * 3. SHA-256 hash generation determinism
 * 4. Duplicate detection matching:
 *    - R001 vs R006 (capitalization & punctuation differences)
 *    - R004 vs R009 (Hinglish with emojis and extra spacing)
 * 5. End-to-end POST /api/upload endpoint integration testing
 */

const path = require('path');
const request = require('supertest');
const { app } = require('./server');
const { connectDB, disconnectDB } = require('./config/db');
const Review = require('./models/Review');
const {
  cleanRating,
  normalizeText,
  generateTextHash,
  cleanReviewRecord,
} = require('./services/dataCleaner');

const runPhase5Tests = async () => {
  console.log('🧪 Starting Phase 5 Data Cleaning & Duplicate Detection Tests...\n');

  try {
    await connectDB();

    // ─── TEST 1: RATING CLEANING ──────────────────────────────────────────────
    console.log('1️⃣ Testing Rating Cleaning Edge Cases...');
    const ratingTests = [
      { input: '5', expected: 5 },
      { input: 4, expected: 4 },
      { input: 'N/A', expected: 'unknown' },
      { input: '', expected: 'unknown' },
      { input: null, expected: 'unknown' },
      { input: 'invalid_score', expected: 'unknown' },
      { input: '10', expected: 'unknown' }, // Out of bounds > 5
      { input: '-1', expected: 'unknown' }, // Out of bounds < 1
    ];

    for (const test of ratingTests) {
      const result = cleanRating(test.input);
      if (result !== test.expected) {
        throw new Error(
          `Rating cleaning failed for input "${test.input}": expected ${test.expected}, got ${result}`
        );
      }
    }
    console.log('✅ cleanRating() passed all 8 edge cases!');

    // ─── TEST 2: TEXT NORMALIZATION (HINDI, HINGLISH, EMOJIS) ─────────────────
    console.log('\n2️⃣ Testing Text Normalization (Hindi, Hinglish, Punctuation, Emojis)...');

    // Case A: English with punctuation and case difference
    const textA1 = 'Battery life is amazing! Lasted 3 days on a single charge. Sound is crisp.';
    const textA2 = 'battery life is amazing! lasted 3 days on a single charge. sound is crisp.';
    const normA1 = normalizeText(textA1);
    const normA2 = normalizeText(textA2);

    if (normA1 !== normA2) {
      throw new Error(`Normalization mismatch for Case A: "${normA1}" vs "${normA2}"`);
    }
    console.log(`✅ Case A (English): Identical normalization: "${normA1}"`);

    // Case B: Hinglish with emojis and excessive whitespace
    const textB1 = '   Bohot badhiya quality hai! Fabric soft hai and fitting ekdum perfect hai. ❤️   ';
    const textB2 = 'bohot badhiya quality hai fabric soft hai and fitting ekdum perfect hai';
    const normB1 = normalizeText(textB1);
    const normB2 = normalizeText(textB2);

    if (normB1 !== normB2) {
      throw new Error(`Normalization mismatch for Case B: "${normB1}" vs "${normB2}"`);
    }
    console.log(`✅ Case B (Hinglish + Emojis): Identical normalization: "${normB1}"`);

    // Case C: Pure Hindi (Devanagari script)
    const textC = 'यह उत्पाद बहुत अच्छा है!';
    const normC = normalizeText(textC);
    if (!normC.includes('यह उत्पाद बहुत अच्छा है')) {
      throw new Error(`Hindi script was damaged during normalization: "${normC}"`);
    }
    console.log(`✅ Case C (Devanagari Hindi): Preserved correctly: "${normC}"`);

    // ─── TEST 3: SHA-256 HASH DETERMINISM ─────────────────────────────────────
    console.log('\n3️⃣ Testing Deterministic SHA-256 Hashing...');
    const hashA1 = generateTextHash(normA1);
    const hashA2 = generateTextHash(normA2);

    if (hashA1 !== hashA2 || hashA1.length !== 64) {
      throw new Error('SHA-256 hashing is not deterministic or incorrect length');
    }
    console.log(`✅ SHA-256 hashes match perfectly: ${hashA1}`);

    // ─── TEST 4: END-TO-END POST /api/upload WITH SAMPLE REVIEWS ──────────────
    console.log('\n4️⃣ Testing POST /api/upload End-to-End with sample_reviews.csv...');
    const csvPath = path.join(__dirname, 'sample_reviews.csv');

    const res = await request(app)
      .post('/api/upload')
      .attach('file', csvPath);

    if (res.status !== 200) {
      throw new Error(`Upload endpoint failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const { stats, uploadBatchId } = res.body;
    console.log('✅ Upload processed successfully!');
    console.log(`   - Total rows: ${stats.total}`);
    console.log(`   - Unique reviews: ${stats.uniqueCount}`);
    console.log(`   - Duplicate reviews: ${stats.duplicateCount}`);
    console.log(`   - Empty reviews: ${stats.emptyCount}`);

    // Verify duplicate pairs in database
    const r006 = await Review.findOne({ uploadBatchId, reviewId: 'R006' });
    const r009 = await Review.findOne({ uploadBatchId, reviewId: 'R009' });

    if (!r006 || !r006.isDuplicate || r006.duplicateOf !== 'R001') {
      throw new Error(`R006 failed to be detected as duplicate of R001! Actual: ${JSON.stringify(r006)}`);
    }
    console.log('✅ R006 correctly flagged as duplicate of R001!');

    if (!r009 || !r009.isDuplicate || r009.duplicateOf !== 'R004') {
      throw new Error(`R009 failed to be detected as duplicate of R004! Actual: ${JSON.stringify(r009)}`);
    }
    console.log('✅ R009 correctly flagged as duplicate of R004!');

    // Clean up test batch records
    await Review.deleteMany({ uploadBatchId });
    console.log('✅ Test batch records cleaned up from database.');

    console.log('\n🎉 ALL PHASE 5 DATA CLEANING & DEDUPLICATION TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Phase 5 Test Failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

runPhase5Tests();
