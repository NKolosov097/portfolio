#!/bin/bash

# ===============================================
# Portfolio Application Deployment Script
# ===============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="portfolio"
DOCKER_COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"
LOG_FILE="./logs/${PROJECT_NAME}-deploy.log"

# Functions
log() {
    local message="${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo -e "$message"
    if [ -w "$(dirname "$LOG_FILE")" ] 2>/dev/null; then
        echo -e "$message" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

error() {
    local message="${RED}[ERROR] $1${NC}"
    echo -e "$message"
    if [ -w "$(dirname "$LOG_FILE")" ] 2>/dev/null; then
        echo -e "$message" >> "$LOG_FILE" 2>/dev/null || true
    fi
    exit 1
}

warning() {
    local message="${YELLOW}[WARNING] $1${NC}"
    echo -e "$message"
    if [ -w "$(dirname "$LOG_FILE")" ] 2>/dev/null; then
        echo -e "$message" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

info() {
    local message="${BLUE}[INFO] $1${NC}"
    echo -e "$message"
    if [ -w "$(dirname "$LOG_FILE")" ] 2>/dev/null; then
        echo -e "$message" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

# Check if running as root or with sudo (optional for Docker operations)
check_privileges() {
    if [[ $EUID -ne 0 ]]; then
        warning "Not running as root. Some operations may require sudo privileges."
        # Check if user is in docker group
        if groups $USER | grep -q docker; then
            log "User is in docker group, proceeding..."
        else
            error "User is not in docker group and not running as root. Please add user to docker group or run with sudo."
        fi
    fi
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker compose version &> /dev/null; then
        error "Docker Compose is not available. Please install Docker Compose plugin."
    fi
    
    log "Dependencies check passed"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "./docker/ssl"
    mkdir -p "./logs"
    
    # Set proper permissions
    chmod 755 "$BACKUP_DIR"
    chmod 755 "./logs"
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE" 2>/dev/null || true
    
    log "Directories setup completed"
}

# Backup database
backup_database() {
    log "Creating database backup..."
    
    if docker ps | grep -q "${PROJECT_NAME}_postgres"; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
        
        docker exec "${PROJECT_NAME}_postgres" pg_dump -U "${POSTGRES_USER:-portfolio_user}" "${POSTGRES_DB:-portfolio}" > "$BACKUP_FILE" || {
            warning "Database backup failed, continuing with deployment..."
        }
        
        # Keep only last 7 backups
        find "$BACKUP_DIR" -name "db_backup_*.sql" -type f -mtime +7 -delete
        
        log "Database backup completed: $BACKUP_FILE"
    else
        warning "Database container not running, skipping backup"
    fi
}

# Pull latest images and build
build_application() {
    log "Building application..."
    
    # Pull latest base images
    docker compose -f "$DOCKER_COMPOSE_FILE" pull postgres redis nginx
    
    # Build application
    docker compose -f "$DOCKER_COMPOSE_FILE" build --no-cache app
    
    log "Application build completed"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres sh -c 'until pg_isready -U ${POSTGRES_USER:-portfolio_user}; do sleep 1; done'
    
    # Run Prisma migrations
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T app pnpm prisma migrate deploy || {
        error "Database migrations failed"
    }
    
    log "Database migrations completed"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Stop existing containers
    docker compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
    
    # Start new containers
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Check if services are running
    if ! docker compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        error "Some services failed to start"
    fi
    
    log "Application deployed successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check application health
    for i in {1..30}; do
        if curl -f http://localhost/health &>/dev/null; then
            log "Health check passed"
            return 0
        fi
        sleep 2
    done
    
    error "Health check failed - application is not responding"
}

# Cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f --filter "until=24h"
    
    # Remove unused volumes
    docker volume prune -f
    
    log "Cleanup completed"
}

# Generate SSL certificates (self-signed for development)
generate_ssl_certs() {
    if [ ! -f "./docker/ssl/cert.pem" ] || [ ! -f "./docker/ssl/private.key" ]; then
        log "Generating self-signed SSL certificates..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ./docker/ssl/private.key \
            -out ./docker/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        chmod 600 ./docker/ssl/private.key
        chmod 644 ./docker/ssl/cert.pem
        
        log "SSL certificates generated"
    else
        log "SSL certificates already exist"
    fi
}

# Main deployment function
main() {
    log "Starting deployment of $PROJECT_NAME"
    
    check_privileges
    check_dependencies
    setup_directories
    generate_ssl_certs
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        warning ".env file not found. Please create it from env.example"
        if [ -f "env.example" ]; then
            cp env.example .env
            warning "Copied env.example to .env - please update with your values"
        fi
    fi
    
    backup_database
    build_application
    deploy_application
    run_migrations
    health_check
    cleanup
    
    log "Deployment completed successfully!"
    log "Application is available at: https://$(hostname -I | awk '{print $1}')"
    
    # Show running containers
    info "Running containers:"
    docker compose -f "$DOCKER_COMPOSE_FILE" ps
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        backup_database
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    "logs")
        docker compose -f "$DOCKER_COMPOSE_FILE" logs -f "${2:-app}"
        ;;
    "restart")
        docker compose -f "$DOCKER_COMPOSE_FILE" restart "${2:-app}"
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|cleanup|logs|restart}"
        echo "  deploy  - Full deployment (default)"
        echo "  backup  - Create database backup"
        echo "  health  - Check application health"
        echo "  cleanup - Clean up Docker resources"
        echo "  logs    - Show logs for service (default: app)"
        echo "  restart - Restart service (default: app)"
        exit 1
        ;;
esac
