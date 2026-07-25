#!/bin/bash
set -euo pipefail

ENV_FILE=".env.production"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }

check_prerequisites() {
    for cmd in docker docker-compose; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR: $cmd not found"
            exit 1
        fi
    done
    if [ ! -f "$ENV_FILE" ]; then
        log "ERROR: $ENV_FILE not found"
        exit 1
    fi
}

setup_directories() {
    mkdir -p "$BACKUP_DIR"/{postgres,redis,uploads}
    mkdir -p logs
    log "Directories created"
}

backup_database() {
    log "Backing up PostgreSQL..."
    docker-compose -f docker-compose.production.yml exec -T postgres \
        pg_dump -U hacksphere hacksphere | gzip > "$BACKUP_DIR/postgres/db_${TIMESTAMP}.sql.gz"
    log "Database backup completed"
}

backup_redis() {
    log "Backing up Redis..."
    docker-compose -f docker-compose.production.yml exec -T redis \
        redis-cli -a "${REDIS_PASSWORD}" BGSAVE
    sleep 5
    docker cp "$(docker-compose -f docker-compose.production.yml ps -q redis):/data/dump.rdb" \
        "$BACKUP_DIR/redis/dump_${TIMESTAMP}.rdb" 2>/dev/null || true
    log "Redis backup completed"
}

backup_uploads() {
    log "Backing up uploads..."
    docker cp "$(docker-compose -f docker-compose.production.yml ps -q api):/app/uploads" \
        "$BACKUP_DIR/uploads/uploads_${TIMESTAMP}" 2>/dev/null || true
    log "Uploads backup completed"
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    log "Cleanup completed"
}

deploy() {
    log "Starting deployment..."
    docker-compose -f docker-compose.production.yml pull
    docker-compose -f docker-compose.production.yml up -d --build
    sleep 10
    docker-compose -f docker-compose.production.yml ps
    log "Deployment completed"
}

health_check() {
    log "Running health checks..."
    local max_retries=30
    local retry=0
    while [ $retry -lt $max_retries ]; do
        if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
            log "Health check passed"
            return 0
        fi
        retry=$((retry + 1))
        sleep 2
    done
    log "ERROR: Health check failed"
    return 1
}

main() {
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            setup_directories
            backup_database || true
            deploy
            health_check
            ;;
        backup)
            backup_database
            backup_redis
            backup_uploads
            cleanup_old_backups
            ;;
        restore)
            if [ -z "${2:-}" ]; then
                log "Usage: $0 restore <backup_file>"
                exit 1
            fi
            log "Restoring from $2..."
            gunzip -c "$2" | docker-compose -f docker-compose.production.yml exec -T postgres \
                psql -U hacksphere -d hacksphere
            ;;
        status)
            docker-compose -f docker-compose.production.yml ps
            ;;
        logs)
            docker-compose -f docker-compose.production.yml logs -f "${2:-api}"
            ;;
        *)
            echo "Usage: $0 {deploy|backup|restore|status|logs}"
            exit 1
            ;;
    esac
}

main "$@"
