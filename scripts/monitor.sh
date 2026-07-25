#!/bin/bash
set -euo pipefail

ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
LOG_FILE="./logs/monitor.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo "$message" | tee -a "$LOG_FILE"
}

send_alert() {
    local subject=$1
    local body=$2
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            -d "{\"text\": \"🚨 *$subject*\n$body\"}" > /dev/null
    fi
    
    echo "$body" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || true
}

check_api_health() {
    if ! curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        log "ERROR: API health check failed"
        send_alert "HackSphere API Down" "The API server is not responding."
        return 1
    fi
    log "API health check passed"
    return 0
}

check_database() {
    if ! docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U hacksphere > /dev/null 2>&1; then
        log "ERROR: Database check failed"
        send_alert "HackSphere Database Down" "PostgreSQL is not responding."
        return 1
    fi
    log "Database check passed"
    return 0
}

check_redis() {
    if ! docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "ERROR: Redis check failed"
        send_alert "HackSphere Redis Down" "Redis is not responding."
        return 1
    fi
    log "Redis check passed"
    return 0
}

check_disk_space() {
    local threshold=80
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$threshold" ]; then
        log "WARNING: Disk usage is at ${usage}%"
        send_alert "HackSphere Disk Space Warning" "Disk usage is at ${usage}%."
        return 1
    fi
    log "Disk space check passed (${usage}% used)"
    return 0
}

check_memory() {
    local threshold=90
    local usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    
    if [ "$usage" -gt "$threshold" ]; then
        log "WARNING: Memory usage is at ${usage}%"
        send_alert "HackSphere Memory Warning" "Memory usage is at ${usage}%."
        return 1
    fi
    log "Memory check passed (${usage}% used)"
    return 0
}

check_docker_containers() {
    local unhealthy=$(docker-compose -f docker-compose.production.yml ps --format json | \
        jq -r 'select(.State != "running") | .Name' 2>/dev/null)
    
    if [ -n "$unhealthy" ]; then
        log "ERROR: Unhealthy containers: $unhealthy"
        send_alert "HackSphere Container Issue" "Containers not running: $unhealthy"
        return 1
    fi
    log "All containers running"
    return 0
}

run_monitoring() {
    log "Starting monitoring checks..."
    
    local exit_code=0
    
    check_api_health || exit_code=1
    check_database || exit_code=1
    check_redis || exit_code=1
    check_disk_space || exit_code=1
    check_memory || exit_code=1
    check_docker_containers || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        log "All monitoring checks passed"
    else
        log "Some monitoring checks failed"
    fi
    
    return $exit_code
}

main() {
    case "${1:-check}" in
        check)
            run_monitoring
            ;;
        status)
            docker-compose -f docker-compose.production.yml ps
            ;;
        logs)
            docker-compose -f docker-compose.production.yml logs --tail=100 "${2:-api}"
            ;;
        *)
            echo "Usage: $0 {check|status|logs [service]}"
            exit 1
            ;;
    esac
}

main "$@"
