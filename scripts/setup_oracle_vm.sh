#!/bin/bash
set -e

echo "=========================================="
echo "  HackSphere - Oracle VM Setup"
echo "=========================================="

# 1. System updates
echo "[1/6] Updating system..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker
echo "[2/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in."
else
    echo "Docker already installed."
fi

# 3. Install Docker Compose
echo "[3/6] Installing Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    sudo apt-get install -y docker-compose-plugin
else
    echo "Docker Compose already installed."
fi

# 4. Create project directory
echo "[4/6] Setting up project directory..."
sudo mkdir -p /opt/hacksphere
sudo chown $USER:$USER /opt/hacksphere

# 5. Firewall
echo "[5/6] Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    sudo ufw allow 8000/tcp  # Direct API access (optional)
    sudo ufw --force enable
    echo "Firewall configured."
else
    echo "UFW not installed. Make sure ports 22, 80, 443 are open in Oracle Cloud security list."
fi

echo ""
echo "=========================================="
echo "  Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Copy the hacksphere project to this VM:"
echo "     scp -r /path/to/hacksphere/* user@VM_IP:/opt/hacksphere/"
echo "     OR"
echo "     cd /opt/hacksphere && git clone https://github.com/ar2-z/hacksphere_main.git ."
echo ""
echo "  2. Deploy:"
echo "     cd /opt/hacksphere"
echo "     cp .env.production .env"
echo "     docker compose -f docker-compose.production.yml up -d --build"
echo ""
echo "  3. Check status:"
echo "     docker compose -f docker-compose.production.yml ps"
echo "     docker compose -f docker-compose.production.yml logs -f api"
echo ""
echo "  4. Access:"
echo "     http://VM_PUBLIC_IP"
echo "     http://VM_PUBLIC_IP:8000/docs (API docs)"
echo ""
echo "  5. Create an admin: python scripts/seed_admins.py"
echo "=========================================="
