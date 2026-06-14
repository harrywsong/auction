import { Server, Socket } from 'socket.io';
import * as auctionService from '../services/auctionService.js';
import * as timerService from '../services/timerService.js';
import { AuctionStatus } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

// ── System announcement helper ────────────────────────────────────────────────

function systemAnnounce(io: Server, auctionId: string, text: string) {
  io.to(`auction:${auctionId}`).emit('chat:message', {
    id: uuidv4(),
    senderName: '🔔 System',
    role: 'system',
    text,
    timestamp: new Date(),
  });
}

// ── Normalizers ───────────────────────────────────────────────────────────────

export const normalizePlayer = (row: any) => ({
  id: row.id,
  auctionId: row.auction_id,
  name: row.name,
  riotId: row.riot_id,
  tier: row.tier,
  role: row.role,
  peakTier: row.peak_tier ?? '',
  currentTier: row.current_tier ?? '',
  status: row.status,
  assignedCaptainId: row.assigned_captain_id,
  pointsSpent: row.points_spent,
  createdAt: row.created_at,
});

const normalizeCaptain = (row: any) => ({
  id: row.id,
  auctionId: row.auction_id,
  name: row.name,
  startingPoints: row.starting_points,
  currentPoints: row.current_points,
  createdAt: row.created_at,
});

// ── Full state snapshot ───────────────────────────────────────────────────────

export async function getFullState(auctionId: string) {
  const { query } = await import('../database.js');
  const captainsRaw = await auctionService.getAllCaptains(auctionId);

  const soldRes = await query(
    `SELECT * FROM players WHERE auction_id = $1 AND status = 'sold'`,
    [auctionId]
  );
  const upNextRes = await query(
    `SELECT * FROM players WHERE auction_id = $1 AND status = 'pending'
     ORDER BY created_at ASC LIMIT 5`,
    [auctionId]
  );
  const reserveRes = await query(
    `SELECT p.* FROM players p
     JOIN passed_players pp ON p.id = pp.player_id
     WHERE p.auction_id = $1
     ORDER BY pp.pass_count ASC, pp.created_at ASC`,
    [auctionId]
  );

  return {
    captains: captainsRaw.map(normalizeCaptain),
    soldPlayers: soldRes.rows.map(normalizePlayer),
    upNext: upNextRes.rows.map(normalizePlayer),
    reserve: reserveRes.rows.map(normalizePlayer),
  };
}

// ── Timer-expire handler (runs server-side when timer hits 0) ─────────────────

/**
 * Called when the timer for the current player expires.
 * - If someone bid → sell to highest bidder, deduct points.
 * - If nobody bid → move to reserve.
 * Then checks if all teams are full (auction over) or auto-assigns if last of tier.
 * Then activates the next player.
 */
