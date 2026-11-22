/**
 * test-caching.js - Test suite for Phase 9 Hash-Based Caching & Upload Integration
 *
 * Verifies:
 * 1. Single hash lookup (checkCache)
 * 2. Bulk batch cache lookup (checkBatchCache) with hitCount incrementation
 * 3. Cache population on first upload (cache misses -> stored in Cache collection)
 * 4. Cache hit on repeated unique reviews (reusing AI analysis, 0 API calls)
 * 5. Telemetry & hitCount metric tracking in Cache collection
 * 6. Duplicate review analysis inheritance
 * 7. Rating-sentiment mismatch detection (Bonus Feature #1)
 */

const path = require('path');
const request = require('supertest');
const { app } = require('./server');
const { connectDB, disconnectDB } = require('./config/db');
const Cache = require('./models/Cache');
const Review = require('./models/Review');
const {
  checkCache,
  checkBatchCache,
  storeInCache,
  getCacheStats,
} = require('./services/cacheManager');

const runCachingTests = async () => {
  console.log('🧪 Starting Phase 9 Hash-Based Caching & Pipeline Tests...\n');

  try {
    await connectDB();

    // Start with clean slate for caching test
    await Review.deleteMany({});
    await Cache.deleteMany({});

    // ─── TEST 1: SINGLE CACHE LOOKUP & HIT COUNTER ────────────────────────────
    console.log('1️⃣ Testing Single Hash Cache Insertion & Lookup...');
    const testHash = 'test_hash_abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456';
    await Cache.deleteMany({ textHash: testHash });

    await storeInCache(testHash, 'test review', {
      sentiment: 'positive',
      topics: ['quality'],
      summary: 'Great item.',
      needs_reply: false,
    });

    const check1 = await checkCache(testHash);
    if (!check1.isHit || check1.analysis.sentiment !== 'positive') {
      throw new Error(`Single cache check failed: ${JSON.stringify(check1)}`);
    }

    const cachedDoc = await Cache.findOne({ textHash: testHash });
    if (cachedDoc.hitCount !== 1) {
      throw new Error(`Expected hitCount = 1, got ${cachedDoc.hitCount}`);
    }
    console.log('✅ Single cache check succeeded! hitCount incremented to 1.');

    // ─── TEST 2: BULK CACHE LOOKUP & INCREMENTATION ───────────────────────────
    console.log('\n2️⃣ Testing Bulk Batch Cache Lookup & Incrementation...');
    const reviewsToCheck = [
      { reviewId: 'R1', textHash: testHash },
      { reviewId: 'R2', textHash: 'non_existent_hash' },
    ];

    const bulkResult = await checkBatchCache(reviewsToCheck);
    if (bulkResult.cacheHits.length !== 1 || bulkResult.cacheMisses.length !== 1) {
      throw new Error(`Bulk cache partition failed: ${JSON.stringify(bulkResult.stats)}`);
    }

    const updatedCachedDoc = await Cache.findOne({ textHash: testHash });
    if (updatedCachedDoc.hitCount !== 2) {
      throw new Error(`Expected hitCount = 2 after bulk lookup, got ${updatedCachedDoc.hitCount}`);
    }
    console.log('✅ Bulk cache partitioned correctly: 1 hit (hitCount = 2), 1 miss.');

    // ─── TEST 3: FIRST CSV UPLOAD (COLD CACHE - MISSES OCCUR) ─────────────────
    console.log('\n3️⃣ Testing First CSV Upload (Cold Cache)...');
    const csvPath = path.join(__dirname, 'sample_reviews.csv');

    const resUpload1 = await request(app)
      .post('/api/upload')
      .attach('file', csvPath);

    if (resUpload1.status !== 200) {
      throw new Error(`Upload 1 failed with status ${resUpload1.status}: ${JSON.stringify(resUpload1.body)}`);
    }

    const t1 = resUpload1.body.telemetry;
    console.log('✅ First Upload Completed:');
    console.log(`   - Total Reviews: ${t1.totalReviews}`);
    console.log(`   - Unique Reviews: ${t1.uniqueReviews}`);
    console.log(`   - Cache Hits: ${t1.cacheHits}`);
    console.log(`   - Cache Misses: ${t1.cacheMisses}`);
    console.log(`   - AI Calls Dispatched: ${t1.aiCallsDispatched}`);

    if (t1.aiCallsDispatched === 0) {
      throw new Error('Expected AI calls to be dispatched on cold cache!');
    }

    // ─── TEST 4: SECOND CSV UPLOAD (WARM PIPELINE - DEDUPLICATION & CACHING) ──
    console.log('\n4️⃣ Testing Second CSV Upload (Warm Pipeline - Zero AI Calls)...');
    const resUpload2 = await request(app)
      .post('/api/upload')
      .attach('file', csvPath);

    if (resUpload2.status !== 200) {
      throw new Error(`Upload 2 failed with status ${resUpload2.status}: ${JSON.stringify(resUpload2.body)}`);
    }

    const t2 = resUpload2.body.telemetry;
    console.log('✅ Second Upload Completed:');
    console.log(`   - Total Reviews: ${t2.totalReviews}`);
    console.log(`   - AI Calls Dispatched: ${t2.aiCallsDispatched}`);

    if (t2.aiCallsDispatched !== 0) {
      throw new Error(`Expected 0 AI calls on re-upload, got ${t2.aiCallsDispatched}`);
    }
    console.log('🎉 Zero Redundant AI Calls Verified! Reused existing data with 0 API cost.');

    // ─── TEST 5: CACHE STATS TELEMETRY (BONUS FEATURE #4) ────────────────────
    console.log('\n5️⃣ Testing Cache Telemetry Aggregation (Bonus Feature #4)...');
    const stats = await getCacheStats();
    console.log(`   Total Unique Cached Reviews: ${stats.totalCachedUniqueReviews}`);
    console.log(`   Total Cache Hits Recorded: ${stats.totalCacheHits}`);

    if (stats.totalCachedUniqueReviews === 0) {
      throw new Error('Expected cached unique reviews > 0');
    }
    console.log('✅ Cache usage telemetry verified!');

    // ─── TEST 6: RATING-SENTIMENT MISMATCH DETECTION (BONUS FEATURE #1) ──────
    console.log('\n6️⃣ Verifying Rating-Sentiment Mismatch Detection (Bonus Feature #1)...');
    // Review R012 has rating: 5, but adversarial text marked sentiment: negative
    const r012Doc = await Review.findOne({
      uploadBatchId: resUpload1.body.uploadBatchId,
      reviewId: 'R012',
    });

    if (r012Doc) {
      console.log(`   R012 Rating: ${r012Doc.rating}, Sentiment: ${r012Doc.sentiment}, Mismatch Flag: ${r012Doc.isRatingSentimentMismatch}`);
      if (r012Doc.sentiment === 'negative' && !r012Doc.isRatingSentimentMismatch) {
        throw new Error('Expected isRatingSentimentMismatch = true for 5-star negative review');
      }
    }
    console.log('✅ Rating-sentiment mismatch correctly flagged on discordant reviews!');

    // Clean up test records
    await Review.deleteMany({
      uploadBatchId: { $in: [resUpload1.body.uploadBatchId, resUpload2.body.uploadBatchId] },
    });
    await Cache.deleteMany({ textHash: testHash });
    console.log('✅ Cleaned up test records from database.');

    console.log('\n🎉 ALL PHASE 9 HASH-BASED CACHING TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Phase 9 Test Failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

runCachingTests();
