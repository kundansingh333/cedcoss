/**
 * test-validator.js - Test suite for Phase 7 AI Response Validation & Retry Handling
 *
 * Verifies:
 * 1. Valid JSON matching the CEDCOSS schema passes validation
 * 2. Malformed JSON string is rejected with clear error
 * 3. Unsupported sentiment (e.g. 'extremely_satisfied') is rejected
 * 4. Unsupported topics (e.g. 'warranty', 'discount') are rejected
 * 5. Missing or invalid types (e.g. needs_reply as string "yes") are rejected
 * 6. Retry controller succeeds when attempt 1 fails and attempt 2 succeeds
 * 7. Double failure gracefully marks review as 'analysis_failed' without crashing
 */

const {
  validateAIResponse,
  analyzeWithValidationAndRetry,
} = require('./services/responseValidator');

const runValidatorTests = async () => {
  console.log('🧪 Starting Phase 7 AI Response Validation & Retry Tests...\n');

  try {
    // ─── TEST 1: VALID SCHEMA OBJECT ─────────────────────────────────────────
    console.log('1️⃣ Testing Valid AI Response Validation...');
    const validResponse = {
      sentiment: 'positive',
      topics: ['quality', 'delivery'],
      summary: 'Fast delivery and excellent product quality.',
      needs_reply: false,
    };
    const res1 = validateAIResponse(validResponse);
    if (!res1.isValid) {
      throw new Error(`Valid response unexpectedly rejected: ${res1.errors.join(', ')}`);
    }
    console.log('✅ Valid response successfully passed validation.');

    // ─── TEST 2: INVALID JSON STRING ─────────────────────────────────────────
    console.log('\n2️⃣ Testing Malformed JSON Rejection...');
    const malformedJson = '{ sentiment: positive, topics: [quality] '; // syntax error
    const res2 = validateAIResponse(malformedJson);
    if (res2.isValid || !res2.errors[0].includes('Invalid JSON format')) {
      throw new Error('Failed to reject malformed JSON string.');
    }
    console.log(`✅ Malformed JSON correctly rejected: "${res2.errors[0]}"`);

    // ─── TEST 3: UNSUPPORTED SENTIMENT ───────────────────────────────────────
    console.log('\n3️⃣ Testing Unsupported Sentiment Rejection...');
    const badSentiment = {
      sentiment: 'extremely_good', // Not in allowed sentiments!
      topics: ['quality'],
      summary: 'Loved it.',
      needs_reply: false,
    };
    const res3 = validateAIResponse(badSentiment);
    if (res3.isValid || !res3.errors[0].includes('Unsupported sentiment')) {
      throw new Error('Failed to reject unsupported sentiment value.');
    }
    console.log(`✅ Unsupported sentiment rejected: "${res3.errors[0]}"`);

    // ─── TEST 4: UNSUPPORTED TOPICS ──────────────────────────────────────────
    console.log('\n4️⃣ Testing Unsupported Topics Rejection...');
    const badTopics = {
      sentiment: 'neutral',
      topics: ['battery_life', 'customer_satisfaction'], // Not allowed topic enums!
      summary: 'Battery ok.',
      needs_reply: false,
    };
    const res4 = validateAIResponse(badTopics);
    if (res4.isValid || !res4.errors[0].includes('Unsupported topics found')) {
      throw new Error('Failed to reject unsupported topic values.');
    }
    console.log(`✅ Unsupported topics rejected: "${res4.errors[0]}"`);

    // ─── TEST 5: INVALID FIELD TYPES ─────────────────────────────────────────
    console.log('\n5️⃣ Testing Invalid Field Types Rejection...');
    const badTypes = {
      sentiment: 'negative',
      topics: ['support'],
      summary: '', // Empty summary not allowed
      needs_reply: 'yes', // Must be boolean!
    };
    const res5 = validateAIResponse(badTypes);
    if (res5.isValid || res5.errors.length !== 2) {
      throw new Error(`Expected 2 validation errors, got ${res5.errors.length}`);
    }
    console.log(`✅ Invalid field types rejected: ${res5.errors.join(' & ')}`);

    // ─── TEST 6: RETRY CONTROLLER (ATTEMPT 1 FAILS, ATTEMPT 2 SUCCEEDS) ──────
    console.log('\n6️⃣ Testing Retry Mechanism (Attempt 1 Fails → Attempt 2 Succeeds)...');
    let callCount = 0;
    const mockFlakyAI = async () => {
      callCount++;
      if (callCount === 1) {
        // First attempt returns invalid sentiment
        return { sentiment: 'bad_sentiment', topics: ['quality'], summary: 'Test', needs_reply: false };
      }
      // Second attempt succeeds with valid schema
      return { sentiment: 'positive', topics: ['quality'], summary: 'Fixed on retry.', needs_reply: false };
    };

    const retrySuccess = await analyzeWithValidationAndRetry({ reviewId: 'RETRY_TEST' }, mockFlakyAI);

    if (retrySuccess.status !== 'completed' || retrySuccess.attempts !== 2) {
      throw new Error(`Retry mechanism failed. Expected status 'completed' after 2 attempts, got ${JSON.stringify(retrySuccess)}`);
    }
    console.log(`✅ Successfully recovered on retry attempt 2! Summary: "${retrySuccess.analysis.summary}"`);

    // ─── TEST 7: DOUBLE FAILURE (CRASH-PROOF FALLBACK) ───────────────────────
    console.log('\n7️⃣ Testing Double Failure Recovery (Must Not Crash)...');
    const mockAlwaysFailingAI = async () => {
      // Consistently returns invalid JSON
      return 'Not a valid JSON at all';
    };

    const doubleFailResult = await analyzeWithValidationAndRetry(
      { reviewId: 'FAIL_TEST' },
      mockAlwaysFailingAI,
      1 // 1 retry
    );

    if (doubleFailResult.status !== 'analysis_failed' || doubleFailResult.analysis !== null) {
      throw new Error('Expected status analysis_failed with null analysis.');
    }
    console.log(`✅ Application safely caught double failure! Status: "${doubleFailResult.status}", Reason: "${doubleFailResult.failureReason}"`);

    console.log('\n🎉 ALL PHASE 7 AI RESPONSE VALIDATION & RETRY TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Phase 7 Test Failed:', error.message);
    process.exit(1);
  }
};

runValidatorTests();