async function handleTimerExpired(io: Server, auctionId: string, fromReserve: boolean) {
  const auction = await auctionService.getAuction(auctionId);
  if (!auction) return;

  stopTimerBroadcast(auctionId);

  // Grab the current player before resolving so we can name them in announcements
  const currentPlayerRaw = await auctionService.getCurrentPlayer(auctionId);
  const leaderId: string | null = auction.current_leader_id;
  const bidAmount: number = auction.current_bid || 0;

  if (leaderId && bidAmount > 0) {
    // Sell to highest bidder
    await auctionService.assignPlayerToCaptain(auctionId, leaderId, bidAmount);
    const soldState = await getFullState(auctionId);

    // Find captain name for announcement
    const winningCaptain = soldState.captains.find((c: any) => c.id === leaderId);
    const playerName = currentPlayerRaw?.name ?? 'Unknown';
    const playerTier = currentPlayerRaw?.tier ?? '';
    const captainName = winningCaptain?.name ?? 'Unknown';

    systemAnnounce(io, auctionId,
      `🏆 [${playerTier}] ${playerName} sold to ${captainName} for ${bidAmount} pts!`
    );

    io.to(`auction:${auctionId}`).emit('player:sold', {
      captainId: leaderId,
      bidAmount,
      ...soldState,
    });
  } else {
    // No bids — check if this player should be auto-assigned before moving to reserve
    const autoAssign = await auctionService.checkAutoAssign(auctionId, currentPlayerRaw?.tier, currentPlayerRaw?.id);
    if (autoAssign) {
      await auctionService.assignPlayerToCaptain(auctionId, autoAssign.captainId, 0);
      const assignedState = await getFullState(auctionId);
      const assignedCaptain = assignedState.captains.find((c: any) => c.id === autoAssign.captainId);
      const playerName = currentPlayerRaw?.name ?? 'Unknown';
      const playerTier = currentPlayerRaw?.tier ?? '';

      systemAnnounce(io, auctionId,
        `🤖 [${playerTier}] ${playerName} auto-assigned to ${assignedCaptain?.name ?? 'Unknown'} (last of their tier, no bids).`
      );
      io.to(`auction:${auctionId}`).emit('player:autoAssigned', {
        player: { ...normalizePlayer(currentPlayerRaw), assignedCaptainId: autoAssign.captainId, status: 'sold' },
        captainId: autoAssign.captainId,
        ...assignedState,
      });
    } else {
      // Genuinely no bids and no auto-assign — move to reserve
      await auctionService.moveCurrentToReserve(auctionId);
      const playerName = currentPlayerRaw?.name ?? 'Unknown';
      systemAnnounce(io, auctionId,
        `⏩ No bids for ${playerName} — moved to reserve.`
      );
      io.to(`auction:${auctionId}`).emit('player:noSale', {});

      // If in the reserve round, check whether every remaining reserve player has
      // already been passed at least once in this round (pass_count >= 2 means they
      // were in the original reserve AND have just been passed again). If so, the
      // entire reserve has been cycled with no bids — but before ending, auto-assign
      // any reserve players that qualify (last of their tier, exactly one team needs them).
      if (fromReserve) {
        const { query } = await import('../database.js');
        const unsoldReserve = await query(
          `SELECT pp.pass_count FROM passed_players pp
           JOIN players p ON p.id = pp.player_id
           WHERE p.auction_id = $1`,
          [auctionId]
        );
        // If every player left in reserve has been passed more than once (pass_count > 1),
        // the whole reserve has been offered and nobody bid — declare exhausted.
        const allCycled = unsoldReserve.rows.length > 0 &&
          unsoldReserve.rows.every((r: any) => parseInt(r.pass_count, 10) > 1);

        if (allCycled) {
          // Before ending, drain any reserve players that qualify for auto-assign
          await autoAssignRemainingReserve(io, auctionId);

          // Re-check if all teams are now full after auto-assigns
          if (await auctionService.areAllTeamsFull(auctionId)) {
            await auctionService.updateAuctionStatus(auctionId, AuctionStatus.FINISHED);
            const state = await getFullState(auctionId);
            systemAnnounce(io, auctionId, '🎉 All teams are full — auction complete!');
            io.to(`auction:${auctionId}`).emit('auction:finished', { auctionId, ...state });
            return;
          }

          const state = await getFullState(auctionId);
          systemAnnounce(io, auctionId, '⚠️ All reserve players have been offered with no bids. Auction ending.');
          io.to(`auction:${auctionId}`).emit('queue:exhausted', {
            auctionId,
            exhaustedQueue: 'reserve',
            ...state,
          });
          await auctionService.updateAuctionStatus(auctionId, AuctionStatus.FINISHED);
          io.to(`auction:${auctionId}`).emit('auction:finished', { auctionId, ...state });
          return;
        }
      }
    }
  }

  // Check if all teams full
  if (await auctionService.areAllTeamsFull(auctionId)) {
    await auctionService.updateAuctionStatus(auctionId, AuctionStatus.FINISHED);
    const state = await getFullState(auctionId);
    systemAnnounce(io, auctionId, '🎉 All teams are full — auction complete!');
    io.to(`auction:${auctionId}`).emit('auction:finished', { auctionId, ...state });
    return;
  }

  // Store the queue context for the next player before activating
  currentFromReserve.set(auctionId, fromReserve);
  await activateNext(io, auctionId, fromReserve);
}

/**
 * After the reserve round exhausts with no bids, iterate over all remaining
 * reserve players and auto-assign any that qualify (last of their tier, exactly
 * one team needs them). Emits player:autoAssigned for each one assigned.
 */
