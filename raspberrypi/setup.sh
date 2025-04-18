#!/bin/bash

# Exit on error
set -e

echo "Setting up WaterLogged on Raspberry Pi..."

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required system packages
echo "Installing system dependencies..."
sudo apt-get install -y \
    python3-pip \
    python3-venv \
    sqlite3 \
    nginx \
    git

# Create and activate virtual environment
echo "Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python requirements
echo "Installing Python packages..."
pip install -r requirements.txt

# Initialize database
echo "Initializing database..."
python3 -c "from database_handler import DatabaseHandler; DatabaseHandler()"

# Set up service
echo "Setting up systemd service..."
sudo tee /etc/systemd/system/waterlogged.service << EOF
[Unit]
Description=WaterLogged Data Collection Service
After=network.target

[Service]
User=$USER
WorkingDirectory=$(pwd)
Environment="PATH=$(pwd)/venv/bin"
ExecStart=$(pwd)/venv/bin/python3 api_server.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure NGINX
echo "Configuring NGINX..."
sudo tee /etc/nginx/sites-available/waterlogged << EOF
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Enable NGINX site
sudo ln -sf /etc/nginx/sites-available/waterlogged /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Start services
echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable waterlogged
sudo systemctl start waterlogged
sudo systemctl restart nginx

echo "Setup complete! The API server should now be running."
echo "You can check the status with: sudo systemctl status waterlogged"
echo "View logs with: sudo journalctl -u waterlogged -f"