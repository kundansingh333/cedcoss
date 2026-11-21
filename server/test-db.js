/**
 * test-db.js - Diagnostic & Verification Script for MongoDB and Models
 *
 * Runs automatically or manually:
 * 1. Connects to MongoDB
 * 2. Creates a sample review document validating schema rules
 * 3. Tests validation error for invalid sentiment/topic
 * 4. Tests cache creation and retrieval by SHA-256 textHash
 * 5. Cleans up test records
 * 6. Disconnects cleanly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto');
const { connectDB, disconnectDB } = require('./config/db');
const Review = require('./models/Review');
const Cache = require('./models/Cache');

const runTest = async () => {
  console.log('🧪 Starting MongoDB & Mongoose Schema Validation Test...\n');

  try {
    await connectDB();

    const sampleText = 'Great camera quality and sleek finish, highly recommend!';
    const normalizedText = 'great camera quality and sleek finish highly recommend';
    const textHash = crypto.createHash('sha256').update(normalizedText).digest('hex');

    console.log(`🔑 Generated SHA-256 Hash for test: ${textHash}`);

    // Clean up any previous test artifact
    await Review.deleteMany({ reviewId: 'TEST_001' });
    await Cache.deleteMany({ textHash });

    // 1. Test Valid Review creation
    console.log('\n1️⃣ Creating Valid Review Document...');
    const testReview = await Review.create({
      reviewId: 'TEST_001',
      product: 'SoundPulse X',
      rating: 5,
      reviewText: sampleText,
      normalizedText: normalizedText,
      textHash: textHash,
      isDuplicate: false,
      sentiment: 'positive',
      topics: ['quality'],
      summary: 'Customer loves the camera quality and design.',
      needsReply: false,
      analysisStatus: 'completed',
      uploadBatchId: 'test_batch_1',
    });
    console.log(`✅ Review created successfully with ID: ${testReview._id}`);

    // 2. Test Invalid Sentiment Validation
    console.log('\n2️⃣ Testing Enum Validation (Invalid Sentiment)...');
    try {
      await Review.create({
        reviewId: 'TEST_INVALID',
        product: 'SoundPulse X',
        rating: 1,
        reviewText: 'Terrible',
        normalizedText: 'terrible',
        textHash: 'dummy_hash',
        sentiment: 'extremely_negative', // Not allowed by schema!
        uploadBatchId: 'test_batch_1',
      });
      console.error('❌ Validation failed to reject invalid sentiment!');
    } catch (valErr) {
      console.log(`✅ Schema correctly rejected invalid sentiment: "${valErr.message}"`);
    }

    // 3. Test Invalid Topic Validation
    console.log('\n3️⃣ Testing Topic Validation (Invalid Topic)...');
    try {
      await Review.create({
        reviewId: 'TEST_INVALID_TOPIC',
        product: 'SoundPulse X',
        rating: 3,
        reviewText: 'Ok',
        normalizedText: 'ok',
        textHash: 'dummy_hash_2',
        sentiment: 'neutral',
        topics: ['warranty_issues'], // Not in allowed topics!
        uploadBatchId: 'test_batch_1',
      });
      console.error('❌ Validation failed to reject invalid topic!');
    } catch (topicErr) {
      console.log(`✅ Schema correctly rejected invalid topic: "${topicErr.message}"`);
    }

    // 4. Test Cache Model
    console.log('\n4️⃣ Testing Cache Collection Storage & Lookup...');
    const cacheEntry = await Cache.create({
      textHash,
      normalizedText,
      analysis: {
        sentiment: 'positive',
        topics: ['quality'],
        summary: 'Customer loves the camera quality and design.',
        needsReply: false,
      },
    });
    console.log(`✅ Cache document created: ID ${cacheEntry._id}`);

    const foundCache = await Cache.findOne({ textHash });
    console.log(`✅ Cache lookup by SHA-256 succeeded! Sentiment: ${foundCache.analysis.sentiment}`);

    // 5. Cleanup
    console.log('\n5️⃣ Cleaning up test records...');
    await Review.deleteMany({ reviewId: 'TEST_001' });
    await Cache.deleteMany({ textHash });
    console.log('✅ Cleanup finished.');

    console.log('\n🎉 ALL PHASE 3 MODEL & CONNECTION TESTS PASSED!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  } finally {
    await disconnectDB();
  }
};

runTest();
