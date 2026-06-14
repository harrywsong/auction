export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4001',
  wsUrl: import.meta.env.VITE_WS_URL || 'http://localhost:4001',
};

export const TIERS = ['1', '3', '4', '5', '6', '7', '8', '9', '10'];
export const BID_INCREMENTS = [5, 10, 25, 50, 100];
