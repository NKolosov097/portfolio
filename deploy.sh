#!/bin/bash

# Env Vars
SECRET_KEY="my-secret" 
NEXT_PUBLIC_SAFE_KEY="safe-key" 
DOMAIN_NAME="nkolosov.com"
EMAIL="n.kolosov2003@mail.ru"

# Script Vars
REPO_URL="https://github.com/NKolosov097/portfolio.git"
APP_DIR=~/portfolio
SWAP_SIZE="2G"  # Swap size of 2GB

# Update package list and upgrade existing packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Add Swap Space (only if doesn't exist)
echo "Checking swap space..."
if [ ! -f /swapfile ]; then
  echo "Creating swap file..."
  sudo fallocate -l $SWAP_SIZE /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
  echo "Swap file already exists, skipping creation."
fi

# Install Docker
echo "Installing Docker dependencies..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

echo "Adding Docker repository..."
# Remove any existing Debian repository entries
sudo rm -f /etc/apt/sources.list.d/docker*.list
# Add correct Debian repository
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Installing Docker..."
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "Installing Docker Compose..."
COMPOSE_VERSION="v2.24.0"
sudo rm -f /usr/local/bin/docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose --retry 3 --retry-delay 5

# Verify download
if [ ! -f /usr/local/bin/docker-compose ]; then
  echo "Docker Compose download failed. Exiting."
  exit 1
fi

sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
if ! docker-compose --version; then
  echo "Docker Compose installation failed. Exiting."
  exit 1
fi

# Ensure Docker starts on boot
echo "Configuring Docker to start on boot..."
sudo systemctl enable docker
sudo systemctl start docker

# Clone the Git repository
echo "Setting up application directory..."
if [ -d "$APP_DIR" ]; then
  echo "Directory $APP_DIR already exists. Pulling latest changes..."
  cd $APP_DIR && git pull
else
  echo "Cloning repository from $REPO_URL..."
  git clone $REPO_URL $APP_DIR
  cd $APP_DIR || exit 1
fi

# Set up environment variables
echo "Configuring environment variables..."
echo "SECRET_KEY=$SECRET_KEY" >> "$APP_DIR/.env"
echo "NEXT_PUBLIC_SAFE_KEY=$NEXT_PUBLIC_SAFE_KEY" >> "$APP_DIR/.env"

# Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx

# Configure Nginx
echo "Configuring Nginx..."
sudo rm -f /etc/nginx/sites-available/portfolio
sudo rm -f /etc/nginx/sites-enabled/portfolio

# Stop Nginx temporarily for Certbot
sudo systemctl stop nginx

# Install Certbot and obtain SSL certificate
echo "Setting up SSL certificate..."
sudo apt install -y certbot
sudo certbot certonly --standalone -d $DOMAIN_NAME --non-interactive --agree-tos -m $EMAIL --quiet

# Ensure SSL files exist
echo "Configuring SSL files..."
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  sudo wget -q https://raw.githubusercontent.com/certbot/certbot/main/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf -P /etc/letsencrypt/
fi

if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

# Create Nginx config
echo "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/portfolio > /dev/null <<EOL
limit_req_zone \$binary_remote_addr zone=mylimit:10m rate=10r/s;

server {
    listen 80;
    server_name $DOMAIN_NAME;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN_NAME;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    limit_req zone=mylimit burst=20 nodelay;

    location /_next/static/ {
        alias ~/portfolio/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location /static/ {
        alias ~/portfolio/public/static/;
        expires 30d;
        access_log off;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        proxy_set_header X-Accel-Buffering no;
    }

    location /hooks/ {
        proxy_pass http://127.0.0.1:9000/hooks/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOL

# Enable Nginx config
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio
sudo systemctl restart nginx

# Build and run Docker containers
echo "Building and starting Docker containers..."
cd $APP_DIR || exit 1
sudo docker-compose up --build -d

# Verify containers are running
echo "Verifying containers are running..."
if ! sudo docker-compose ps | grep "Up"; then
  echo "Docker containers failed to start. Check logs with 'docker-compose logs'."
  exit 1
fi

# Output final message
echo -e "\n\033[1;32mDeployment complete!\033[0m"
echo "Your Next.js app is now running at:"
echo -e "\033[1;34mhttps://$DOMAIN_NAME\033[0m"
echo -e "\nYou can check the status of containers with:"
echo "  cd $APP_DIR && docker-compose ps"
echo -e "\nTo view logs:"
echo "  cd $APP_DIR && docker-compose logs -f"