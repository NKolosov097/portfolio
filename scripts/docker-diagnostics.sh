#!/bin/bash

# ===============================================
# Docker Build Diagnostics Script
# ===============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Test Alpine package installation
test_alpine_packages() {
    log "Testing Alpine package installation..."
    
    # Test basic Alpine container
    docker run --rm --name alpine-test alpine:3.22 sh -c '
        echo "=== Testing Alpine package installation ==="
        echo "Current Alpine version: $(cat /etc/alpine-release)"
        
        # Test repository connectivity
        echo "=== Testing repository connectivity ==="
        for repo in "dl-cdn.alpinelinux.org" "alpine.mirror.wearetriple.com" "mirror.yandex.ru"; do
            echo "Testing $repo..."
            if timeout 10 wget -q --spider "http://$repo/alpine/v3.22/main/x86_64/APKINDEX.tar.gz"; then
                echo "✅ $repo is accessible"
            else
                echo "❌ $repo is not accessible or slow"
            fi
        done
        
        # Test package installation with timeout
        echo "=== Testing package installation ==="
        timeout 300 apk update || echo "❌ apk update timed out"
        
        timeout 300 apk add --no-cache libc6-compat openssl ca-certificates || echo "❌ Package installation timed out"
        
        echo "✅ Alpine test completed"
    '
}

# Test Docker daemon configuration
test_docker_config() {
    log "Testing Docker daemon configuration..."
    
    info "Docker version:"
    docker --version
    
    info "Docker info:"
    docker info | head -20
    
    info "Docker daemon configuration:"
    if [ -f "/etc/docker/daemon.json" ]; then
        cat /etc/docker/daemon.json
    else
        warning "No Docker daemon configuration found"
    fi
    
    info "Available disk space:"
    df -h /var/lib/docker 2>/dev/null || df -h /
    
    info "Memory usage:"
    free -h
    
    info "Network connectivity test:"
    for host in "dl-cdn.alpinelinux.org" "registry-1.docker.io" "github.com"; do
        if timeout 5 ping -c 1 "$host" >/dev/null 2>&1; then
            echo "✅ $host is reachable"
        else
            echo "❌ $host is not reachable"
        fi
    done
}

# Test Docker build with minimal Dockerfile
test_minimal_build() {
    log "Testing minimal Docker build..."
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Create minimal Dockerfile for testing
    cat > Dockerfile << 'EOF'
FROM node:22-alpine
RUN set -eux; \
    echo "http://dl-cdn.alpinelinux.org/alpine/v3.22/main" > /etc/apk/repositories; \
    echo "http://dl-cdn.alpinelinux.org/alpine/v3.22/community" >> /etc/apk/repositories; \
    echo "http://alpine.mirror.wearetriple.com/v3.22/main" >> /etc/apk/repositories; \
    echo "http://alpine.mirror.wearetriple.com/v3.22/community" >> /etc/apk/repositories; \
    timeout 300 apk update || (echo "Primary update failed, trying fallback..." && \
    echo "http://mirror.yandex.ru/mirrors/alpine/v3.22/main" > /etc/apk/repositories && \
    echo "http://mirror.yandex.ru/mirrors/alpine/v3.22/community" >> /etc/apk/repositories && \
    timeout 300 apk update); \
    for i in 1 2 3; do \
        timeout 300 apk add --no-cache libc6-compat openssl ca-certificates && break || \
        (echo "Attempt $i failed, retrying in 10 seconds..." && sleep 10); \
    done
EOF
    
    info "Building minimal test image..."
    if timeout 600 docker build --no-cache --progress=plain -t alpine-test-build .; then
        log "✅ Minimal build test passed"
        docker rmi alpine-test-build || true
    else
        error "❌ Minimal build test failed"
    fi
    
    # Cleanup
    cd /
    rm -rf "$TEMP_DIR"
}

# Main function
main() {
    log "Starting Docker diagnostics..."
    
    test_docker_config
    test_alpine_packages
    test_minimal_build
    
    log "Docker diagnostics completed"
}

# Handle script arguments
case "${1:-all}" in
    "config")
        test_docker_config
        ;;
    "alpine")
        test_alpine_packages
        ;;
    "build")
        test_minimal_build
        ;;
    "all")
        main
        ;;
    *)
        echo "Usage: $0 {all|config|alpine|build}"
        echo "  all    - Run all tests (default)"
        echo "  config - Test Docker configuration"
        echo "  alpine - Test Alpine package installation"
        echo "  build  - Test minimal Docker build"
        exit 1
        ;;
esac
