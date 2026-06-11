import { query } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

export async function addCaptain(
  auctionId: string,
  name: string,
  startingPoints: number
) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO captains (id, auction_id, name, starting_points, current_points)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, auctionId, name, startingPoints, startingPoints]
  );
  return result.rows[0];
}

export async function getCaptain(captainId: string) {
  const result = await query('SELECT * FROM captains WHERE id = $1', [captainId]);
  return result.rows[0] || null;
}

export async function getCaptainByAuction(auctionId: string, captainId: string) {
  const result = await query(
    'SELECT * FROM captains WHERE id = $1 AND auction_id = $2',
    [captainId, auctionId]
  );
  return result.rows[0] || null;
}

export async function updateCaptainPoints(captainId: string, points: number) {
  const result = await query(
    `UPDATE captains SET current_points = $1 WHERE id = $2 RETURNING *`,
    [points, captainId]
  );
  return result.rows[0];
}

export async function addPlayer(
  auctionId: string,
  name: string,
  riotId: string,
  tier: 'A' | 'B' | 'C' | 'D' | 'E',
  role: string
) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO players (id, auction_id, name, riot_id, tier, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, auctionId, name, riotId, tier, role, 'pending']
  );
  return result.rows[0];
}

export async function getPlayer(playerId: string) {
  const result = await query('SELECT * FROM players WHERE id = $1', [playerId]);
  return result.rows[0] || null;
}

export async function placeBid(
  auctionId: string,
  playerId: string,
  captainId: string,
  bidAmount: number
) {
  const id = uuidv4();
  const result = await query(
    `INSERT INTO bids (id, auction_id, player_id, captain_id, amount)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, auctionId, playerId, captainId, bidAmount]
  );
  return result.rows[0];
}

export async function getLastBid(auctionId: string, playerId: string) {
  const result = await query(
    `SELECT * FROM bids WHERE auction_id = $1 AND player_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [auctionId, playerId]
  );
  return result.rows[0] || null;
}

export async function getBidHistory(auctionId: string, playerId: string, limit: number = 10) {
  const result = await query(
    `SELECT b.*, c.name as captain_name FROM bids b
     JOIN captains c ON b.captain_id = c.id
     WHERE b.auction_id = $1 AND b.player_id = $2
     ORDER BY b.created_at DESC LIMIT $3`,
    [auctionId, playerId, limit]
  );
  return result.rows;
}

export async function validateBid(
  captain: any,
  currentBidAmount: number,
  bidAmount: number,
  bidIncrement: number,
  playerTier: string,
  auctionId: string
): Promise<{ valid: boolean; error?: string }> {
  if (bidAmount <= 0) {
    return { valid: false, error: 'Bid must be greater than 0' };
  }
  if (captain.current_points < bidAmount) {
    return { valid: false, error: 'Insufficient points for this bid' };
  }
  if (bidAmount <= currentBidAmount) {
    return { valid: false, error: 'Bid must be higher than current bid' };
  }

  // Check duplicate tier on this captain's team
  const { query } = await import('../database.js');
  const tierCheck = await query(
    `SELECT id FROM players
     WHERE auction_id = $1 AND assigned_captain_id = $2 AND tier = $3`,
    [auctionId, captain.id, playerTier]
  );
  if (tierCheck.rows.length > 0) {
    return { valid: false, error: `Your team already has a Tier ${playerTier} player` };
  }

  return { valid: true };
}

export async function getTotalSpent(captainId: string, auctionId: string) {
  const result = await query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM bids WHERE captain_id = $1 AND auction_id = $2`,
    [captainId, auctionId]
  );
  return result.rows[0]?.total || 0;
}
