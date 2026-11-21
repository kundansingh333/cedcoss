/**
 * test-batch-processor.js - Test suite for Phase 8 Batch Processing & Exponential Backoff
 *
 * Verifies:
 * 1. chunkArray() divides arbitrary arrays into groups of max 5 items
 * 2. calculateBackoffDelay() implements exponential doubling (1s, 2s, 4s) with jitter
 * 3. isRetryableError() identifies 429 (rate limits) and 503/ETIMEDOUT (server/network errors)
 * 4. Strict Concurrency Bound: Guarantees active in-flight requests NEVER exceed 5
 * 5. Rate Limit Backoff Recovery: Proves automatic recovery from transient HTTP 429 errors
 * 6. Multi-batch pipeline metrics: Verifies totalTimeMs, batchCount, success/failure tracking
 */

const {
  chunkArray,
  calculateBackoffDelay,
  isRetryableError,
  processInBatches,
} = require('./services/batchProcessor');

const runBatchTests = async () => {
  console.log('🧪 Starting Phase 8 Batch Processing & Exponential Backoff Tests...\n');

  try {
    // ─── TEST 1: CHUNK ARRAY IN GROUPS OF 5 ──────────────────────────────────
    console.log('1️⃣ Testing Array Chunking (Max 5 per Batch)...');
    const items14 = Array.from({ length: 14 }, (_, i) => `item_${i + 1}`);
    const chunks = chunkArray(items14, 5);

    if (chunks.length !== 3 || chunks[0].length !== 5 || chunks[1].length !== 5 || chunks[2].length !== 4) {
      throw new Error(`Chunking failed. Chunks: ${JSON.stringify(chunks.map((c) => c.length))}`);
    }
    console.log(`✅ 14 items divided into 3 batches: [${chunks.map((c) => c.length).join(', ')}]`);

    // ─── TEST 2: EXPONENTIAL BACKOFF CALCULATION ─────────────────────────────
    console.log('\n2️⃣ Testing Exponential Backoff Delays (1s -> 2s -> 4s)...');
    const d0 = calculateBackoffDelay(0); // ~1000ms + jitter
    const d1 = calculateBackoffDelay(1); // ~2000ms + jitter
    const d2 = calculateBackoffDelay(2); // ~4000ms + jitter

    console.log(`   Attempt 1 Backoff: ${(d0 / 1000).toFixed(2)}s`);
    console.log(`   Attempt 2 Backoff: ${(d1 / 1000).toFixed(2)}s`);
    console.log(`   Attempt 3 Backoff: ${(d2 / 1000).toFixed(2)}s`);

    if (d0 < 1000 || d1 < 2000 || d2 < 4000 || d1 <= d0 || d2 <= d1) {
      throw new Error('Exponential backoff delay does not increase monotonically');
    }
    console.log('✅ Backoff delays strictly follow exponential growth with anti-collision jitter.');

    // ─── TEST 3: RETRYABLE ERROR CLASSIFICATION ──────────────────────────────
    console.log('\n3️⃣ Testing Retryable Error Detection (429, 503, ETIMEDOUT)...');
    const err429 = { statusCode: 429, message: 'Resource exhausted: rate limit exceeded' };
    const err503 = { status: 503, message: 'Service unavailable' };
    const errTimeout = { message: 'connect ETIMEDOUT 142.250.190.46:443' };
    const errBadReq = { status: 400, message: 'Bad Request: Missing argument' };

    if (!isRetryableError(err429) || !isRetryableError(err503) || !isRetryableError(errTimeout)) {
      throw new Error('Failed to classify rate limit or network error as retryable');
    }
    if (isRetryableError(errBadReq)) {
      throw new Error('HTTP 400 Bad Request should NOT be retryable');
    }
    console.log('✅ Correctly classified retryable vs non-retryable errors.');

    // ─── TEST 4: CONCURRENCY CEILING (MAX 5 IN FLIGHT) ────────────────────────
    console.log('\n4️⃣ Testing Concurrency Bound (Never Exceed 5 Concurrent Requests)...');
    let currentInFlight = 0;
    let maxObservedInFlight = 0;

    const mockMonitoredAI = async (review) => {
      currentInFlight++;
      maxObservedInFlight = Math.max(maxObservedInFlight, currentInFlight);
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 60));
      currentInFlight--;

      return {
        sentiment: 'positive',
        topics: ['quality'],
        summary: `Review ${review.reviewId} analyzed.`,
        needs_reply: false,
      };
    };

    const mockReviews = Array.from({ length: 12 }, (_, i) => ({
      reviewId: `R00${i + 1}`,
      product: 'Test Item',
      reviewText: `Text ${i + 1}`,
    }));

    const batchResult = await processInBatches(mockReviews, {
      analyzeFn: mockMonitoredAI,
      batchSize: 5,
      interBatchDelayMs: 50,
    });

    console.log(`   Max concurrent in-flight requests observed: ${maxObservedInFlight}`);

    if (maxObservedInFlight > 5) {
      throw new Error(`CONCURRENCY VIOLATION: ${maxObservedInFlight} requests ran concurrently! Max allowed: 5`);
    }
    console.log('✅ Concurrency bound verified! Exactly 5 concurrent requests maximum.');

    // ─── TEST 5: RATE LIMIT RECOVERY VIA BACKOFF ──────────────────────────────
    console.log('\n5️⃣ Testing Rate Limit (HTTP 429) Exponential Backoff Recovery...');
    let attemptsOnFlakyReview = 0;

    const mockRateLimitedAI = async (review) => {
      if (review.reviewId === 'R_FLAKY') {
        attemptsOnFlakyReview++;
        if (attemptsOnFlakyReview === 1) {
          const rateErr = new Error('429 Too Many Requests: Quota exceeded');
          rateErr.status = 429;
          throw rateErr;
        }
      }
      return {
        sentiment: 'positive',
        topics: ['quality'],
        summary: 'Recovered after backoff.',
        needs_reply: false,
      };
    };

    const recoveryResult = await processInBatches(
      [{ reviewId: 'R_FLAKY', product: 'Phone', reviewText: 'Good' }],
      {
        analyzeFn: mockRateLimitedAI,
        batchSize: 5,
        interBatchDelayMs: 0,
      }
    );

    if (recoveryResult.results[0].analysisStatus !== 'completed' || attemptsOnFlakyReview !== 2) {
      throw new Error('Failed to recover from transient HTTP 429 error');
    }
    console.log('✅ Successfully backed off and recovered from HTTP 429 rate limit!');

    // ─── TEST 6: BATCH PROCESSING METRICS INTEGRITY ──────────────────────────
    console.log('\n6️⃣ Verifying Batch Metrics Integrity...');
    const { metrics } = batchResult;
    if (
      metrics.totalReviews !== 12 ||
      metrics.batchCount !== 3 ||
      metrics.successCount !== 12 ||
      metrics.failedCount !== 0 ||
      metrics.totalTimeMs <= 0
    ) {
      throw new Error(`Invalid metrics: ${JSON.stringify(metrics)}`);
    }
    console.log(`✅ Metrics verified: ${metrics.totalReviews} reviews in ${metrics.batchCount} batches, Total time: ${metrics.totalTimeMs}ms`);

    console.log('\n🎉 ALL PHASE 8 BATCH PROCESSING & EXPONENTIAL BACKOFF TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Phase 8 Test Failed:', error);
    process.exit(1);
  }
};

runBatchTests();
