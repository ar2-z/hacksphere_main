# HackSphere Multi-Laptop Deployment Guide

## Architecture

```
[80 Users' Browsers]
        |
[Laptop 1: nginx Load Balancer]  <- serves frontend static files
        |
   (least_conn for API, ip_hash for WebSocket)
        |
[Laptop 2: FastAPI Backend]  \
                             --> [Render PostgreSQL Cloud DB]
[Laptop 3: FastAPI Backend]  /
```

## Prerequisites (All Laptops)

- Python 3.12+
- Node.js 20+
- Git
- Docker Desktop (optional but recommended)

## Step 1: Clone the Repository

```bash
git clone https://github.com/ar2-z/hacksphere_main.git hacksphere
cd hacksphere
```

## Step 2: Set Up the Database

### Option A: Render PostgreSQL (Recommended)
1. Go to https://dashboard.render.com
2. Create a PostgreSQL database (or use existing `hacksphere-db`)
3. Copy the connection string from the database's Info tab
4. It looks like: `postgresql://user:password@host:5432/hacksphere`
5. On ONE laptop, run the migrations:
   ```bash
   # Edit .env and set DATABASE_URL to your Render URL
   python -m app.infrastructure.database.base
   ```

### Option B: Local PostgreSQL
1. Install PostgreSQL on one laptop
2. Create database and user:
   ```sql
   CREATE USER hacksphere WITH PASSWORD 'hacksphere';
   CREATE DATABASE hacksphere OWNER hacksphere;
   ```
3. Set `DATABASE_URL=postgresql+asyncpg://hacksphere:hacksphere@YOUR_IP:5432/hacksphere` in `.env.production`

## Step 3: Configure Environment

On EVERY laptop:
```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set:
- `SECRET_KEY` = any random string
- `JWT_SECRET_KEY` = any different random string  
- `DATABASE_URL` = your PostgreSQL connection string

## Step 4: Deploy

### Laptop 1 (Load Balancer)
1. Open `nginx.conf` and replace the backend IPs:
   ```
   upstream backend_api {
       least_conn;
       server 192.168.1.100:8000;  # Laptop 2's IP
       server 192.168.1.101:8000;  # Laptop 3's IP
   }
   ```
   (Copy the same IPs for `backend_ws` and `backend_health`)

2. Build frontend:
   ```bash
   cd frontend && npm install && npm run build && cd ..
   ```

3. Start nginx via Docker:
   ```bash
   docker compose -f docker-compose.balancer.yml up -d
   ```

4. Or use the batch script:
   ```
   scripts\setup_balancer.bat
   ```

### Laptops 2 and 3 (Backend Servers)

**Option A: Direct Python**
```bash
pip install .
cd frontend && npm install && npm run build && cd ..
python scripts/start_server.py --port 8000 --workers 4
```

**Option B: Docker**
```bash
docker compose -f docker-compose.backend.yml up -d
```

**Option C: Batch script**
```
scripts\setup_backend.bat
```

## Step 5: Verify

1. Open browser: `http://LAPTOP1_IP`
2. You should see the HackSphere login page
3. Register an account, or create an admin with `python scripts/seed_admins.py`
4. Check health: `http://LAPTOP2_IP:8000/health`

## Finding Laptop IPs

### Windows
```cmd
ipconfig
```
Look for "IPv4 Address" under your WiFi/Ethernet adapter.

### Linux/Mac
```bash
hostname -I
# or
ifconfig
```

## Scaling Beyond 3 Laptops

1. Add more backend laptops (clone repo, follow Laptop 2/3 steps)
2. Edit `nginx.conf` on Laptop 1, add more servers to all three upstream blocks
3. Reload nginx:
   ```bash
   docker compose -f docker-compose.balancer.yml exec nginx nginx -s reload
   ```

## Troubleshooting

### "502 Bad Gateway"
- Backend laptops are not running or nginx IPs are wrong
- Check: `curl http://BACKEND_IP:8000/health`

### "Connection refused" to database
- PostgreSQL is not accessible from backend laptops
- Check firewall, ensure port 5432 is open
- For Render: ensure database is not paused

### WebSocket disconnects
- WebSocket connections are sticky (same backend laptop)
- If a backend restarts, users reconnect automatically
- Check: `docker compose logs backend1`

### Users see different data
- All backends must connect to the SAME database
- Check `DATABASE_URL` is identical on all laptops

## Performance Tuning

- **Workers per laptop**: Set `WEB_CONCURRENCY` based on CPU cores (2-4 per laptop is fine for 80 users)
- **Rate limits**: Adjust `RATE_LIMIT_PER_MINUTE` in `.env.production`
- **Connection pool**: Each worker opens DB connections; keep total under 50 for Render free tier
