import { Router } from 'express';
import { AuthRequest, adminAuthMiddleware } from '../middleware/auth.js';
import * as auctionService from '../services/auctionService.js';
import * as bidService from '../services/bidService.js';

const router = Router();

// List active/setup auctions (for lobby discovery) — only last 24h to avoid stale entries
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { query } = await import('../database.js');
    const result = await query(
      `SELECT id, name, status, created_at FROM auctions
       WHERE status IN ('setup', 'live')
       AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all stale auctions except the one provided (admin only)
router.delete('/cleanup', adminAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { keepId } = req.body;
    const { query } = await import('../database.js');
    const result = await query(
      `DELETE FROM auctions WHERE id != $1 RETURNING id`,
      [keepId || '00000000-0000-0000-0000-000000000000']
    );
    res.json({ deleted: result.rowCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new auction (admin only) — always creates a fresh one
router.post('/create', adminAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Auction name is required' });
    }

    const auction = await auctionService.createAuction(name);
    res.json(auction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get auction state
router.get('/:auctionId', async (req: AuthRequest, res) => {
  try {
    const { auctionId } = req.params;
    const auction = await auctionService.getAuction(auctionId);

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json(auction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Setup auction (add captains & players)
router.post('/:auctionId/setup', adminAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { auctionId } = req.params;
    const { captains, players, bidIncrement, timerLength } = req.body;

    const auction = await auctionService.getAuction(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const { query } = await import('../database.js');

    // Clear existing captains & players before re-inserting so re-runs don't duplicate
    await query(`DELETE FROM players WHERE auction_id = $1`, [auctionId]);
    await query(`DELETE FROM captains WHERE auction_id = $1`, [auctionId]);

    // Add captains
    if (Array.isArray(captains)) {
      for (const captain of captains) {
        await bidService.addCaptain(auctionId, captain.name, captain.startingPoints);
      }
    }

    // Add players
    if (Array.isArray(players)) {
      for (const player of players) {
        const tier = String(player.tier ?? '').replace(/\r/g, '').trim();
        if (!['1','3','4','5','6','7','8','9','10'].includes(tier)) {
          return res.status(400).json({ error: `Invalid tier value "${player.tier}" for player "${player.name}". Must be one of: 1, 3, 4, 5, 6, 7, 8, 9, 10.` });
        }
        await bidService.addPlayer(
          auctionId,
          player.name,
          player.riotId,
          tier as any,
          player.role,
          player.peakTier || '',
          player.currentTier || ''
        );
      }
    }

    // Update settings
    if (bidIncrement) {
      await auctionService.updateBidIncrement(auctionId, bidIncrement);
    }
    if (timerLength) {
      await auctionService.updateTimerLength(auctionId, timerLength);
    }

    const summary = await auctionService.getAuctionSummary(auctionId);
    res.json(summary);
  } catch (error: any) {
    console.error('[setup] 500 error:', error);
    res.status(500).json({ error: error.message, detail: error.detail || error.code || '' });
  }
});

// Get current live state (for clients joining mid-auction)
router.get('/:auctionId/state', async (req: AuthRequest, res) => {
  try {
    const { auctionId } = req.params;
    const auction = await auctionService.getAuction(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const { query } = await import('../database.js');
    const currentPlayerRes = await query(
      `SELECT * FROM players WHERE auction_id = $1 AND status = 'current' LIMIT 1`,
      [auctionId]
    );
    const soldPlayersRes = await query(
      `SELECT * FROM players WHERE auction_id = $1 AND status = 'sold'`,
      [auctionId]
    );
    const captainsRaw = await auctionService.getAllCaptains(auctionId);

    const normalizePlayer = (row: any) => ({
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

    const upNextRes = await query(
      `SELECT * FROM players WHERE auction_id = $1 AND status = 'pending' ORDER BY created_at ASC LIMIT 5`,
      [auctionId]
    );
    const reserveRes = await query(
      `SELECT p.* FROM players p
       JOIN passed_players pp ON p.id = pp.player_id
       WHERE p.auction_id = $1
       ORDER BY pp.pass_count ASC, pp.created_at ASC`,
      [auctionId]
    );

    res.json({
      auction,
      currentPlayer: currentPlayerRes.rows[0] ? normalizePlayer(currentPlayerRes.rows[0]) : null,
      captains: captainsRaw.map(normalizeCaptain),
      soldPlayers: soldPlayersRes.rows.map(normalizePlayer),
      upNext: upNextRes.rows.map(normalizePlayer),
      reserve: reserveRes.rows.map(normalizePlayer),
      currentBid: auction.current_bid,
      currentLeaderId: auction.current_leader_id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get auction summary (captains, players, teams)
router.get('/:auctionId/summary', async (req: AuthRequest, res) => {
  try {
    const { auctionId } = req.params;
    const summary = await auctionService.getAuctionSummary(auctionId);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get results
router.get('/:auctionId/results', async (req: AuthRequest, res) => {
  try {
    const { auctionId } = req.params;
    const summary = await auctionService.getAuctionSummary(auctionId);

    const results = {
      auction: await auctionService.getAuction(auctionId),
      teams: summary.teamBreakdown.map((team: any) => ({
        captain: team.captain,
        players: team.players,
        pointsSpent: team.players.reduce((sum: number, p: any) => sum + (p.pointsSpent || 0), 0),
      })),
      generatedAt: new Date(),
    };

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