async function autoAssignRemainingReserve(io: Server, auctionId: string) {
  const { query } = await import('../database.js');

  // Loop until no more auto-assigns are possible
  let assigned = true;
  while (assigned) {
    assigned = false;

    // Fetch all players still in reserve, ordered by pass_count then creation time
    const reserveRes = await query(
      `SELECT p.* FROM players p
       JOIN passed_players pp ON p.id = pp.player_id
       WHERE p.auction_id = $1 AND p.status = 'passed'
       ORDER BY pp.pass_count ASC, pp.created_at ASC`,
      [auctionId]
    );

    for (const playerRow of reserveRes.rows) {
      const autoAssign = await auctionService.checkAutoAssign(auctionId, playerRow.tier, playerRow.id);
      if (!autoAssign) continue;

      // Temporarily set to 'current' so assignPlayerToCaptain can find and update it
      await query(`UPDATE players SET status = 'current' WHERE id = $1`, [playerRow.id]);
      await auctionService.assignPlayerToCaptain(auctionId, autoAssign.captainId, 0);

      const state = await getFullState(auctionId);
      const assignedCaptain = state.captains.find((c: any) => c.id === autoAssign.captainId);
      const playerName = playerRow.name ?? 'Unknown';
      const playerTier = playerRow.tier ?? '';

      systemAnnounce(io, auctionId,
        `🤖 [${playerTier}] ${playerName} auto-assigned to ${assignedCaptain?.name ?? 'Unknown'} (last of their tier).`
      );
      io.to(`auction:${auctionId}`).emit('player:autoAssigned', {
        player: { ...normalizePlayer(playerRow), assignedCaptainId: autoAssign.captainId, status: 'sold' },
        captainId: autoAssign.captainId,
        ...state,
      });

      assigned = true;
      break; // restart the loop so remaining counts are recalculated
    }
  }
}

/**
 * Activate the next player from the appropriate queue, handling auto-assign.
 * Emits player:updated or queue:exhausted or player:autoAssigned.
 */
async function activateNext(io: Server, auctionId: string, fromReserve: boolean) {
  const auction = await auctionService.getAuction(auctionId);
  if (!auction) return;

  // Pick next player from pending or reserve based on context
  const nextRaw = fromReserve
    ? await auctionService.activateNextReservePlayer(auctionId)
    : await auctionService.activateNextPendingPlayer(auctionId);

  if (!nextRaw) {
    // This queue is empty
    const state = await getFullState(auctionId);
    io.to(`auction:${auctionId}`).emit('queue:exhausted', {
      auctionId,
      exhaustedQueue: fromReserve ? 'reserve' : 'regular',
      ...state,
    });
    return;
  }

  const next = normalizePlayer(nextRaw);

  // Check auto-assign: last player of their tier with exactly one team needing it
  const autoAssign = await auctionService.checkAutoAssign(auctionId, next.tier, nextRaw.id);
  if (autoAssign) {
    // Auto-assign for 0 points — no bidding round
    await auctionService.assignPlayerToCaptain(auctionId, autoAssign.captainId, 0);

    if (await auctionService.areAllTeamsFull(auctionId)) {
      await auctionService.updateAuctionStatus(auctionId, AuctionStatus.FINISHED);
      const state = await getFullState(auctionId);
      systemAnnounce(io, auctionId, '🎉 All teams are full — auction complete!');
      io.to(`auction:${auctionId}`).emit('auction:finished', { auctionId, ...state });
      return;
    }

    const state = await getFullState(auctionId);
    const assignedCaptain = state.captains.find((c: any) => c.id === autoAssign.captainId);
    systemAnnounce(io, auctionId,
      `🤖 [${next.tier}] ${next.name} auto-assigned to ${assignedCaptain?.name ?? 'Unknown'} (last of their tier).`
    );
    io.to(`auction:${auctionId}`).emit('player:autoAssigned', {
      player: { ...next, assignedCaptainId: autoAssign.captainId },
      captainId: autoAssign.captainId,
      ...state,
    });

    // Immediately continue to the next player
    await activateNext(io, auctionId, fromReserve);
    return;
  }

  // Normal auction round — show player but wait for admin to start timer
  const timerLength = auction.timer_length || 20;
  const state = await getFullState(auctionId);

  systemAnnounce(io, auctionId,
    `🎯 Now up for auction: [${next.tier}] ${next.name} (${next.riotId})`
  );

  io.to(`auction:${auctionId}`).emit('player:updated', {
    currentPlayer: next,
    timerState: { remainingSeconds: timerLength, timerLength, isRunning: false },
    auctionId,
    ...state,
  });
}

