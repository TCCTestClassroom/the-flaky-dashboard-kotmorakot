const api = require('./mock_api');
const util = require('./util'); // You can implement helpers in util.js

async function loadDashboard() {
  console.log('--- Starting Dashboard Load ---');
  const start = Date.now();

  try {
    // SOLUTION: Parallel loading with retry
    // - All 3 requests run concurrently (time = max of 3, not sum)
    // - Each request has independent retry logic with backoff
    const [profile, orders, notifications] = await Promise.all([
      util.retryWithBackoff(() => api.fetchUserProfile()),
      util.retryWithBackoff(() => api.fetchOrders()),
      util.retryWithBackoff(() => api.fetchNotifications()),
    ]);

    return {
      success: true,
      data: { profile, orders, notifications },
      timeTaken: Date.now() - start
    };

  } catch (error) {
    console.error('Dashboard crashed:', error.message);
    // Returning null means the user sees a blank screen!
    throw error;
  }
}

module.exports = { loadDashboard };
