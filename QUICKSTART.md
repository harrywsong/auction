# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+
- Docker (optional)
- Git

### Option A: Docker (Easiest)

```bash
# 1. Clone
git clone <repo>
cd auction

# 2. Start
docker-compose up --build

# 3. Open browser
# http://localhost:5173
```

### Option B: Local Development

```bash
# 1. Install server deps
cd server && npm install && cd ..

# 2. Install client deps
cd client && npm install && cd ..

# 3. Start PostgreSQL
docker run --name auction_db -e POSTGRES_PASSWORD=postgres -d -p 5432:5432 postgres:14

# 4. Run migrations
cd server && npm run db:migrate && cd ..

# 5. Start both (in separate terminals)
cd server && npm run dev    # Terminal 1
cd client && npm run dev    # Terminal 2

# 6. Open browser
# http://localhost:5173
```

## 📋 First Steps

### Login as Admin
- Click "🔑 Admin" on login page
- Password: `admin` (change in production!)
- Create an auction

### Add Captains & Players
1. Enter captain names and starting points
2. Add players manually or bulk import (CSV)
3. Configure bid increment and timer
4. Click "🚀 Start Auction"

### Run Live Auction
- Admin controls: "Next Player", "Pass Player", "End Auction"
- Captains place bids via buttons or custom input
- Results auto-generated when auction ends

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| "Cannot connect to server" | Ensure server is running on port 3001 |
| "Database error" | Check PostgreSQL is running and DATABASE_URL is correct |
| "WebSocket refused" | Ensure server is started, check firewall |
| "Port already in use" | Kill process or use different port |

## 📚 Documentation

- [SETUP.md](SETUP.md) - Detailed setup
- [API.md](API.md) - API reference
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production guide

## 🎮 Features Checklist

- [x] Live bidding with server-side timer
- [x] Captain/Admin/Spectator roles
- [x] Seamless reconnection
- [x] Team assignment
- [x] Results export (Discord)
- [x] PostgreSQL persistence
- [x] Real-time sync

## 🚢 Next Steps

1. Set strong admin password
2. Run on your server
3. Share link with captains
4. Start auction!

## 💬 Support

- Check logs: `docker-compose logs -f server`
- Visit GitHub issues for help
- See [troubleshooting section](DEPLOYMENT.md#troubleshooting-production)