// ── Socket handlers ───────────────────────────────────────────────────────────

// Track whether the current player for each auction came from the reserve queue
const currentFromReserve = new Map<string, boolean>();

export function setupAuctionSocket(io: Server, socket: Socket) {

  // Admin: start regular auction (first pending player)
  socket.on('admin:startRegular', async (data, callback) => {
    try {
      const { auctionId } = data;
      const auction = await auctionService.getAuction(auctionId);
      if (!auction) return callback({ error: 'Auction not found' });

      await auctionService.updateAuctionStatus(auctionId, AuctionStatus.LIVE);
      systemAnnounce(io, auctionId, '🚀 The auction has started! Get ready to bid.');
      currentFromReserve.set(auctionId, false);
      await activateNext(io, auctionId, false);
      callback({ success: true });
    } catch (error: any) {
      callback({ error: error.message });
    }
  });

  // Admin: start reserve round (first reserve player)
  socket.on('admin:startReserve', async (data, callback) => {
    try {
      const { auctionId } = data;
      const auction = await auctionService.getAuction(auctionId);
      if (!auction) return callback({ error: 'Auction not found' });

      systemAnnounce(io, auctionId, '🔄 Reserve round has begun!');
      currentFromReserve.set(auctionId, true);
      await activateNext(io, auctionId, true);
      callback({ success: true });
    } catch (error: any) {
      callback({ error: error.message });
    }
  });

  // Admin: manually start the timer for the current player on the block
  socket.on('admin:startTimer', async (data, callback) => {
    try {
      const { auctionId } = data;
      const auction = await auctionService.getAuction(auctionId);
      if (!auction) return callback?.({ error: 'Auction not found' });

      const fromReserve = currentFromReserve.get(auctionId) ?? false;
      const timerState = timerService.startTimer(auctionId, auction.timer_length || 20);

      systemAnnounce(io, auctionId, `⏱ Bidding is open! ${auction.timer_length || 20} seconds on the clock.`);

      io.to(`auction:${auctionId}`).emit('timer:started', {
        auctionId,
        timerState,
      });

      startTimerBroadcast(io, auctionId, fromReserve);
      callback?.({ success: true });
    } catch (error: any) {
      callback?.({ error: error.message });
    }
  });
}

// ── Timer broadcast ───────────────────────────────────────────────────────────

const timerBroadcastIntervals = new Map<string, NodeJS.Timeout>();
// Track whether each active broadcast is for reserve or regular
const timerBroadcastFromReserve = new Map<string, boolean>();

function startTimerBroadcast(io: Server, auctionId: string, fromReserve: boolean) {
  if (timerBroadcastIntervals.has(auctionId)) {
    clearInterval(timerBroadcastIntervals.get(auctionId));
  }

  timerBroadcastFromReserve.set(auctionId, fromReserve);

  const intervalId = setInterval(async () => {
    const timerState = timerService.getTimerState(auctionId);

    if (!timerState || !timerState.isRunning) {
      clearInterval(intervalId);
      timerBroadcastIntervals.delete(auctionId);

      // Timer expired — auto-resolve
      io.to(`auction:${auctionId}`).emit('timer:finished', { auctionId });
      const isReserve = timerBroadcastFromReserve.get(auctionId) ?? false;
      timerBroadcastFromReserve.delete(auctionId);
      await handleTimerExpired(io, auctionId, isReserve);
      return;
    }

    io.to(`auction:${auctionId}`).emit('timer:tick', {
      auctionId,
      remainingSeconds: timerState.remainingSeconds,
      timerLength: timerState.timerLength,
    });
  }, 100);

  timerBroadcastIntervals.set(auctionId, intervalId);
}

export function stopTimerBroadcast(auctionId: string) {
  if (timerBroadcastIntervals.has(auctionId)) {
    clearInterval(timerBroadcastIntervals.get(auctionId));
    timerBroadcastIntervals.delete(auctionId);
  }
}
