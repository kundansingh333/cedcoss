/**
 * batchProcessor.js - Batch Processing Engine with Exponential Backoff
 *
 * Requirements addressed:
 * - Process reviews strictly in batches of 5 (BATCH_SIZE = 5)
 * - Do not send 30 simultaneous AI requests (bounded concurrency)
 * - Implement exponential backoff (1s -> 2s -> 4s) with jitter for rate limits & server errors
 * - Use sensible retry limits (MAX_RETRIES = 3)
 * - Handle API timeouts, HTTP 429 (RESOURCE_EXHAUSTED), and HTTP 5xx errors
 * - Track total processing time and batch execution metrics
 */

const {
  BATCH_SIZE,
  MAX_RETRIES,
  INITIAL_BACKOFF_MS,
  MAX_BACKOFF_MS,
} = require('../utils/constants');
const { analyzeWithValidationAndRetry } = require('./responseValidator');
const { analyzeReviewWithGemini } = require('./geminiService');

/**
 * Utility pause function for async delays
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates exponential backoff delay with random jitter
 * Formula: min(MAX_BACKOFF, INITIAL_BACKOFF * 2^attempt) + jitter(0-250ms)
 * @param {number} attempt - Current retry attempt (0, 1, 2...)
 * @returns {number} Delay in milliseconds
 */
const calculateBackoffDelay = (attempt) => {
  const exponentialDelay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  const cappedDelay = Math.min(MAX_BACKOFF_MS, exponentialDelay);
  const jitter = Math.floor(Math.random() * 250); // Prevents thundering herd
  return cappedDelay + jitter;
};

/**
 * Determines whether an error is transient and eligible for backoff retry
 * @param {Error|Object} error
 * @returns {boolean}
 */
const isRetryableError = (error) => {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const status = error.status || error.code || error.statusCode;

  // Rate limits
  if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
    return true;
  }
  // Server errors
  if ([500, 502, 503, 504].includes(status) || msg.includes('unavailable') || msg.includes('overloaded')) {
    return true;
  }
  // Network timeouts
  if (msg.includes('etimedout') || msg.includes('econnreset') || msg.includes('network') || msg.includes('timeout')) {
    return true;
  }

  return false;
};

/**
 * Executes a single review analysis with exponential backoff for transient errors
 * @param {Object} review - Review to analyze
 * @param {Function} analyzeFn - Analysis function
 * @returns {Promise<Object>} Analysis result
 */
const executeWithBackoff = async (review, analyzeFn = analyzeReviewWithGemini) => {
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      // Analyze with schema validation & 1-shot retry for structural flaws
      const result = await analyzeWithValidationAndRetry(review, analyzeFn);
      return result;
    } catch (err) {
      attempt++;

      if (attempt <= MAX_RETRIES && isRetryableError(err)) {
        const delay = calculateBackoffDelay(attempt - 1);
        console.warn(
          `⏳ Rate limit or server error on review "${review.reviewId || 'unknown'}" (Attempt ${attempt}/${MAX_RETRIES}). Backing off for ${(delay / 1000).toFixed(2)}s...`
        );
        await sleep(delay);
      } else {
        // Non-retryable error or exceeded maximum retries
        console.error(
          `❌ Exhausted retries or non-retryable error for review "${review.reviewId || 'unknown'}": ${err.message}`
        );
        return {
          status: 'analysis_failed',
          failureReason: err.message,
          analysis: null,
          attempts: attempt,
        };
      }
    }
  }

  return {
    status: 'analysis_failed',
    failureReason: 'Exceeded maximum backoff retries.',
    analysis: null,
    attempts: attempt,
  };
};

/**
 * Splits an array into sub-arrays (chunks) of specified size
 * @param {Array} array
 * @param {number} size
 * @returns {Array<Array>}
 */
const chunkArray = (array, size = BATCH_SIZE) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Processes an array of reviews in controlled batches of 5 with exponential backoff
 * @param {Array<Object>} reviews - Reviews requiring analysis
 * @param {Object} options - Custom analyze function or inter-batch delay
 * @returns {Promise<Object>} Processed results, metrics, and duration
 */
const processInBatches = async (reviews, options = {}) => {
  const {
    analyzeFn = analyzeReviewWithGemini,
    batchSize = BATCH_SIZE,
    interBatchDelayMs = 200,
    onProgress = null,
  } = options;

  const startTime = Date.now();
  const chunks = chunkArray(reviews, batchSize);
  const allResults = [];

  console.log(`\n📦 Batch Processing: ${reviews.length} reviews divided into ${chunks.length} batches of ${batchSize}.`);

  for (let batchIdx = 0; batchIdx < chunks.length; batchIdx++) {
    const currentChunk = chunks[batchIdx];
    const batchNum = batchIdx + 1;

    console.log(`🚀 Executing Batch ${batchNum}/${chunks.length} (${currentChunk.length} reviews concurrently)...`);

    // Run the reviews in this chunk concurrently (max 5 simultaneous requests)
    const chunkPromises = currentChunk.map(async (review) => {
      const outcome = await executeWithBackoff(review, analyzeFn);
      return {
        ...review,
        ...outcome.analysis,
        analysisStatus: outcome.status,
        failureReason: outcome.failureReason || null,
        analysisAttempts: outcome.attempts,
      };
    });

    const chunkResults = await Promise.all(chunkPromises);
    allResults.push(...chunkResults);

    if (typeof onProgress === 'function') {
      onProgress({
        completed: allResults.length,
        total: reviews.length,
        batchNum,
        totalBatches: chunks.length,
      });
    }

    // Small inter-batch delay to respect API rate-window resets
    if (batchIdx < chunks.length - 1 && interBatchDelayMs > 0) {
      await sleep(interBatchDelayMs);
    }
  }

  const totalTimeMs = Date.now() - startTime;
  const successCount = allResults.filter((r) => r.analysisStatus === 'completed').length;
  const failedCount = allResults.filter((r) => r.analysisStatus === 'analysis_failed').length;

  console.log(`✅ Batch processing complete in ${(totalTimeMs / 1000).toFixed(2)}s: ${successCount} succeeded, ${failedCount} failed.\n`);

  return {
    results: allResults,
    metrics: {
      totalReviews: reviews.length,
      batchCount: chunks.length,
      batchSize,
      totalTimeMs,
      successCount,
      failedCount,
    },
  };
};

module.exports = {
  processInBatches,
  executeWithBackoff,
  calculateBackoffDelay,
  isRetryableError,
  chunkArray,
  sleep,
};
