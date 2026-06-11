# 뽀낳대 - Esports Auction Platform

A real-time web application for managing team auctions in esports tournaments. Captains bid on players with live countdown timers, team assignment, and instant result exports.

## Features

### Admin Controls
- **Captain Management**: Add captains with custom starting points
- **Player Management**: Add players individually or bulk import (CSV format)
- **Settings**: Configure bid increment, timer length, player order
- **Auction Control**: Start/stop auction, advance to next player, view live state

### Live Auction
- **Real-time Bidding**: Server-synchronized countdown timer (no client-side manipulation)
- **Quick Bid Buttons**: +5, +10, +25, +50, +100 point increments
- **Custom Bids**: Input field for any amount (validation ensures affordability)
- **Auto-disable**: Bid buttons automatically disable when captain runs out of points
- **Bid History**: Live feed of all bids placed
- **Current Leader**: Highlighted with their remaining points

### Auction Logic
- Players auctioned one at a time
- Timer counts down (default 30 seconds, configurable)
- Each new bid resets the timer
- When timer reaches 0, player assigned to current leader
- No bids? Player added to re-queue list (cycled after all original players auctioned)

### Results & Export
- **Team Breakdown**: All teams with player tiers, Riot IDs, and points spent
- **Discord Export**: One-click copy-to-clipboard pre-formatted for Discord
- **Persistent Storage**: All results saved to database

### Reconnection Support
- Captain loses connection? Session token kept alive for 30 minutes
- Reconnect seamlessly—UI updates to current auction state
- No bid data lost

## Architecture

```
Auction Web App
├── Frontend (React + TypeScript + Tailwind)
│   └── Real-time Socket.io client
├── Backend (Express + TypeScript + Socket.io)
│   ├── State machine (setup → live → results)
│   ├── Server-side timer orchestration
│   └── Bid validation engine
└── Database (PostgreSQL)
    ├── Auctions, Captains, Players, Bids
    └── Sessions, Passed Players
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Server-side timer** | Prevents cheating, ensures all clients sync, single source of truth |
| **Socket.io** | Real-time sync, automatic fallback to polling if needed |
| **Session tokens** | Simple reconnection (token lookup), easier to track/revoke |
| **Single auction** | Reduces complexity, sufficient for current scale |
| **PostgreSQL** | Durable, ACID-compliant, easy backups |

## Quick Start

### Local Development
```bash
# 1. Clone and install
cd auction
cd server && npm install
cd ../client && npm install

# 2. Set up environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Start PostgreSQL (Docker)
docker run --name auction_db -e POSTGRES_PASSWORD=postgres -d -p 5432:5432 postgres:14

# 4. Run migrations
cd server && npm run db:migrate

# 5. Start both servers
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Access the app at `http://localhost:5173`

### Docker Deployment
```bash
docker-compose up --build
```

## API Overview

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auction/create` | Create new auction |
| POST | `/api/auction/start` | Start auction (admin) |
| POST | `/api/auction/:id/setup` | Add captains/players (admin) |
| GET | `/api/auction/:id` | Get auction state |
| POST | `/api/captain/login` | Captain login (returns token) |
| GET | `/api/spectator/login` | Spectator login |
| POST | `/api/auction/:id/results` | Generate results |

### Socket.io Events

**Client → Server**:
- `bid:submit` - Place a bid
- `admin:nextPlayer` - Move to next player
- `admin:endAuction` - End auction
- `client:heartbeat` - Keep session alive

**Server → Client**:
- `player:updated` - Current player changed
- `bid:placed` - New bid received
- `timer:tick` - Timer update (every 100ms)
- `auction:stateChanged` - Auction state transition
- `auction:ended` - Auction finished
- `reconnect:success` - Session restored after disconnect

## File Structure
```
auction/
├── server/                 # Express backend
│   ├── src/
│   │   ├── main.ts        # Entry point
│   │   ├── services/      # Business logic
│   │   ├── routes/        # REST endpoints
│   │   ├── sockets/       # Socket.io handlers
│   │   └── middleware/    # Auth, error handling
│   ├── package.json
│   └── .env.example
├── client/                # React frontend
│   ├── src/
│   │   ├── pages/        # Route pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── context/      # Global state
│   │   └── utils/        # Helpers
│   ├── package.json
│   └── .env.example
├── database/             # PostgreSQL
│   ├── migrations/       # SQL migrations
│   └── seed.sql         # Sample data
├── docker-compose.yml
└── docs/                 # Documentation
```

## Database Schema

### Tables
- `auctions` - Auction metadata & state
- `captains` - Captain info & current points
- `players` - Player info & assignment
- `bids` - All bids placed
- `passed_players` - Players with no bids (re-queue)
- `sessions` - Captain sessions (for reconnection)

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Create auction, setup captains/players, control auction flow |
| **Captain** | Place bids, view live state, see results |
| **Spectator** | Watch live auction, view results (no bidding) |

## Performance & Scale

- Tested for: 6 captains, 30 players, ~10 spectators
- Timer sync variance: <100ms (all clients)
- Bid submission latency: ~50-100ms (network dependent)
- Database: Indexed for quick lookups (auction_id, captain_id, player_id)
- Real-time limit: ~50 concurrent users (Socket.io + single PostgreSQL instance)

## Troubleshooting

### Timer Out of Sync
- Check network latency (should be <100ms for LAN)
- Ensure server time is correct (NTP sync)
- Restart both client and server

### Can't Connect to Server
- Verify `VITE_API_URL` in client `.env`
- Check server is running on correct port (`npm run dev`)
- Ensure firewall allows port 3001 & WebSocket

### Database Connection Error
- Verify PostgreSQL is running (`docker ps`)
- Check `DATABASE_URL` in server `.env`
- Run migrations: `npm run db:migrate`

### Bids Not Submitting
- Check captain has enough points (buttons should auto-disable)
- Verify captain is authenticated (check session token in localStorage)
- Check server logs for validation errors

## Documentation

- [SETUP.md](docs/SETUP.md) - Detailed setup & environment configuration
- [API.md](docs/API.md) - Full API documentation
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Architecture & design decisions
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Production deployment guide

## Development

### Running Tests
```bash
cd server && npm run test
cd ../client && npm run test
```

### Building for Production
```bash
# Server
cd server && npm run build

# Client
cd client && npm run build
```

## License
MIT

## Credits
Built as a recreation of 뽀낳대 auction platform for League esports team drafts.
