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
  riotId: string;
  tier: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';
  role: string;
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
