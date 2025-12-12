// 🔒 DO NOT MODIFY THIS FILE
// This simulates a legacy 3rd party API that is slow and unstable.

let requestCount = 0;
const RESET_WINDOW = 500; // ms

// Reset rate limit counter periodically
setInterval(() => { requestCount = 0; }, RESET_WINDOW);

async function unstableRequest(endpoint) {
  // 1. Rate Limit Logic (Max 5 requests per 500ms)
  requestCount++;
  if (requestCount > 5) {
    throw new Error(`[${endpoint}] 429 Too Many Requests`);
  }

  // 2. Simulate Latency (Wait 500ms - 1500ms)
  const delay = 500 + Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));

  // 3. Random Failure Logic (30% chance to fail with 500 Error)
  if (Math.random() < 0.3) {
    throw new Error(`[${endpoint}] 500 Internal Server Error`);
  }

  return { 
    id: endpoint, 
    status: 'ok', 
    timestamp: Date.now() 
  };
}

module.exports = {
  fetchUserProfile: () => unstableRequest('UserProfile'),
  fetchOrders: () => unstableRequest('Orders'),
  fetchNotifications: () => unstableRequest('Notifications'),
};
