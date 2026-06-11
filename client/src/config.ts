export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4001',
  wsUrl: import.meta.env.VITE_WS_URL || 'http://localhost:4001',
};

export const TIERS = ['A', 'B', 'C', 'D'];
export const BID_INCREMENTS = [5, 10, 25, 50, 100];
