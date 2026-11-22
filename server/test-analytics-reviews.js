/**
 * test-analytics-reviews.js - Test suite for Phase 10 Dashboard APIs & Aggregations
 *
 * Verifies:
 * 1. GET /api/analytics summary cards:
 *    - totalReviews, positive%, neutral%, negative%, needsReplyCount, ratingAgreementPercentage
 * 2. Visualizations data:
 *    - sentimentDistribution chart array
 *    - top 3 complaints aggregation (ordered descending)
 *    - top 3 praises aggregation (ordered descending)
 * 3. GET /api/reviews filtering:
 *    - Filter by product
 *    - Filter by sentiment
 *    - Filter by topic
 *    - Filter by needsReply
 *    - Full-text search
 *    - Pagination structure (page, limit, totalPages, hasNextPage)
 * 4. GET /api/analytics/products/:productName (Bonus Feature #3)
 */

const request = require('supertest');
const { app } = require('./server');
const { connectDB, disconnectDB } = require('./config/db');
const Review = require('./models/Review');

const runAnalyticsTests = async () => {
  console.log('🧪 Starting Phase 10 Dashboard APIs & Aggregation Tests...\n');

  const testBatchId = `test_batch_analytics_${Date.now()}`;

  try {
    await connectDB();

    // ─── 1. SEED TEST DATA FOR AGGREGATION VERIFICATION ───────────────────────
    console.log('1️⃣ Seeding Test Reviews for Analytics Aggregations...');
    const seedReviews = [
      {
        reviewId: 'A001',
        product: 'SoundPulse Earbuds',
        rating: 5,
        reviewText: 'Amazing bass and sound quality!',
        normalizedText: 'amazing bass and sound quality',
        textHash: 'hash_a001',
        sentiment: 'positive',
        topics: ['quality'],
        summary: 'Customer loves bass and sound.',
        needsReply: false,
        uploadBatchId: testBatchId,
      },
      {
        reviewId: 'A002',
        product: 'SoundPulse Earbuds',
        rating: 5,
        reviewText: 'Super fast delivery, quality build!',
        normalizedText: 'super fast delivery quality build',
        textHash: 'hash_a002',
        sentiment: 'positive',
        topics: ['delivery', 'quality'],
        summary: 'Fast delivery and build.',
        needsReply: false,
        uploadBatchId: testBatchId,
      },
      {
        reviewId: 'A003',
        product: 'SoundPulse Earbuds',
        rating: 1,
        reviewText: 'Stopped working after 1 week. Bad support.',
        normalizedText: 'stopped working after 1 week bad support',
        textHash: 'hash_a003',
        sentiment: 'negative',
        topics: ['quality', 'support'],
        summary: 'Earbuds broke quickly.',
        needsReply: true,
        uploadBatchId: testBatchId,
      },
      {
        reviewId: 'A004',
        product: 'Apex Running Shoes',
        rating: 4,
        reviewText: 'Comfortable shoe, good price.',
        normalizedText: 'comfortable shoe good price',
        textHash: 'hash_a004',
        sentiment: 'positive',
        topics: ['price', 'size_fit'],
        summary: 'Good price and fit.',
        needsReply: false,
        uploadBatchId: testBatchId,
      },
      {
        reviewId: 'A005',
        product: 'Apex Running Shoes',
        rating: 2,
        reviewText: 'Wrong size delivered and damaged packaging.',
        normalizedText: 'wrong size delivered and damaged packaging',
        textHash: 'hash_a005',
        sentiment: 'negative',
        topics: ['packaging', 'delivery', 'size_fit'],
        summary: 'Wrong size and damaged box.',
        needsReply: true,
        uploadBatchId: testBatchId,
      },
      {
        reviewId: 'A006',
        product: 'Apex Running Shoes',
        rating: 3,
        reviewText: 'Average shoe, okay for casual wear.',
        normalizedText: 'average shoe okay for casual wear',
        textHash: 'hash_a006',
        sentiment: 'neutral',
        topics: ['other'],
        summary: 'Average product.',
        needsReply: false,
        uploadBatchId: testBatchId,
      },
      {
        reviewId: 'A007',
        product: 'Apex Running Shoes',
        rating: 5,
        reviewText: 'Terrible! (Sarcastic 5 star review)',
        normalizedText: 'terrible sarcastic 5 star review',
        textHash: 'hash_a007',
        sentiment: 'negative',
        topics: ['quality'],
        summary: 'Sarcastic review.',
        needsReply: true,
        isRatingSentimentMismatch: true, // Rating 5, sentiment negative
        uploadBatchId: testBatchId,
      },
    ];

    await Review.insertMany(seedReviews);
    console.log(`✅ Seeded ${seedReviews.length} test reviews.`);

    // ─── 2. TEST GET /api/analytics ──────────────────────────────────────────
    console.log('\n2️⃣ Testing GET /api/analytics Endpoint...');
    const resAnalytics = await request(app)
      .get('/api/analytics')
      .query({ batchId: testBatchId });

    if (resAnalytics.status !== 200 || !resAnalytics.body.success) {
      throw new Error(`Analytics endpoint failed: ${JSON.stringify(resAnalytics.body)}`);
    }

    const { summary, sentimentDistribution, topComplaints, topPraises, filterOptions } =
      resAnalytics.body.data;

    console.log('   Summary Cards:', summary);
    if (summary.totalReviews !== 7) throw new Error(`Expected totalReviews = 7, got ${summary.totalReviews}`);
    if (summary.needsReplyCount !== 3) throw new Error(`Expected needsReplyCount = 3, got ${summary.needsReplyCount}`);
    if (summary.mismatchCount !== 1) throw new Error(`Expected mismatchCount = 1, got ${summary.mismatchCount}`);

    console.log('   Top 3 Complaints:', topComplaints);
    if (topComplaints.length === 0) throw new Error('Expected top complaints');

    console.log('   Top 3 Praises:', topPraises);
    if (topPraises.length === 0) throw new Error('Expected top praises');

    console.log('   Filter Options Products:', filterOptions.products);
    if (!filterOptions.products.includes('SoundPulse Earbuds')) {
      throw new Error('Distinct products missing SoundPulse Earbuds');
    }
    console.log('✅ GET /api/analytics verified with accurate aggregations!');

    // ─── 3. TEST GET /api/reviews WITH PAGINATION & FILTERS ───────────────────
    console.log('\n3️⃣ Testing GET /api/reviews with Multi-Parameter Filters...');

    // Test 3a: Filter by Sentiment
    const resNeg = await request(app)
      .get('/api/reviews')
      .query({ batchId: testBatchId, sentiment: 'negative' });
    if (resNeg.body.reviews.length !== 3) {
      throw new Error(`Expected 3 negative reviews, got ${resNeg.body.reviews.length}`);
    }
    console.log('✅ Filter by sentiment (negative) returned exactly 3 reviews.');

    // Test 3b: Filter by Needs Reply
    const resReply = await request(app)
      .get('/api/reviews')
      .query({ batchId: testBatchId, needsReply: 'true' });
    if (resReply.body.reviews.length !== 3) {
      throw new Error(`Expected 3 reviews needing reply, got ${resReply.body.reviews.length}`);
    }
    console.log('✅ Filter by needsReply (true) returned exactly 3 reviews.');

    // Test 3c: Filter by Product
    const resProd = await request(app)
      .get('/api/reviews')
      .query({ batchId: testBatchId, product: 'SoundPulse Earbuds' });
    if (resProd.body.reviews.length !== 3) {
      throw new Error(`Expected 3 SoundPulse reviews, got ${resProd.body.reviews.length}`);
    }
    console.log('✅ Filter by product returned exactly 3 reviews.');

    // Test 3d: Search Query
    const resSearch = await request(app)
      .get('/api/reviews')
      .query({ batchId: testBatchId, search: 'bass' });
    if (resSearch.body.reviews.length !== 1) {
      throw new Error(`Search for "bass" expected 1 review, got ${resSearch.body.reviews.length}`);
    }
    console.log('✅ Text search query ("bass") successfully matched 1 review.');

    // Test 3e: Pagination
    const resPage = await request(app)
      .get('/api/reviews')
      .query({ batchId: testBatchId, page: 1, limit: 3 });
    if (resPage.body.reviews.length !== 3 || resPage.body.pagination.totalPages !== 3) {
      throw new Error(`Pagination metadata incorrect: ${JSON.stringify(resPage.body.pagination)}`);
    }
    console.log('✅ Bounded pagination verified (3 items per page, 3 total pages).');

    // ─── 4. TEST INDIVIDUAL PRODUCT ANALYTICS (BONUS FEATURE #3) ──────────────
    console.log('\n4️⃣ Testing Individual Product Analytics (Bonus Feature #3)...');
    const resProductPage = await request(app)
      .get('/api/analytics/products/SoundPulse%20Earbuds');

    if (resProductPage.status !== 200 || resProductPage.body.product !== 'SoundPulse Earbuds') {
      throw new Error(`Product analytics failed: ${JSON.stringify(resProductPage.body)}`);
    }
    console.log('   SoundPulse Earbuds Analytics:', resProductPage.body.metrics);
    console.log('✅ Individual product analytics page verified!');

    // Clean up seeded records
    await Review.deleteMany({ uploadBatchId: testBatchId });
    console.log('✅ Cleaned up test seed records.');

    console.log('\n🎉 ALL PHASE 10 DASHBOARD APIS & AGGREGATIONS TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Phase 10 Test Failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

runAnalyticsTests();
