import { query } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

export async function createSession(captainId: string) {
  const id = uuidv4();
  const token = uuidv4();
  
  const result = await query(
    `INSERT INTO sessions (id, captain_id, session_token, connected_at, last_heartbeat)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [id, captainId, token]
  );
  
  return result.rows[0];
}

export async function getSessionByToken(token: string) {
  const result = await query(
    `SELECT * FROM sessions WHERE session_token = $1`,
    [token]
  );
  return result.rows[0] || null;
}

export async function updateLastHeartbeat(sessionId: string) {
  const result = await query(
    `UPDATE sessions SET last_heartbeat = NOW() WHERE id = $1 RETURNING *`,
    [sessionId]
  );
  return result.rows[0];
}

export async function markSessionDisconnected(sessionId: string) {
  const result = await query(
    `UPDATE sessions SET disconnected_at = NOW() WHERE id = $1 RETURNING *`,
    [sessionId]
  );
  return result.rows[0];
}

export async function markSessionConnected(sessionId: string) {
  const result = await query(
    `UPDATE sessions SET disconnected_at = NULL, last_heartbeat = NOW() WHERE id = $1 RETURNING *`,
    [sessionId]
  );
  return result.rows[0];
}

export async function cleanupExpiredSessions() {
  const expiryTime = new Date(Date.now() - config.sessionTimeoutMs);
  
  const result = await query(
    `DELETE FROM sessions WHERE last_heartbeat < $1`,
    [expiryTime]
  );
  
  return result.rowCount;
}

export async function getActiveSession(captainId: string) {
  const result = await query(
    `SELECT * FROM sessions 
     WHERE captain_id = $1 AND last_heartbeat > NOW() - INTERVAL '30 minutes'
     ORDER BY last_heartbeat DESC LIMIT 1`,
    [captainId]
  );
  return result.rows[0] || null;
}
