/**
 * Delays execution for the specified milliseconds.
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff for rate limits.
 * - Error 500: Retry immediately (transient server error)
 * - Error 429: Apply exponential backoff (rate limit)
 * 
 * @param {() => Promise<T>} fn - The async function to retry
 * @param {Object} options - Configuration options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelay=100] - Base delay for backoff (ms)
 * @returns {Promise<T>}
 */
async function retryWithBackoff(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 100 } = options;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;

      // 429 Rate Limit → exponential backoff (100ms, 200ms, 400ms...)
      // 500 Server Error → immediate retry (no delay)
      const isRateLimited = error.message.includes('429');
      const delay = isRateLimited ? baseDelay * Math.pow(2, attempt) : 0;

      if (delay > 0) await sleep(delay);
    }
  }
  throw lastError;
}

module.exports = {
  sleep,
  retryWithBackoff,
};
