# Architecture Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         React Client                        │
│  (Vite + TypeScript + Tailwind + Socket.io Client)         │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API + WebSocket
┌────────────────────▼────────────────────────────────────────┐
│                    Express Server                           │
│  (Node.js + TypeScript + Socket.io + PostgreSQL)           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Routes Layer (REST API)                              │  │
│  │ - /api/auction/* - Auction management               │  │
│  │ - /api/captain/* - Captain management               │  │
│  │ - /api/health   - Server status                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                     │
│  ┌──────────────────────┴──────────────────────────────┐  │
│  │ Socket.io Event Handlers (Real-time)               │  │
│  │ - bidSocket.ts     - Bid events                    │  │
│  │ - auctionSocket.ts - Auction state events          │  │
│  │ - sessionSocket.ts - Connection/auth events        │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                     │
│  ┌──────────────────────┴──────────────────────────────┐  │
│  │ Services Layer (Business Logic)                     │  │
│  │ - auctionService.ts  - Auction state machine       │  │
│  │ - bidService.ts      - Bid validation & placement  │  │
│  │ - timerService.ts    - Server-side timer           │  │
│  │ - sessionService.ts  - Session management          │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                     │
└────────────────────┬───┴────────────────────────────────────┘
                     │ SQL
┌────────────────────▼────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│  - auctions      - Auction state & settings               │
│  - captains      - Captain info & points                  │
│  - players       - Player info & assignments              │
│  - bids          - All bids placed                        │
│  - sessions      - Active sessions (reconnection)         │
│  - passed_players - Players with no bids (re-queue)       │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Auction State Machine

The auction transitions through distinct states:

```
┌─────────────────────────────────────────────────────┐
│ SETUP → LIVE → FINISHED → RESULTS                  │
│                                                     │
│ SETUP: Admin adds captains, players, configures   │
│ LIVE: Players auctioned off one-by-one            │
│ FINISHED: All players auctioned or passed         │
│ RESULTS: Final teams and scores                   │
└─────────────────────────────────────────────────────┘
```

**State Transitions**:
- SETUP → LIVE: `admin:startAuction` event
- LIVE → LIVE: `admin:nextPlayer` (repeat for each player)
- LIVE → FINISHED: No more players to auction
- FINISHED → RESULTS: `admin:endAuction` event

### 2. Server-Side Timer

Timer runs **only on the server**, never on clients. This prevents cheating:

```
┌──────────────────────────────────────────┐
│ Server Timer Service                      │
│                                          │
│ ┌─ Timer State ──────────────────────┐  │
│ │ remainingSeconds: 25.3              │  │
│ │ isRunning: true                     │  │
│ │ lastTickTime: 1705407000123         │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Every 100ms:                             │
│ 1. Calculate elapsed time                │
│ 2. Decrement remainingSeconds           │
│ 3. Broadcast 'timer:tick' to all clients│
│                                          │
│ When timer hits 0:                       │
│ 1. Stop timer                            │
│ 2. Emit 'timer:finished' event          │
└──────────────────────────────────────────┘
```

**Timer Reset**:
- On each new bid: `timerService.resetTimer(auctionId)`
- Resets to full `timerLength` (default 30 seconds)
- All clients receive updated timer via WebSocket

### 3. Bid Validation Pipeline

```
┌───────────────────────────────────────────┐
│ Bid Submission (captain clicks bid button)│
└──────────────────┬────────────────────────┘
                   │
┌──────────────────▼────────────────────────┐
│ Socket Event: 'bid:submit'                │
│ Data: { auctionId, playerId, amount }     │
└──────────────────┬────────────────────────┘
                   │
┌──────────────────▼────────────────────────┐
│ Validate Session Token                    │
│ ✓ Token exists in database?              │
└──────────────────┬────────────────────────┘
                   │
┌──────────────────▼────────────────────────┐
│ Validate Bid Amount                       │
│ ✓ Amount > 0?                            │
│ ✓ Amount > currentBid?                   │
│ ✓ Captain has enough points?             │
│ ✓ Follows bid increment?                 │
└──────────────────┬────────────────────────┘
                   │
     ┌─────────────┴─────────────┐
     │                           │
  ✓ VALID                    ✗ INVALID
     │                           │
┌────▼──────────────────┐  ┌────▼──────────┐
│ Save to Database      │  │ Return Error  │
│ Update Auction State  │  │ to Captain    │
│ Reset Server Timer    │  └───────────────┘
│ Broadcast to Clients  │
└────────────────────────┘
```

### 4. Session & Reconnection

```
┌─────────────────────────────────────────────┐
│ Captain Login                                │
│ POST /api/captain/login                     │
│ Returns: sessionToken, sessionId            │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│ Create Session in Database                  │
│ session {                                   │
│   id: uuid,                                 │
│   captain_id: uuid,                         │
│   session_token: uuid,                      │
│   last_heartbeat: NOW()                     │
│ }                                           │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
Normal Connection    Disconnection
(Client online)      (Network failure)
    │                     │
    ▼                     ▼
Heartbeat every      Session kept alive
10 seconds           for 30 minutes
    │                     │
    │                     │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Captain Reconnects  │
    │ POST /api/captain/  │
    │        login        │
    │ (same session)      │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Session Restored    │
    │ UI updates to       │
    │ current state       │
    └────────────────────┘
```

**Heartbeat Mechanism**:
- Client sends heartbeat every 10 seconds
- Server updates `last_heartbeat` timestamp
- Sessions older than 30 minutes are cleaned up

## Data Models

### Auction

```typescript
interface Auction {
  id: UUID;
  name: string;
  status: 'setup' | 'live' | 'finished' | 'results';
  bidIncrement: number;
  timerLength: number;
  currentBid: number;
  currentLeaderId: UUID | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Captain

```typescript
interface Captain {
  id: UUID;
  auctionId: UUID;
  name: string;
  startingPoints: number;
  currentPoints: number; // Decreases as bids are placed
  createdAt: Date;
}
```

### Player

```typescript
interface Player {
  id: UUID;
  auctionId: UUID;
  name: string;
  riotId: string;
  tier: 'A' | 'B' | 'C' | 'D' | 'E';
  role: string;
  status: 'pending' | 'current' | 'sold' | 'passed';
  assignedCaptainId: UUID | null;
  createdAt: Date;
}
```

### Bid

```typescript
interface Bid {
  id: UUID;
  auctionId: UUID;
  playerId: UUID;
  captainId: UUID;
  amount: number;
  createdAt: Date;
}
```

## Key Design Decisions

### Why Server-Side Timer?

**Problem**: Clients can manipulate timers (speed up, pause)

**Solution**: Server owns timer state, broadcasts updates

**Trade-off**: Slight network latency (50-100ms) vs. integrity

### Why WebSocket (Socket.io)?

**Benefits**:
- Real-time bidding feedback
- Automatic reconnection handling
- Fallback to polling if WebSocket unavailable
- Broadcasting to multiple clients

**Alternative**: REST polling (not suitable for real-time)

### Why Session Tokens vs. JWT?

**Tokens**:
- ✅ Simple to revoke (just delete from DB)
- ✅ Easy to track per-captain
- ✅ Sufficient for single auction scope

**JWT**:
- ✗ Harder to revoke once issued
- ✗ Overkill for simple authentication

### Why PostgreSQL?

**Benefits**:
- ACID compliance (no lost bids)
- Full transaction support (atomic operations)
- Indexing for performance
- Easy to back up and restore
- Mature ecosystem

**Alternative**: MongoDB (but overkill for structured data)

## Performance Considerations

### Current Limits

- **Concurrent users**: ~50 (single Node.js process)
- **Auctions**: 1 (single instance)
- **Timer latency**: <100ms variance
- **Bid submission**: 50-100ms (network + processing)

### Scaling Strategies

To scale beyond current limits:

1. **Horizontal Scaling**:
   - Run multiple server instances
   - Use Redis for session store
   - Use Socket.io adapter (socket.io-redis)

2. **Database Optimization**:
   - Add connection pooling
   - Implement read replicas
   - Archive old auctions

3. **Caching**:
   - Cache auction state in Redis
   - Reduce database queries
   - Publish events for fast updates

## Security Considerations

### Current Implementation

- ✅ Session tokens for captain auth
- ✅ Admin key for protected routes
- ✅ Input validation on bids
- ✓ Server-side state enforcement

### Future Improvements

- ❌ No HTTPS (add for production)
- ❌ No rate limiting (add to prevent abuse)
- ❌ No audit logging (add for compliance)
- ❌ No SQL injection protection (use parameterized queries ✓ already done)

## Deployment Architecture

**Development**:
```
Client (Vite) ←→ Server (Express + Socket.io) ←→ PostgreSQL
     :5173          :3001                         :5432
```

**Production**:
```
   Nginx/CloudFlare
        │
   ┌────▼────┐
   │ Server  │ (Multiple instances)
   │ :3001   │
   └────┬────┘
        │
    PostgreSQL
    (RDS/Managed)
```

## Monitoring & Debugging

### Server Logs

- All database queries logged (query text + duration)
- Socket.io connection/disconnection events
- Error stack traces in development

### Tools

- **PostgreSQL**: `psql` client for direct queries
- **Socket.io DevTools**: Browser extension for debugging
- **Postman**: API testing and development
