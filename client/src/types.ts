export enum AuctionStatus {
  SETUP = 'setup',
  LIVE = 'live',
  FINISHED = 'finished',
  RESULTS = 'results',
}

export enum PlayerStatus {
  PENDING = 'pending',
  CURRENT = 'current',
  SOLD = 'sold',
  PASSED = 'passed',
}

export interface Auction {
  id: string;
  name: string;
  status: AuctionStatus;
  bidIncrement: number;
  timerLength: number;
  currentPlayerIndex: number;
  currentBid: number;
  currentLeaderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Captain {
  id: string;
  auctionId: string;
  name: string;
  startingPoints: number;
  currentPoints: number;
  createdAt: Date;
}

export interface Player {
  id: string;
  auctionId: string;
  name: string;
  riotId: string;       // Discord name — also used to derive profile picture filename
  tier: '1' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';
  role: string;         // 요원풀 (agent pool)
  peakTier: string;     // 최고 티어
  currentTier: string;  // 현 티어
  status: PlayerStatus;
  assignedCaptainId: string | null;
  pointsSpent: number;
  createdAt: Date;
}

export interface Bid {
  id: string;
  auctionId: string;
  playerId: string;
  captainId: string;
  amount: number;
  createdAt: Date;
  captainName?: string;
}

export interface Session {
  sessionToken: string;
  sessionId: string;
}

export interface AuthContext {
  role: 'admin' | 'captain' | 'spectator';
  captainId?: string;
  session?: Session;
  captain?: Captain;
}
