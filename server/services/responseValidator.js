/**
 * responseValidator.js - AI Response Schema Validation and Retry Controller
 *
 * Requirements addressed:
 * - Validate every AI response against the expected schema
 * - Reject invalid JSON
 * - Reject unsupported sentiment values
 * - Reject unsupported topics
 * - Retry invalid structured responses once (AI_VALIDATION_RETRIES = 1)
 * - Mark the review as analysis_failed if the second attempt fails
 * - Never crash the application because of an invalid AI response
 */

const { ALLOWED_SENTIMENTS, ALLOWED_TOPICS, AI_VALIDATION_RETRIES } = require('../utils/constants');

/**
 * Validates a raw response or parsed object from Gemini against the required schema
 * @param {any} rawResponse - String or Object received from AI
 * @returns {Object} { isValid: boolean, data?: Object, errors: string[] }
 */
const validateAIResponse = (rawResponse) => {
  const errors = [];
  let parsed = rawResponse;

  // 1. JSON Parsing Check
  if (typeof rawResponse === 'string') {
    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseErr) {
      return {
        isValid: false,
        errors: [`Invalid JSON format: ${parseErr.message}`],
      };
    }
  }

  // 2. Structural Root Check
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      errors: ['AI response root must be a valid JSON object.'],
    };
  }

  // 3. Sentiment Validation
  if (!parsed.sentiment || typeof parsed.sentiment !== 'string') {
    errors.push("Missing or non-string 'sentiment' field.");
  } else {
    const normalizedSentiment = parsed.sentiment.toLowerCase().trim();
    if (!ALLOWED_SENTIMENTS.includes(normalizedSentiment)) {
      errors.push(
        `Unsupported sentiment "${parsed.sentiment}". Allowed: ${ALLOWED_SENTIMENTS.join(', ')}.`
      );
    } else {
      parsed.sentiment = normalizedSentiment;
    }
  }

  // 4. Topics Validation
  if (!parsed.topics || !Array.isArray(parsed.topics)) {
    errors.push("Field 'topics' must be an array of strings.");
  } else {
    const invalidTopics = parsed.topics.filter(
      (topic) => typeof topic !== 'string' || !ALLOWED_TOPICS.includes(topic.toLowerCase().trim())
    );
    if (invalidTopics.length > 0) {
      errors.push(
        `Unsupported topics found: [${invalidTopics.join(', ')}]. Allowed: ${ALLOWED_TOPICS.join(', ')}.`
      );
    } else {
      parsed.topics = parsed.topics.map((t) => t.toLowerCase().trim());
    }
  }

  // 5. Summary Validation
  if (typeof parsed.summary !== 'string' || parsed.summary.trim().length === 0) {
    errors.push("Field 'summary' must be a non-empty string.");
  } else {
    parsed.summary = parsed.summary.trim();
  }

  // 6. Needs Reply Validation
  if (typeof parsed.needs_reply !== 'boolean') {
    errors.push("Field 'needs_reply' must be a boolean (true or false).");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      sentiment: parsed.sentiment,
      topics: parsed.topics,
      summary: parsed.summary,
      needs_reply: parsed.needs_reply,
    },
    errors: [],
  };
};

/**
 * Executes review analysis with automatic single-retry on schema validation failure
 * Guarantees zero application crashes: returns analysis_failed if both attempts fail
 *
 * @param {Object} review - Review record to analyze
 * @param {Function} aiAnalyzeFn - Async function calling Gemini AI
 * @param {number} maxRetries - Maximum retry count (default: 1 as required by assessment)
 * @returns {Promise<Object>} Validated analysis or analysis_failed object
 */
const analyzeWithValidationAndRetry = async (
  review,
  aiAnalyzeFn,
  maxRetries = AI_VALIDATION_RETRIES
) => {
  let attempt = 0;
  let lastErrors = [];

  while (attempt <= maxRetries) {
    attempt++;

    try {
      // Dispatch analysis call
      const rawResult = await aiAnalyzeFn(review);

      // Validate against strict schema
      const validation = validateAIResponse(rawResult);

      if (validation.isValid) {
        return {
          status: 'completed',
          analysis: validation.data,
          attempts: attempt,
        };
      }

      // Record validation failure
      lastErrors = validation.errors;
      console.warn(
        `⚠️ AI Response validation failed on attempt ${attempt} for review "${review.reviewId || 'unknown'}": ${lastErrors.join('; ')}`
      );

      // If we have retries left, loop to try once more
      if (attempt <= maxRetries) {
        console.log(`🔄 Retrying AI review analysis for "${review.reviewId || 'unknown'}" (Attempt ${attempt + 1}/${maxRetries + 1})...`);
      }
    } catch (err) {
      lastErrors = [err.message || 'Unknown network or API error'];
      console.warn(
        `⚠️ API error on attempt ${attempt} for review "${review.reviewId || 'unknown'}": ${err.message}`
      );
    }
  }

  // If both attempts fail: Never crash the application!
  console.error(
    `❌ Review analysis failed after ${maxRetries + 1} attempts for review "${review.reviewId || 'unknown'}". Marking as analysis_failed.`
  );

  return {
    status: 'analysis_failed',
    failureReason: lastErrors.join(' | '),
    analysis: null,
    attempts: attempt,
  };
};

module.exports = {
  validateAIResponse,
  analyzeWithValidationAndRetry,
};
