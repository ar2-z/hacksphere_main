#!/bin/bash
set -e

cd /opt/hacksphere

echo "[HackSphere] Pulling latest code..."
git pull origin main

echo "[HackSphere] Rebuilding and restarting..."
docker compose -f docker-compose.production.yml up -d --build api

echo "[HackSphere] Waiting for health check..."
sleep 10

if curl -sf http://localhost:8000/health/live > /dev/null 2>&1; then
    echo "[HackSphere] Deploy successful! API is healthy."
else
    echo "[HackSphere] WARNING: Health check failed. Checking logs..."
    docker compose -f docker-compose.production.yml logs --tail=20 api
fi
