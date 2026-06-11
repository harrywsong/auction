import { query } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { AuctionStatus, PlayerStatus, Auction, Captain } from '../types.js';

// ── Basic CRUD ────────────────────────────────────────────────────────────────

export async function createAuction(name: string) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO auctions (id, name, status, bid_increment, timer_length, current_bid)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, name, AuctionStatus.SETUP, 5, 30, 0]
  );
  return result.rows[0];
}

export async function getAuction(auctionId: string) {
  const result = await query('SELECT * FROM auctions WHERE id = $1', [auctionId]);
  return result.rows[0];
}

export async function updateAuctionStatus(auctionId: string, status: AuctionStatus) {
  const result = await query(
    `UPDATE auctions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, auctionId]
  );
  return result.rows[0];
}

export async function updateCurrentBid(
  auctionId: string,
  bidAmount: number,
  leaderId: string | null
) {
  const result = await query(
    `UPDATE auctions SET current_bid = $1, current_leader_id = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [bidAmount, leaderId, auctionId]
  );
  return result.rows[0];
}

export async function updateTimerLength(auctionId: string, timerLength: number) {
  const result = await query(
    `UPDATE auctions SET timer_length = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [timerLength, auctionId]
  );
  return result.rows[0];
}

export async function updateBidIncrement(auctionId: string, bidIncrement: number) {
  const result = await query(
    `UPDATE auctions SET bid_increment = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [bidIncrement, auctionId]
  );
  return result.rows[0];
}

export async function getCurrentPlayer(auctionId: string) {
  const result = await query(
    `SELECT * FROM players WHERE auction_id = $1 AND status = 'current' LIMIT 1`,
    [auctionId]
  );
  return result.rows[0] || null;
}

export async function getNextPendingPlayer(auctionId: string) {
  const result = await query(
    `SELECT * FROM players WHERE auction_id = $1 AND status = 'pending' ORDER BY created_at ASC LIMIT 1`,
    [auctionId]
  );
  return result.rows[0] || null;
}

export async function getAllCaptains(auctionId: string) {
  const result = await query(
    'SELECT * FROM captains WHERE auction_id = $1 ORDER BY created_at ASC',
    [auctionId]
  );
  return result.rows;
}

export async function getAllPlayers(auctionId: string) {
  const result = await query(
    'SELECT * FROM players WHERE auction_id = $1 ORDER BY created_at ASC',
    [auctionId]
  );
  return result.rows;
}

export async function getPlayersByTeam(auctionId: string, captainId: string) {
  const result = await query(
    `SELECT * FROM players WHERE auction_id = $1 AND assigned_captain_id = $2
     ORDER BY tier ASC, created_at ASC`,
    [auctionId, captainId]
  );
  return result.rows;
}

export async function getAuctionSummary(auctionId: string) {
  const captains = await getAllCaptains(auctionId);
  const players = await getAllPlayers(auctionId);
  const teamBreakdown = await Promise.all(
    captains.map(async (captain: Captain) => ({
      captain,
      players: await getPlayersByTeam(auctionId, captain.id),
    }))
  );
  return { captains, players, teamBreakdown };
}

// ── Team fullness check ───────────────────────────────────────────────────────

const TEAM_SLOTS = 9; // player slots per team (excluding captain)

export async function areAllTeamsFull(auctionId: string): Promise<boolean> {
  const captains = await getAllCaptains(auctionId);
  for (const captain of captains) {
    const players = await getPlayersByTeam(auctionId, captain.id);
    if (players.length < TEAM_SLOTS) return false;
  }
  return true;
}

// ── Tier auto-assign logic ────────────────────────────────────────────────────

/**
 * Check if a player should be auto-assigned because they are the last player
 * of their tier available (pending + reserve) and exactly one team needs that tier.
 * Returns { captainId } if auto-assign should happen, null otherwise.
 */
export async function checkAutoAssign(
  auctionId: string,
  playerTier: string,
  excludePlayerId?: string
): Promise<{ captainId: string } | null> {
  // Count remaining players of this tier (pending + passed/reserve, excluding current player)
  const remainingRes = await query(
    `SELECT COUNT(*) as cnt FROM players
     WHERE auction_id = $1 AND tier = $2 AND status IN ('pending','passed','current')
     AND id != $3`,
    [auctionId, playerTier, excludePlayerId || '']
  );
  const remaining = parseInt(remainingRes.rows[0].cnt, 10);

  // If there are still more players of this tier in the pool, no auto-assign
  if (remaining > 0) return null;

  // Find teams that don't yet have this tier
  const captains = await getAllCaptains(auctionId);
  const teamsNeedingTier: string[] = [];

  for (const captain of captains) {
    const teamPlayers = await getPlayersByTeam(auctionId, captain.id);
    const hasTier = teamPlayers.some((p: any) => p.tier === playerTier);
    const isFull = teamPlayers.length >= TEAM_SLOTS;
    if (!hasTier && !isFull) {
      teamsNeedingTier.push(captain.id);
    }
  }

  // Auto-assign only if exactly one team needs this tier
  if (teamsNeedingTier.length === 1) {
    return { captainId: teamsNeedingTier[0] };
  }

  return null;
}

