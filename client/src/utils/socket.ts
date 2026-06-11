import { io, Socket } from 'socket.io-client';
import { config } from '../config';

let socket: Socket | null = null;
let currentAuctionId: string | null = null;
let currentToken: string | null = null;

export function initializeSocket(auctionId: string, token?: string): Socket {
  const tokenVal = token || '';

  // Reuse only if same auction + same token
  if (socket && socket.connected && currentAuctionId === auctionId && currentToken === tokenVal) {
    return socket;
  }

  // Disconnect stale socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentAuctionId = auctionId;
  currentToken = tokenVal;

  socket = io(config.wsUrl, {
    auth: {
      token: tokenVal,
      auctionId,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentAuctionId = null;
  currentToken = null;
}
