#!/bin/bash

# ===============================================
# VPS Server Setup Script for Portfolio App
# ===============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    
    apt update && apt upgrade -y
    apt install -y curl wget git vim htop unzip software-properties-common \
        apt-transport-https ca-certificates gnupg lsb-release ufw fail2ban
    
    log "System packages updated"
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add user to docker group
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
        log "Added $SUDO_USER to docker group"
    fi
    
    log "Docker installed successfully"
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."
    
    # Install Docker Compose v2 (if not already installed with Docker)
    if ! docker compose version &>/dev/null; then
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
        curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    log "Docker Compose installed successfully"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (current connection)
    ufw allow ssh
    ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow PostgreSQL (only from localhost)
    ufw allow from 127.0.0.1 to any port 5432
    
    # Enable firewall
    ufw --force enable
    
    log "Firewall configured"
}

# Configure fail2ban
configure_fail2ban() {
    log "Configuring fail2ban..."
    
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

    systemctl enable fail2ban
    systemctl restart fail2ban
    
    log "Fail2ban configured"
}

# Setup swap file
setup_swap() {
    log "Setting up swap file..."
    
    # Check if swap already exists
    if swapon --show | grep -q "/swapfile"; then
        warning "Swap file already exists"
        return
    fi
    
    # Create 2GB swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make it permanent
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Configure swappiness
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    
    log "Swap file configured (2GB)"
}

# Configure system limits
configure_limits() {
    log "Configuring system limits..."
    
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

    # Configure systemd limits
    mkdir -p /etc/systemd/system.conf.d
    cat > /etc/systemd/system.conf.d/limits.conf << EOF
[Manager]
DefaultLimitNOFILE=65536
DefaultLimitNPROC=65536
EOF

    log "System limits configured"
}

# Setup log rotation
setup_logrotate() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/portfolio << EOF
/var/log/portfolio-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 root root
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        docker kill -s USR1 portfolio_nginx 2>/dev/null || true
    endscript
}
EOF

    log "Log rotation configured"
}

# Create application user
create_app_user() {
    log "Creating application user..."
    
    if ! id "portfolio" &>/dev/null; then
        useradd -m -s /bin/bash portfolio
        usermod -aG docker portfolio
        
        # Create SSH directory
        mkdir -p /home/portfolio/.ssh
        chmod 700 /home/portfolio/.ssh
        chown portfolio:portfolio /home/portfolio/.ssh
        
        log "Application user 'portfolio' created"
    else
        warning "User 'portfolio' already exists"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Install htop, iotop, nethogs for monitoring
    apt install -y htop iotop nethogs ncdu
    
    # Create monitoring script
    cat > /usr/local/bin/portfolio-status << 'EOF'
#!/bin/bash
echo "=== Portfolio Application Status ==="
echo "Date: $(date)"
echo
echo "=== System Resources ==="
free -h
echo
df -h
echo
echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo
echo "=== Application Logs (last 10 lines) ==="
docker logs portfolio_app --tail 10 2>/dev/null || echo "App container not running"
EOF

    chmod +x /usr/local/bin/portfolio-status
    
    log "Monitoring tools installed"
}

# Main setup function
main() {
    log "Starting VPS setup for Portfolio application..."
    
    check_root
    update_system
    install_docker
    install_docker_compose
    setup_swap
    configure_limits
    configure_firewall
    configure_fail2ban
    setup_logrotate
    create_app_user
    setup_monitoring
    
    log "VPS setup completed successfully!"
    log ""
    log "Next steps:"
    log "1. Copy your application code to /home/portfolio/"
    log "2. Configure your .env file"
    log "3. Run the deployment script: ./scripts/deploy.sh"
    log "4. Configure SSL certificates (Let's Encrypt recommended)"
    log ""
    log "Useful commands:"
    log "- portfolio-status: Check application status"
    log "- docker logs portfolio_app: View application logs"
    log "- systemctl status fail2ban: Check fail2ban status"
    log ""
    warning "Please reboot the server to ensure all changes take effect"
}

# Handle script arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "docker")
        install_docker
        install_docker_compose
        ;;
    "firewall")
        configure_firewall
        ;;
    "monitoring")
        setup_monitoring
        ;;
    *)
        echo "Usage: $0 {setup|docker|firewall|monitoring}"
        echo "  setup      - Complete VPS setup (default)"
        echo "  docker     - Install Docker and Docker Compose only"
        echo "  firewall   - Configure firewall only"
        echo "  monitoring - Setup monitoring tools only"
        exit 1
        ;;
esac
