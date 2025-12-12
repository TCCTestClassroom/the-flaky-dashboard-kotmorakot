const api = require('./mock_api');
const util = require('./util'); // You can implement helpers in util.js

async function loadDashboard() {
  console.log('--- Starting Dashboard Load ---');
  const start = Date.now();

  try {
    // PROBLEM 1: Sequential loading (Slow!)
    // If each request takes 1s, total time = 3s.
    const profile = await api.fetchUserProfile();
    const orders = await api.fetchOrders();
    const notifications = await api.fetchNotifications();

    // PROBLEM 2: No Error Handling
    // If 'fetchOrders' fails (which happens 30% of the time), 
    // the whole dashboard crashes and returns nothing.

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
