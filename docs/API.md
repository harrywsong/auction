# API Documentation

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: (your server URL)

## Authentication

Most endpoints support optional Bearer token authentication for captain sessions:

```
Authorization: Bearer {session_token}
```

Admin endpoints require:
```
X-Admin-Key: {admin_key}
```

## REST Endpoints

### Health

**GET** `/api/health`

Check server health status.

```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Auction Management

#### Create Auction

**POST** `/api/auction/create` (Admin)

Create a new auction.

Request:
```json
{
  "name": "LCK Draft 2024"
}
```

Response:
```json
{
  "id": "uuid",
  "name": "LCK Draft 2024",
  "status": "setup",
  "bid_increment": 5,
  "timer_length": 30,
  "current_bid": 0,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Get Auction State

**GET** `/api/auction/{auctionId}`

Get current auction state.

Response:
```json
{
  "id": "uuid",
  "name": "LCK Draft 2024",
  "status": "live",
  "bid_increment": 5,
  "timer_length": 30,
  "current_bid": 1500,
  "current_leader_id": "captain-uuid",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Setup Auction

**POST** `/api/auction/{auctionId}/setup` (Admin)

Add captains and players to auction.

Request:
```json
{
  "captains": [
    {
      "name": "Captain A",
      "startingPoints": 10000
    }
  ],
  "players": [
    {
      "name": "Player Name",
      "riotId": "PlayerName#1234",
      "tier": "A",
      "role": "Top"
    }
  ],
  "bidIncrement": 5,
  "timerLength": 30
}
```

Response:
```json
{
  "captains": [...],
  "players": [...],
  "teamBreakdown": [...]
}
```

#### Get Auction Summary

**GET** `/api/auction/{auctionId}/summary`

Get captains, players, and current teams.

#### Get Results

**GET** `/api/auction/{auctionId}/results`

Get final auction results with team breakdown.

Response:
```json
{
  "auction": {...},
  "teams": [
    {
      "captain": {...},
      "players": [...],
      "pointsSpent": 5000
    }
  ],
  "generatedAt": "2024-01-15T10:45:00Z"
}
```

### Captain Management

#### Captain Login

**POST** `/api/captain/login`

Login as a captain and get session token.

Request:
```json
{
  "auctionId": "auction-uuid",
  "captainId": "captain-uuid"
}
```

Response:
```json
{
  "captain": {
    "id": "uuid",
    "name": "Captain A",
    "current_points": 10000,
    "starting_points": 10000
  },
  "session": {
    "sessionToken": "session-uuid",
    "sessionId": "id-uuid"
  }
}
```

#### Get Captain Info

**GET** `/api/captain/{captainId}`

Get captain information.

Response:
```json
{
  "id": "uuid",
  "auction_id": "uuid",
  "name": "Captain A",
  "starting_points": 10000,
  "current_points": 8500,
  "created_at": "2024-01-15T10:30:00Z"
}
```

## WebSocket Events

### Connection

**Client connects** to `ws://localhost:3001` with auth:

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'session-token',
    auctionId: 'auction-uuid'
  }
});
```

### Client → Server Events

#### Place Bid

```javascript
socket.emit('bid:submit', {
  auctionId: 'uuid',
  playerId: 'uuid',
  captainId: 'uuid',
  bidAmount: 1500
}, (response) => {
  // response: { success: true, bid: {...} } or { error: '...' }
});
```

#### Admin: Start Auction

```javascript
socket.emit('admin:startAuction', {
  auctionId: 'uuid'
}, (response) => {
  // response: { success: true }
});
```

#### Admin: Next Player

```javascript
socket.emit('admin:nextPlayer', {
  auctionId: 'uuid'
}, (response) => {
  // response: { success: true, currentPlayer: {...} }
});
```

#### Admin: Pass Player

```javascript
socket.emit('admin:passPlayer', {
  auctionId: 'uuid'
}, (response) => {
  // response: { success: true }
});
```

#### Admin: End Auction

```javascript
socket.emit('admin:endAuction', {
  auctionId: 'uuid'
}, (response) => {
  // response: { success: true }
});
```

#### Heartbeat (Keep Session Alive)

```javascript
socket.emit('client:heartbeat', {}, (response) => {
  // response: { success: true }
});
```

### Server → Client Events

#### Timer Tick (Every 100ms)

```javascript
socket.on('timer:tick', (data) => {
  // data: {
  //   auctionId: 'uuid',
  //   remainingSeconds: 25.5,
  //   timerLength: 30
  // }
});
```

#### Bid Placed

```javascript
socket.on('bid:placed', (data) => {
  // data: {
  //   bid: {...},
  //   captain: { id: 'uuid', name: 'Captain A' },
  //   bidAmount: 1500,
  //   remainingTime: 25
  // }
});
```

#### Player Updated

```javascript
socket.on('player:updated', (data) => {
  // data: {
  //   currentPlayer: {...},
  //   timerState: { remainingSeconds, timerLength }
  // }
});
```

#### Auction Started

```javascript
socket.on('auction:started', (data) => {
  // data: {
  //   auctionId: 'uuid',
  //   currentPlayer: {...},
  //   timerState: {...}
  // }
});
```

#### Auction Ended

```javascript
socket.on('auction:ended', (data) => {
  // data: { auctionId: 'uuid' }
});
```

#### Auction Finished

```javascript
socket.on('auction:finished', (data) => {
  // data: { auctionId: 'uuid' }
});
```

#### Reconnection Success

```javascript
socket.on('reconnect:success', (data) => {
  // data: {
  //   captain: {...},
  //   auction: {...},
  //   message: 'Connected successfully'
  // }
});
```

## Error Handling

All endpoints may return error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP Status Codes:

- **200**: Success
- **400**: Bad request (invalid input)
- **403**: Forbidden (auth failed)
- **404**: Not found
- **500**: Server error

## Rate Limiting

No rate limiting implemented for MVP. Consider adding for production.

## Pagination

Endpoints do not support pagination for MVP. Results are limited to reasonable sizes:

- Bid history: Last 20 bids
- Players list: All players (max 50 recommended)
- Captains list: All captains (max 20 recommended)
