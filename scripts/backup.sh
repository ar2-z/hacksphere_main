#!/bin/bash
set -euo pipefail

BACKUP_DIR="./backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

backup_database() {
    log "Starting PostgreSQL backup..."
    
    if [ -f .env.production ]; then
        source .env.production
    fi
    
    docker-compose -f docker-compose.production.yml exec -T postgres \
        pg_dump -U hacksphere -Fc hacksphere > "$BACKUP_DIR/dump_${TIMESTAMP}.dump"
    
    gzip "$BACKUP_DIR/dump_${TIMESTAMP}.dump"
    
    log "Backup completed: $BACKUP_DIR/dump_${TIMESTAMP}.dump.gz"
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -type f -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete
    log "Cleanup completed"
}

list_backups() {
    log "Available backups:"
    ls -lh "$BACKUP_DIR"/*.dump.gz 2>/dev/null || echo "No backups found"
}

restore_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Restoring from $backup_file..."
    
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker-compose -f docker-compose.production.yml exec -T postgres \
            pg_restore -U hacksphere -d hacksphere --clean --if-exists
    else
        docker-compose -f docker-compose.production.yml exec -T postgres \
            pg_restore -U hacksphere -d hacksphere --clean --if-exists < "$backup_file"
    fi
    
    log "Restore completed"
}

main() {
    case "${1:-backup}" in
        backup)
            backup_database
            cleanup_old_backups
            ;;
        restore)
            if [ -z "${2:-}" ]; then
                log "Usage: $0 restore <backup_file>"
                exit 1
            fi
            restore_backup "$2"
            ;;
        list)
            list_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore|list}"
            exit 1
            ;;
    esac
}

main "$@"
