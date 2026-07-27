# HackSphere — Koyeb Deployment Guide (Free, No Card)

## Step 1: Create Koyeb Account
1. Go to https://app.koyeb.com
2. Sign up with GitHub (no credit card needed)

## Step 2: Create PostgreSQL Database
1. In Koyeb dashboard → **Databases** → **Create Database**
2. Name: `hacksphere-db`
3. Plan: **Free** (1GB storage)
4. Wait for it to be ready, then copy the **Connection URI**

It looks like: `postgresql://user:password@xxx.koyeb.com:5432/hacksphere`

## Step 3: Create the App
1. **Apps** → **Create App**
2. Name: `hacksphere`
3. **Deployment method:** Docker
4. **Source:** GitHub → Select `ar2-z/hacksphere_main`
5. **Dockerfile:** `./Dockerfile` (auto-detected)
6. **Port:** `8000`

## Step 4: Set Environment Variables
In the app settings → **Environment variables**, add:

```
APP_ENV=production
DEBUG=false
SECRET_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
JWT_SECRET_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=<paste the connection URI from Step 2>
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=3
DATABASE_ECHO=false
REDIS_URL=memory://
REDIS_CACHE_TTL=300
CELERY_BROKER_URL=memory://
CELERY_RESULT_BACKEND=memory://
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=50
CODE_EXECUTION_TIMEOUT=30
CODE_MEMORY_LIMIT_MB=128
CODE_CPU_LIMIT_PERCENT=50
CORS_ORIGINS=["*"]
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=2000
LOG_LEVEL=INFO
LOG_FORMAT=json
```

**Important:** Koyeb also provides `PORT` automatically — the Dockerfile uses it.

## Step 5: Deploy
1. Click **Deploy**
2. Koyeb builds the Docker image (~5 min first time)
3. Once deployed, click the **Public URL** to access

## Step 6: Admin Login
- Go to your Koyeb URL
- Register with any email + password `Admin_main@123`
- You're in as admin!

## Limits (Free Tier)
- 1 vCPU, 256MB RAM
- Always-on (no spin-down on paid, free has 1000 monthly service hours)
- 1GB PostgreSQL storage
- Custom domain support

## Updating
Push to GitHub `main` branch → Koyeb auto-redeploys.
