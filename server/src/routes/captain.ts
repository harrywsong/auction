import { Router } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as bidService from '../services/bidService.js';
import * as sessionService from '../services/sessionService.js';
import * as auctionService from '../services/auctionService.js';

const router = Router();

// Helper: normalize DB captain row to camelCase
function normalizeCaptain(row: any) {
  return {
    id: row.id,
    auctionId: row.auction_id,
    name: row.name,
    startingPoints: row.starting_points,
    currentPoints: row.current_points,
    createdAt: row.created_at,
  };
}

// Captain join by name (instead of UUID)
router.post('/join', async (req: AuthRequest, res) => {
  try {
    const { auctionId, captainName } = req.body;

    if (!auctionId || !captainName) {
      return res.status(400).json({ error: 'auctionId and captainName are required' });
    }

    // Only allow joining once the auction has been started
    const auction = await auctionService.getAuction(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    if (auction.status !== 'live') {
      return res.status(403).json({ error: 'Auction has not started yet' });
    }

    const { query } = await import('../database.js');
    const result = await query(
      `SELECT * FROM captains WHERE auction_id = $1 AND LOWER(name) = LOWER($2)`,
      [auctionId, captainName]
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: `No captain named "${captainName}" found in this auction` });
    }

    let session = await sessionService.getActiveSession(row.id);
    if (!session) {
      session = await sessionService.createSession(row.id);
    } else {
      await sessionService.markSessionConnected(session.id);
    }

    res.json({
      captain: normalizeCaptain(row),
      session: {
        sessionToken: session.session_token,
        sessionId: session.id,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Captain login by ID (legacy)
router.post('/login', async (req: AuthRequest, res) => {
  try {
    const { auctionId, captainId } = req.body;

    if (!auctionId || !captainId) {
      return res.status(400).json({ error: 'auctionId and captainId are required' });
    }

    const captain = await bidService.getCaptainByAuction(auctionId, captainId);

    if (!captain) {
      return res.status(404).json({ error: 'Captain not found' });
    }

    // Check for existing session
    let session = await sessionService.getActiveSession(captainId);

    if (!session) {
      session = await sessionService.createSession(captainId);
    } else {
      await sessionService.markSessionConnected(session.id);
    }

    res.json({
      captain,
      session: {
        sessionToken: session.session_token,
        sessionId: session.id,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get captain info
router.get('/:captainId', async (req: AuthRequest, res) => {
  try {
    const { captainId } = req.params;
    const captain = await bidService.getCaptain(captainId);

    if (!captain) {
      return res.status(404).json({ error: 'Captain not found' });
    }

    res.json(captain);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
