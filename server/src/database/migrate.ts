import { query } from '../database.js';

const migrations = [
  `
    CREATE TABLE IF NOT EXISTS auctions (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'setup',
      bid_increment INTEGER DEFAULT 5,
      timer_length INTEGER DEFAULT 30,
      current_player_index INTEGER DEFAULT 0,
      current_bid INTEGER DEFAULT 0,
      current_leader_id UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS captains (
      id UUID PRIMARY KEY,
      auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      starting_points INTEGER NOT NULL,
      current_points INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(auction_id, name)
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS players (
      id UUID PRIMARY KEY,
      auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      riot_id VARCHAR(255) NOT NULL,
      tier CHAR(1) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT '',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      assigned_captain_id UUID REFERENCES captains(id) ON DELETE SET NULL,
      points_spent INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS bids (
      id UUID PRIMARY KEY,
      auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      captain_id UUID NOT NULL REFERENCES captains(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS passed_players (
      id UUID PRIMARY KEY,
      auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      pass_count INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY,
      captain_id UUID NOT NULL REFERENCES captains(id) ON DELETE CASCADE,
      session_token VARCHAR(255) NOT NULL UNIQUE,
      connected_at TIMESTAMP DEFAULT NOW(),
      last_heartbeat TIMESTAMP DEFAULT NOW(),
      disconnected_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
  `CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);`,
  `CREATE INDEX IF NOT EXISTS idx_captains_auction_id ON captains(auction_id);`,
  `CREATE INDEX IF NOT EXISTS idx_players_auction_id ON players(auction_id);`,
  `CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);`,
  `CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);`,
  `CREATE INDEX IF NOT EXISTS idx_bids_player_id ON bids(player_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_captain_id ON sessions(captain_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);`,
];

export async function runMigrations() {
  console.log('Starting database migrations...');
  for (const migration of migrations) {
    await query(migration);
  }
  console.log('✅ All migrations completed successfully');
}
