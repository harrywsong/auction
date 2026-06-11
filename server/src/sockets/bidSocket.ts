import { Server, Socket } from 'socket.io';
import * as sessionService from '../services/sessionService.js';
import * as bidService from '../services/bidService.js';
import * as auctionService from '../services/auctionService.js';
import * as timerService from '../services/timerService.js';

export function setupBidSocket(io: Server, socket: Socket) {
  socket.on('bid:submit', async (data, callback) => {
    try {
      const { auctionId, playerId, captainId, bidAmount } = data;

      if (!auctionId || !playerId || !captainId || bidAmount === undefined) {
        return callback({ error: 'Missing required fields' });
      }

      // Validate session
      const sessionToken = socket.handshake.auth.token;
      const session = await sessionService.getSessionByToken(sessionToken);

      if (!session || session.captain_id !== captainId) {
        return callback({ error: 'Unauthorized' });
      }

      // Get auction & captain & current player (to check tier)
      const auction = await auctionService.getAuction(auctionId);
      const captain = await bidService.getCaptain(captainId);
      const currentPlayer = await auctionService.getCurrentPlayer(auctionId);

      if (!auction || !captain) {
        return callback({ error: 'Auction or captain not found' });
      }
      if (!currentPlayer || currentPlayer.id !== playerId) {
        return callback({ error: 'This player is no longer up for auction' });
      }

      // Validate bid (includes tier-duplicate check)
      const validation = await bidService.validateBid(
        captain,
        auction.current_bid || 0,
        bidAmount,
        auction.bid_increment || 5,
        currentPlayer.tier,
        auctionId
      );

      if (!validation.valid) {
        return callback({ error: validation.error });
      }

      // Place bid
      const bid = await bidService.placeBid(auctionId, playerId, captainId, bidAmount);

      // Update auction state
      await auctionService.updateCurrentBid(auctionId, bidAmount, captainId);

      // Reset timer
      const timerState = timerService.resetTimer(auctionId, auction.timer_length);

      // Broadcast to all clients in auction room
      io.to(`auction:${auctionId}`).emit('bid:placed', {
        bid,
        captain: { id: captain.id, name: captain.name, currentPoints: captain.current_points },
        bidAmount,
        remainingTime: timerState?.remainingSeconds,
      });

      callback({ success: true, bid });
    } catch (error: any) {
      console.error('Bid error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('bid:getHistory', async (data, callback) => {
    try {
      const { auctionId, playerId, limit } = data;
      const history = await bidService.getBidHistory(auctionId, playerId, limit || 10);
      callback({ history });
    } catch (error: any) {
      callback({ error: error.message });
    }
  });
}
