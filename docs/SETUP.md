# Setup Guide

## Prerequisites

- **Node.js 18+**: [Download](https://nodejs.org/)
- **PostgreSQL 14+**: [Download](https://www.postgresql.org/)
- **Git**: [Download](https://git-scm.com/)
- **Docker & Docker Compose** (optional, for containerized setup): [Download](https://www.docker.com/)

## Local Development Setup

### 1. Clone the Repository

```bash
cd auction
```

### 2. Install Dependencies

**Server**:
```bash
cd server
npm install
```

**Client**:
```bash
cd client
npm install
```

### 3. Environment Configuration

**Server** (create `server/.env`):
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auction_db
SESSION_TIMEOUT_MS=1800000
ADMIN_KEY=admin
```

**Client** (create `client/.env`):
```bash
cp client/.env.example client/.env
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:3001
VITE_ADMIN_PASSWORD=admin
VITE_ADMIN_KEY=admin
```

### 4. Database Setup

**Option A: Using Docker**

```bash
docker run --name auction_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=auction_db \
  -d -p 5432:5432 \
  postgres:14-alpine
```

**Option B: Using Local PostgreSQL**

Create database:
```bash
createdb -U postgres auction_db
```

### 5. Run Migrations

```bash
cd server
npm run db:migrate
```

### 6. Start Development Servers

**Terminal 1 - Server**:
```bash
cd server
npm run dev
```

You should see:
```
🚀 Server running on port 3001
📡 Socket.io listening on ws://localhost:3001
✅ Environment: development
```

**Terminal 2 - Client**:
```bash
cd client
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 7. Access the Application

Open your browser and navigate to: **http://localhost:5173**

## Docker Setup (Alternative)

If you have Docker & Docker Compose installed:

```bash
docker-compose up --build
```

Then access:
- **Client**: http://localhost:5173
- **Server API**: http://localhost:3001
- **PostgreSQL**: localhost:5432

To stop:
```bash
docker-compose down
```

## Troubleshooting

### Connection Refused on Port 5432
- Ensure PostgreSQL is running
- Verify DATABASE_URL in `.env`
- Check PostgreSQL user/password

### Port 3001 Already in Use
```bash
# Find process on port 3001
lsof -i :3001

# Kill it
kill -9 <PID>
```

### CORS Errors
- Ensure VITE_API_URL matches your server URL
- Check server CORS configuration

### Socket.io Connection Failed
- Ensure server is running on port 3001
- Check firewall settings
- Try accessing http://localhost:3001 directly

## Development Tips

### Hot Reload
- Both server (nodemon) and client (Vite) support hot reload
- Changes are reflected immediately without restarting

### Database Queries
- Use PostgreSQL client to inspect data:
  ```bash
  psql -U postgres -d auction_db
  \dt  # List all tables
  SELECT * FROM auctions;
  ```

### Check Server Health
```bash
curl http://localhost:3001/api/health
```

## Next Steps

- See [API.md](API.md) for API endpoints
- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
