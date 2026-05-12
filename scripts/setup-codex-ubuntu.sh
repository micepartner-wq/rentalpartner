#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Updating apt packages..."
sudo apt update

echo "[2/6] Installing base packages..."
sudo apt install -y build-essential curl git unzip

if ! command -v node >/dev/null 2>&1; then
  echo "[3/6] Installing Node.js LTS..."
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "[3/6] Node.js already installed: $(node -v)"
fi

echo "[4/6] Installing Codex CLI..."
npm install -g @openai/codex

echo "[5/6] Installing Firebase CLI..."
npm install -g firebase-tools

echo "[6/6] Done."
echo ""
echo "Next steps:"
echo "1. Run: codex login"
echo "2. Move your repo into the Linux filesystem, for example:"
echo "   mkdir -p ~/work && cd ~/work"
echo "   git clone <your-repo-url> humanpartner-mall"
echo "3. Start Codex in the repo:"
echo "   cd ~/work/humanpartner-mall"
echo "   codex"
echo ""
echo "Recommended examples:"
echo "  codex"
echo "  codex \"이 프로젝트 구조 분석해줘\""
echo "  codex -C ~/work/humanpartner-mall"
