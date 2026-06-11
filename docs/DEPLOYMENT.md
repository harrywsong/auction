# Deployment Guide

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Domain name (for SSL)
- Docker & Docker Compose installed
- Basic familiarity with Linux CLI

## Production Deployment Options

### Option 1: Docker Compose (Recommended for Single Server)

#### 1. Set Up Server

```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone https://github.com/yourname/auction.git
cd auction
```

#### 2. Configure Environment

Edit `.env` files:

**server/.env**:
```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/auction_db
SESSION_TIMEOUT_MS=1800000
ADMIN_KEY=your-secret-admin-key
```

**client/.env**:
```env
VITE_API_URL=https://your-domain.com
VITE_ADMIN_PASSWORD=your-admin-password
```

#### 3. Build and Deploy

```bash
# Pull latest code
git pull origin main

# Build images
docker-compose build

# Start services
docker-compose up -d

# Verify
docker-compose ps
```

Output should show all services running:
```
NAME              STATUS
auction_postgres  Up 5 seconds (healthy)
auction_server    Up 3 seconds
auction_client    Up 1 second
```

#### 4. View Logs

```bash
docker-compose logs -f server    # Server logs
docker-compose logs -f postgres  # Database logs
```

### Option 2: Cloud Deployment (AWS/Heroku/Railway)

#### Railway.app (Easiest)

1. **Create Account**: https://railway.app

2. **Connect GitHub**:
   - Import your repository

3. **Configure Services**:
   - Database: PostgreSQL template
   - Server: Node.js service from Dockerfile
   - Client: Static site deploy

4. **Set Environment Variables**:
   - `DATABASE_URL`, `ADMIN_KEY`, etc.

5. **Deploy**: Push to GitHub, Railway auto-deploys

#### AWS (More Complex)

1. **RDS for PostgreSQL**: Managed database
2. **ECS/Fargate**: Containerized server
3. **CloudFront**: CDN for client
4. **S3**: Static client hosting
5. **Route 53**: DNS management

See AWS documentation for detailed steps.

## SSL/HTTPS Setup (Production)

### Using Let's Encrypt + Nginx

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx config to use certificate
# (Include ssl_certificate paths)

# Auto-renew
sudo certbot renew --dry-run
```

### Using CloudFlare

1. Add domain to CloudFlare
2. Enable Full SSL/TLS
3. Set Origin Server cert (optional)

## Database Backups

### Automated Backups (Recommended)

```bash
# Create backup script
cat > /home/user/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)

docker-compose exec -T postgres pg_dump -U postgres auction_db > \
  $BACKUP_DIR/auction_db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "auction_db_*.sql" -mtime +7 -delete
EOF

chmod +x /home/user/backup-db.sh
```

Add to crontab:
```bash
crontab -e

# Add line:
0 2 * * * /home/user/backup-db.sh  # Run at 2am daily
```

### Manual Backup

```bash
docker-compose exec postgres pg_dump -U postgres auction_db > backup.sql
```

### Restore

```bash
docker-compose exec -T postgres psql -U postgres auction_db < backup.sql
```

## Monitoring

### Health Checks

Create a monitoring script:

```bash
#!/bin/bash
curl -f http://localhost:3001/api/health || {
  echo "Server health check failed"
  docker-compose restart server
}
```

Add to crontab:
```bash
*/5 * * * * /home/user/health-check.sh
```

### Log Rotation

```bash
# Docker logs auto-rotate, configure in docker-compose.yml:
services:
  server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Scaling (Beyond MVP)

### Horizontal Scaling

1. **Run Multiple Server Instances**:
   ```bash
   docker-compose up -d --scale server=3
   ```

2. **Add Redis for Sessions**:
   ```bash
   # Add to docker-compose.yml
   redis:
     image: redis:7-alpine
   ```

3. **Use Load Balancer**:
   - Nginx
   - HAProxy
   - Cloud provider (ELB/ALB)

### Database Scaling

1. **Connection Pooling**: pgBouncer
2. **Read Replicas**: For read-heavy queries
3. **Archiving**: Move old auctions to archive DB

## Troubleshooting Production

### Server Won't Start

```bash
docker-compose logs server
# Check for:
# - DATABASE_URL incorrect
# - Port already in use
# - Out of memory
```

### High Memory Usage

```bash
docker stats
# If server using >500MB:
# - Increase Docker memory limit
# - Check for memory leaks in code
```

### Database Connection Issues

```bash
# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check connection pool
# (Adjust in server config if needed)
```

### WebSocket Disconnections

```bash
# Check firewall
sudo ufw allow 3001

# Check nginx config (if using reverse proxy)
# Ensure WebSocket upgrade headers present
```

## Maintenance

### Updates

```bash
# Update dependencies
cd server && npm update
cd ../client && npm update

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Database Migrations

```bash
# When schema changes:
docker-compose exec server npm run db:migrate
```

## Performance Tuning

### PostgreSQL

```bash
# Adjust postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
```

### Node.js

```bash
# In server/.env:
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=512
```

### Nginx (if using as reverse proxy)

```nginx
upstream app {
  server server:3001 max_fails=3 fail_timeout=10s;
}

server {
  listen 443 ssl;
  server_name your-domain.com;

  location / {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Disaster Recovery

### Recovery Plan

1. **Database Failure**:
   - Restore from latest backup
   - Verify data integrity

2. **Server Crash**:
   - Auto-restart via supervisor/systemd
   - Check logs for root cause

3. **Complete Loss**:
   - Rebuild infrastructure
   - Restore database from backup
   - Redeploy application

### RTO/RPO Targets

- **RTO (Recovery Time Objective)**: <30 minutes
- **RPO (Recovery Point Objective)**: <1 hour (daily backups)

## Checklist Before Going Live

- [ ] SSL/HTTPS configured
- [ ] Database backups automated
- [ ] Monitoring/alerting set up
- [ ] Environment variables secured (no secrets in code)
- [ ] Admin password changed
- [ ] Database indexed for performance
- [ ] Rate limiting considered
- [ ] CORS properly configured
- [ ] Error logging configured
- [ ] Load testing completed

## Support & Resources

- Docker Docs: https://docs.docker.com/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Express Docs: https://expressjs.com/
- React Docs: https://react.dev/
