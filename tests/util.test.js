const { sleep, retryWithBackoff } = require('../src/util');

describe('sleep()', () => {
  test('should delay execution for specified time', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;

    // Allow 50ms tolerance for timing variance
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(200);
  });
});

describe('retryWithBackoff()', () => {
  test('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should retry on 500 error and succeed', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockResolvedValue('success after retry');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('success after retry');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('should retry immediately on 500 error (no delay)', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockResolvedValue('success');

    const start = Date.now();
    await retryWithBackoff(fn);
    const elapsed = Date.now() - start;

    // 500 errors should retry immediately (< 50ms)
    expect(elapsed).toBeLessThan(50);
  });

  test('should apply exponential backoff on 429 rate limit', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('429 Too Many Requests'))
      .mockRejectedValueOnce(new Error('429 Too Many Requests'))
      .mockResolvedValue('success');

    const start = Date.now();
    await retryWithBackoff(fn, { baseDelay: 100 });
    const elapsed = Date.now() - start;

    // Should wait: 100ms (attempt 0) + 200ms (attempt 1) = 300ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(280); // Allow small tolerance
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('should throw after maxRetries exceeded', async () => {
    const error = new Error('500 Persistent Error');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      retryWithBackoff(fn, { maxRetries: 2 })
    ).rejects.toThrow('500 Persistent Error');

    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('should use default options when not provided', async () => {
    const error = new Error('Always fails');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(fn)).rejects.toThrow('Always fails');

    // Default maxRetries is 3: 1 initial + 3 retries = 4 calls
    expect(fn).toHaveBeenCalledTimes(4);
  });

  test('should respect custom maxRetries option', async () => {
    const error = new Error('Fails');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      retryWithBackoff(fn, { maxRetries: 1 })
    ).rejects.toThrow();

    expect(fn).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });
});

