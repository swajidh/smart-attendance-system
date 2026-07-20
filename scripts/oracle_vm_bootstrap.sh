#!/usr/bin/env bash
# Bootstrap an Ubuntu 22.04/24.04 ARM VM (Oracle Cloud Always Free) for AttendAI.
# Run as ubuntu user after SSH login:
#   curl -fsSL <raw-url>/scripts/oracle_vm_bootstrap.sh | bash
# Or clone the repo first and run: bash scripts/oracle_vm_bootstrap.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/YOUR_USER/smart-attendance-system.git}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/smart-attendance-system}"

echo "==> Installing Docker..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl git ufw
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER"

echo "==> Firewall (SSH + HTTP + HTTPS)..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  echo "==> Cloning repository..."
  git clone "$REPO_URL" "$INSTALL_DIR"
else
  echo "==> Repo exists at $INSTALL_DIR — pulling latest..."
  git -C "$INSTALL_DIR" pull
fi

cd "$INSTALL_DIR"

if [[ ! -f infra/docker/.env ]]; then
  cp infra/docker/.env.example infra/docker/.env
  echo ""
  echo "IMPORTANT: Edit infra/docker/.env before starting (SECRET_KEY, POSTGRES_PASSWORD, URLs)."
  echo "  nano infra/docker/.env"
fi

echo ""
echo "Bootstrap complete. Next steps:"
echo "  1. Log out and back in (docker group), or run: newgrp docker"
echo "  2. Edit infra/docker/.env"
echo "  3. bash scripts/preload_ml_models.sh   # optional but recommended"
echo "  4. docker compose -f infra/docker/docker-compose.yml \\"
echo "       -f infra/docker/docker-compose.production.yml \\"
echo "       --env-file infra/docker/.env up -d --build"
echo "  5. docker compose -f infra/docker/docker-compose.yml run --rm migrate"
echo "  6. docker compose -f infra/docker/docker-compose.yml exec -e SEED_ADMIN=true backend python app/seed.py"