// ── Sell / assign player ──────────────────────────────────────────────────────

/**
 * Assign the current player to a captain (0 or bid cost), deduct points.
 * Returns the updated captain row.
 */
export async function assignPlayerToCaptain(
  auctionId: string,
  captainId: string,
  bidAmount: number
) {
  // Get the current player id before updating status
  const currentRes = await query(
    `SELECT id FROM players WHERE auction_id = $1 AND status = 'current' LIMIT 1`,
    [auctionId]
  );
  const currentPlayerId = currentRes.rows[0]?.id;

  // Mark player sold and assigned
  await query(
    `UPDATE players
     SET status = 'sold', assigned_captain_id = $1, points_spent = $2
     WHERE auction_id = $3 AND status = 'current'`,
    [captainId, bidAmount, auctionId]
  );

  // Remove from reserve tracking if they were ever passed
  if (currentPlayerId) {
    await query(`DELETE FROM passed_players WHERE player_id = $1`, [currentPlayerId]);
  }

  // Deduct points from captain
  await query(
    `UPDATE captains SET current_points = current_points - $1 WHERE id = $2`,
    [bidAmount, captainId]
  );

  return await query('SELECT * FROM captains WHERE id = $1', [captainId]).then(
    (r) => r.rows[0]
  );
}

// ── Move to reserve ───────────────────────────────────────────────────────────

export async function moveCurrentToReserve(auctionId: string) {
  const current = await getCurrentPlayer(auctionId);
  if (!current) return;

  await query(
    `UPDATE players SET status = 'passed' WHERE id = $1`,
    [current.id]
  );

  const existing = await query(
    `SELECT * FROM passed_players WHERE player_id = $1`,
    [current.id]
  );

  if (existing.rows.length === 0) {
    // First time this player is passed
    await query(
      `INSERT INTO passed_players (id, auction_id, player_id, pass_count)
       VALUES ($1, $2, $3, 1)`,
      [uuidv4(), auctionId, current.id]
    );
  } else {
    // Was activated from reserve and got no bids again — push to back of queue
    await query(
      `UPDATE passed_players SET pass_count = pass_count + 1 WHERE player_id = $1`,
      [current.id]
    );
  }
}

// ── Activate next player ──────────────────────────────────────────────────────

/**
 * Pull the next player from pending queue, set as current.
 * Returns the player row or null if queue is empty.
 */
export async function activateNextPendingPlayer(auctionId: string) {
  const next = await getNextPendingPlayer(auctionId);
  if (!next) return null;
  await query(`UPDATE players SET status = 'current' WHERE id = $1`, [next.id]);
  await updateCurrentBid(auctionId, 0, null);
  return next;
}

/**
 * Pull the next player from reserve (passed_players), set as current.
 * Returns the player row or null if reserve is empty.
 * NOTE: We do NOT delete from passed_players here — the row stays so ordering
 * is preserved if the player gets no bids and goes back to reserve.
 * The passed_players row is only removed when the player is actually sold.
 */
export async function activateNextReservePlayer(auctionId: string) {
  const reserveRes = await query(
    `SELECT p.* FROM players p
     JOIN passed_players pp ON p.id = pp.player_id
     WHERE p.auction_id = $1 AND p.status = 'passed'
     ORDER BY pp.pass_count ASC, pp.created_at ASC LIMIT 1`,
    [auctionId]
  );
  if (reserveRes.rows.length === 0) return null;

  const player = reserveRes.rows[0];
  await query(`UPDATE players SET status = 'current' WHERE id = $1`, [player.id]);
  // Leave the passed_players row intact — removed only on sale
  await updateCurrentBid(auctionId, 0, null);
  return player;
}

// Legacy kept for compatibility
export async function passCurrentPlayer(auctionId: string) {
  await moveCurrentToReserve(auctionId);
  return await activateNextPendingPlayer(auctionId);
}

export async function advanceToNextPlayer(
  auctionId: string,
  currentLeaderId: string | null
) {
  if (currentLeaderId) {
    await assignPlayerToCaptain(auctionId, currentLeaderId, 0);
  } else {
    await moveCurrentToReserve(auctionId);
  }
  return await activateNextPendingPlayer(auctionId);
}
