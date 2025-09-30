#!/bin/bash

# ===============================================
# Portfolio Application Backup Script
# ===============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="portfolio"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Database configuration
DB_CONTAINER="${PROJECT_NAME}_postgres"
DB_NAME="${POSTGRES_DB:-portfolio}"
DB_USER="${POSTGRES_USER:-portfolio_user}"

# S3 Configuration (optional)
S3_BUCKET="${BACKUP_S3_BUCKET}"
AWS_REGION="${AWS_REGION:-us-east-1}"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Create backup directory
setup_backup_dir() {
    mkdir -p "$BACKUP_DIR"/{database,files,logs}
    chmod 755 "$BACKUP_DIR"
    log "Backup directory setup: $BACKUP_DIR"
}

# Backup database
backup_database() {
    log "Starting database backup..."
    
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        error "Database container $DB_CONTAINER is not running"
    fi
    
    local backup_file="${BACKUP_DIR}/database/db_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Create database dump
    docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$backup_file"
    
    # Compress backup
    gzip "$backup_file"
    
    # Verify backup
    if [ -f "$compressed_file" ] && [ -s "$compressed_file" ]; then
        log "Database backup completed: $compressed_file"
        echo "$compressed_file" >> "${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
    else
        error "Database backup failed or is empty"
    fi
}

# Backup application files
backup_files() {
    log "Starting files backup..."
    
    local backup_file="${BACKUP_DIR}/files/files_${TIMESTAMP}.tar.gz"
    local app_dir="/home/portfolio"  # Adjust as needed
    
    if [ -d "$app_dir" ]; then
        tar -czf "$backup_file" \
            --exclude="node_modules" \
            --exclude=".next" \
            --exclude="logs" \
            --exclude=".git" \
            -C "$(dirname "$app_dir")" \
            "$(basename "$app_dir")"
        
        if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
            log "Files backup completed: $backup_file"
            echo "$backup_file" >> "${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
        else
            warning "Files backup failed or is empty"
        fi
    else
        warning "Application directory $app_dir not found, skipping files backup"
    fi
}

# Backup Docker volumes
backup_volumes() {
    log "Starting Docker volumes backup..."
    
    local volumes_backup="${BACKUP_DIR}/files/volumes_${TIMESTAMP}.tar.gz"
    
    # Get list of project volumes
    local volumes=$(docker volume ls -q | grep "^${PROJECT_NAME}" || true)
    
    if [ -n "$volumes" ]; then
        # Create temporary container to access volumes
        docker run --rm \
            $(echo "$volumes" | sed 's/^/-v /; s/$/:\/backup\/&:ro/') \
            -v "${BACKUP_DIR}/files:/host_backup" \
            alpine:latest \
            tar -czf "/host_backup/volumes_${TIMESTAMP}.tar.gz" -C /backup .
        
        if [ -f "$volumes_backup" ] && [ -s "$volumes_backup" ]; then
            log "Volumes backup completed: $volumes_backup"
            echo "$volumes_backup" >> "${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
        else
            warning "Volumes backup failed or is empty"
        fi
    else
        info "No project volumes found to backup"
    fi
}

