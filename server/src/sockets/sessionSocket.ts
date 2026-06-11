import { Server, Socket } from 'socket.io';
import * as sessionService from '../services/sessionService.js';
import * as bidService from '../services/bidService.js';
import * as auctionService from '../services/auctionService.js';
import { stopTimerBroadcast } from './auctionSocket.js';

export function setupSessionSocket(io: Server, socket: Socket) {
  // Join auction room — called explicitly by client after connecting
  socket.on('join:auction', (data) => {
    const { auctionId } = data || {};
    const roomId = auctionId || socket.handshake.auth.auctionId;
    if (roomId) {
      socket.join(`auction:${roomId}`);
      socket.data.auctionId = roomId;
    }
  });

  // Auto-join on connection using handshake auth
  const token = socket.handshake.auth.token;
  const auctionId = socket.handshake.auth.auctionId;

  if (auctionId) {
    // Always join the room immediately on connect
    socket.join(`auction:${auctionId}`);
    socket.data.auctionId = auctionId;
  }

  if (token) {
    // Validate captain session asynchronously
    sessionService.getSessionByToken(token).then(async (session) => {
      if (!session) return;
      await sessionService.markSessionConnected(session.id);
      const captain = await bidService.getCaptain(session.captain_id);
      if (!captain) return;
      socket.data.sessionId = session.id;
      socket.data.captainId = captain.id;
    }).catch((err) => {
      console.error('Session validation error:', err);
    });
  }

  socket.on('disconnect', async () => {
    try {
      if (socket.data.sessionId) {
        await sessionService.markSessionDisconnected(socket.data.sessionId);
      }
    } catch (error: any) {
      console.error('Disconnect error:', error);
    }
  });

  socket.on('client:heartbeat', async (data, callback) => {
    try {
      if (socket.data.sessionId) {
        await sessionService.updateLastHeartbeat(socket.data.sessionId);
        callback({ success: true });
      }
    } catch (error: any) {
      callback({ error: error.message });
    }
  });

  socket.on('client:reconnect', async (data, callback) => {
    try {
      const { captainId, auctionId } = data;

      const session = await sessionService.getActiveSession(captainId);

      if (!session) {
        return callback({ error: 'Session expired' });
      }

      await sessionService.markSessionConnected(session.id);

      const captain = await bidService.getCaptain(captainId);
      const auction = await auctionService.getAuction(auctionId);

      socket.data.sessionId = session.id;
      socket.data.captainId = captain.id;
      socket.data.auctionId = auctionId;

      callback({
        success: true,
        captain,
        auction,
        message: 'Reconnected successfully',
      });
    } catch (error: any) {
      callback({ error: error.message });
    }
  });
}
