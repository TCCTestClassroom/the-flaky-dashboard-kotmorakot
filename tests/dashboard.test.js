const { loadDashboard } = require('../src/dashboard');

// Mock the API module to control behavior
jest.mock('../src/mock_api', () => ({
  fetchUserProfile: jest.fn(),
  fetchOrders: jest.fn(),
  fetchNotifications: jest.fn(),
}));

const api = require('../src/mock_api');

describe('loadDashboard()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return success with all data when APIs succeed', async () => {
    api.fetchUserProfile.mockResolvedValue({ id: 'user-1', name: 'Test User' });
    api.fetchOrders.mockResolvedValue({ id: 'orders', items: [] });
    api.fetchNotifications.mockResolvedValue({ id: 'notifications', count: 5 });

    const result = await loadDashboard();

    expect(result.success).toBe(true);
    expect(result.data.profile).toEqual({ id: 'user-1', name: 'Test User' });
    expect(result.data.orders).toEqual({ id: 'orders', items: [] });
    expect(result.data.notifications).toEqual({ id: 'notifications', count: 5 });
    expect(result.timeTaken).toBeGreaterThanOrEqual(0);
  });

  test('should call all 3 APIs in parallel (not sequentially)', async () => {
    const callOrder = [];

    api.fetchUserProfile.mockImplementation(async () => {
      callOrder.push('profile-start');
      await new Promise(r => setTimeout(r, 50));
      callOrder.push('profile-end');
      return { id: 'profile' };
    });

    api.fetchOrders.mockImplementation(async () => {
      callOrder.push('orders-start');
      await new Promise(r => setTimeout(r, 50));
      callOrder.push('orders-end');
      return { id: 'orders' };
    });

    api.fetchNotifications.mockImplementation(async () => {
      callOrder.push('notifications-start');
      await new Promise(r => setTimeout(r, 50));
      callOrder.push('notifications-end');
      return { id: 'notifications' };
    });

    await loadDashboard();

    // If parallel: all starts come before any ends
    // Sequential would be: start-end, start-end, start-end
    const startIndices = callOrder
      .map((c, i) => c.endsWith('-start') ? i : -1)
      .filter(i => i >= 0);

    const endIndices = callOrder
      .map((c, i) => c.endsWith('-end') ? i : -1)
      .filter(i => i >= 0);

    // All 3 should start before any finish (parallel execution)
    expect(Math.max(...startIndices)).toBeLessThan(Math.min(...endIndices));
  });

  test('should retry when API fails with 500 error', async () => {
    api.fetchUserProfile
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockResolvedValue({ id: 'profile' });
    api.fetchOrders.mockResolvedValue({ id: 'orders' });
    api.fetchNotifications.mockResolvedValue({ id: 'notifications' });

    const result = await loadDashboard();

    expect(result.success).toBe(true);
    expect(api.fetchUserProfile).toHaveBeenCalledTimes(2); // 1 fail + 1 success
  });

  test('should retry when API fails with 429 rate limit', async () => {
    api.fetchUserProfile.mockResolvedValue({ id: 'profile' });
    api.fetchOrders
      .mockRejectedValueOnce(new Error('429 Too Many Requests'))
      .mockResolvedValue({ id: 'orders' });
    api.fetchNotifications.mockResolvedValue({ id: 'notifications' });

    const result = await loadDashboard();

    expect(result.success).toBe(true);
    expect(api.fetchOrders).toHaveBeenCalledTimes(2);
  });

  test('should throw when API fails after all retries', async () => {
    const error = new Error('500 Persistent Error');
    api.fetchUserProfile.mockResolvedValue({ id: 'profile' });
    api.fetchOrders.mockRejectedValue(error); // Always fails
    api.fetchNotifications.mockResolvedValue({ id: 'notifications' });

    await expect(loadDashboard()).rejects.toThrow('500 Persistent Error');

    // Default 3 retries: 1 initial + 3 retries = 4 calls
    expect(api.fetchOrders).toHaveBeenCalledTimes(4);
  });

  test('should be significantly faster with parallel execution', async () => {
    const DELAY = 100;

    api.fetchUserProfile.mockImplementation(
      () => new Promise(r => setTimeout(() => r({ id: 'profile' }), DELAY))
    );
    api.fetchOrders.mockImplementation(
      () => new Promise(r => setTimeout(() => r({ id: 'orders' }), DELAY))
    );
    api.fetchNotifications.mockImplementation(
      () => new Promise(r => setTimeout(() => r({ id: 'notifications' }), DELAY))
    );

    const start = Date.now();
    await loadDashboard();
    const elapsed = Date.now() - start;

    // Parallel: ~100ms, Sequential would be: ~300ms
    // Allow tolerance, but should be less than 200ms (not 300ms)
    expect(elapsed).toBeLessThan(200);
  });
});