# Backup logs
backup_logs() {
    log "Starting logs backup..."
    
    local logs_backup="${BACKUP_DIR}/logs/logs_${TIMESTAMP}.tar.gz"
    local logs_dirs=(
        "/var/log/nginx"
        "./logs"
    )
    
    local existing_dirs=()
    for dir in "${logs_dirs[@]}"; do
        if [ -d "$dir" ]; then
            existing_dirs+=("$dir")
        fi
    done
    
    if [ ${#existing_dirs[@]} -gt 0 ]; then
        tar -czf "$logs_backup" "${existing_dirs[@]}" 2>/dev/null || true
        
        if [ -f "$logs_backup" ] && [ -s "$logs_backup" ]; then
            log "Logs backup completed: $logs_backup"
            echo "$logs_backup" >> "${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
        else
            info "No logs found to backup"
        fi
    else
        info "No log directories found"
    fi
}

# Upload to S3 (if configured)
upload_to_s3() {
    if [ -z "$S3_BUCKET" ]; then
        info "S3 backup not configured, skipping upload"
        return
    fi
    
    if ! command -v aws &> /dev/null; then
        warning "AWS CLI not installed, skipping S3 upload"
        return
    fi
    
    log "Uploading backups to S3..."
    
    local manifest_file="${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
    
    if [ -f "$manifest_file" ]; then
        while IFS= read -r backup_file; do
            if [ -f "$backup_file" ]; then
                local s3_key="portfolio-backups/$(date +%Y/%m/%d)/$(basename "$backup_file")"
                aws s3 cp "$backup_file" "s3://${S3_BUCKET}/${s3_key}" --region "$AWS_REGION"
                log "Uploaded: $backup_file -> s3://${S3_BUCKET}/${s3_key}"
            fi
        done < "$manifest_file"
        
        # Upload manifest
        aws s3 cp "$manifest_file" "s3://${S3_BUCKET}/portfolio-backups/$(date +%Y/%m/%d)/backup_manifest_${TIMESTAMP}.txt" --region "$AWS_REGION"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
    
    # Local cleanup
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        aws s3 ls "s3://${S3_BUCKET}/portfolio-backups/" --recursive | \
        awk -v cutoff="$cutoff_date" '$1 < cutoff {print $4}' | \
        while read -r key; do
            aws s3 rm "s3://${S3_BUCKET}/${key}"
        done
    fi
    
    log "Cleanup completed"
}

# Verify backup integrity
verify_backups() {
    log "Verifying backup integrity..."
    
    local manifest_file="${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
    local all_good=true
    
    if [ -f "$manifest_file" ]; then
        while IFS= read -r backup_file; do
            if [ -f "$backup_file" ]; then
                # Check if file is not empty and not corrupted
                case "$backup_file" in
                    *.gz)
                        if ! gzip -t "$backup_file" 2>/dev/null; then
                            error "Corrupted backup: $backup_file"
                            all_good=false
                        fi
                        ;;
                    *.tar.gz)
                        if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
                            error "Corrupted backup: $backup_file"
                            all_good=false
                        fi
                        ;;
                esac
                
                info "✓ Verified: $(basename "$backup_file")"
            else
                error "Missing backup file: $backup_file"
                all_good=false
            fi
        done < "$manifest_file"
    fi
    
    if $all_good; then
        log "All backups verified successfully"
    else
        error "Some backups failed verification"
    fi
}

# Generate backup report
generate_report() {
    local report_file="${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
    local manifest_file="${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
Portfolio Application Backup Report
===================================
Date: $(date)
Timestamp: $TIMESTAMP
Backup Directory: $BACKUP_DIR
Retention Period: $RETENTION_DAYS days

Backup Files:
EOF

    if [ -f "$manifest_file" ]; then
        while IFS= read -r backup_file; do
            if [ -f "$backup_file" ]; then
                local size=$(du -h "$backup_file" | cut -f1)
                echo "- $(basename "$backup_file") ($size)" >> "$report_file"
            fi
        done < "$manifest_file"
    fi
    
    cat >> "$report_file" << EOF

Total Backup Size: $(du -sh "$BACKUP_DIR" | cut -f1)
Available Space: $(df -h "$BACKUP_DIR" | tail -1 | awk '{print $4}')

Status: COMPLETED
EOF

    log "Backup report generated: $report_file"
}

# Main backup function
main() {
    log "Starting backup process for $PROJECT_NAME"
    
    setup_backup_dir
    backup_database
    backup_files
    backup_volumes
    backup_logs
    verify_backups
    upload_to_s3
    cleanup_old_backups
    generate_report
    
    log "Backup process completed successfully!"
}

# Handle script arguments
case "${1:-full}" in
    "full")
        main
        ;;
    "database")
        setup_backup_dir
        backup_database
        verify_backups
        ;;
    "files")
        setup_backup_dir
        backup_files
        verify_backups
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "verify")
        if [ -n "$2" ]; then
            TIMESTAMP="$2"
        fi
        verify_backups
        ;;
    *)
        echo "Usage: $0 {full|database|files|cleanup|verify [timestamp]}"
        echo "  full     - Complete backup (default)"
        echo "  database - Database backup only"
        echo "  files    - Files backup only"
        echo "  cleanup  - Cleanup old backups"
        echo "  verify   - Verify backup integrity"
        exit 1
        ;;
esac
