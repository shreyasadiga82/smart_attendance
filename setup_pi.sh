#!/bin/bash
set -e

echo "==============================================="
echo "  Smart Attendance System - Raspberry Pi 3 Setup"
echo "==============================================="

# Update package lists
echo "[1/7] Updating package lists..."
sudo apt-get update

# Install system dependencies
echo "[2/7] Installing system dependencies..."
sudo apt-get install -y python3-pip python3-venv python3-dev build-essential \
  libatlas-base-dev libavcodec-dev libavformat-dev libswscale-dev libv4l-dev \
  libxvidcore-dev libx264-dev \
  libgl1-mesa-glx # Needed by some OpenCV operations

# Setup virtual environment
echo "[3/7] Setting up Python virtual environment..."
cd "$(dirname "$0")"
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
python3 -m pip install --upgrade pip setuptools wheel

# Install backend requirements (exclude heavy dependencies for pi3 profile)
echo "[4/7] Installing Python dependencies..."
cd backend
# We remove insightface and onnxruntime from the install for Pi3
grep -v "insightface" requirements.txt | grep -v "onnxruntime" > requirements_pi.txt
pip install -r requirements_pi.txt

# Install OpenCV Headless for Pi
echo "Installing OpenCV Headless..."
pip install opencv-python-headless numpy<2

# Create .env for Raspberry Pi
echo "[5/7] Creating .env file for Pi 3 Profile..."
cat << EOF > .env
PROFILE=pi3
FACE_ENGINE=opencv_sface
STREAM_FPS=2
FRAME_WIDTH=320
DETECT_EVERY_N_FRAMES=3
MAX_FACES=1
RECOGNITION_THRESHOLD=0.363
EOF

cd ..

# Build frontend
echo "[6/7] Building Frontend..."
# Check for Node.js
if ! command -v npm &> /dev/null
then
    echo "Node.js not found. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

cd frontend
npm install
npm run build
cd ..

# Create Systemd Service
echo "[7/7] Setting up systemd service..."
SERVICE_FILE="/etc/systemd/system/smart-attendance.service"
sudo bash -c "cat << EOF > $SERVICE_FILE
[Unit]
Description=Smart Attendance FastAPI Service
After=network.target

[Service]
User=$USER
WorkingDirectory=$(pwd)/backend
Environment=\"PATH=$(pwd)/venv/bin\"
EnvironmentFile=$(pwd)/backend/.env
ExecStart=$(pwd)/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable smart-attendance.service

echo "==============================================="
echo "Setup Complete!"
echo "To start the system, run: sudo systemctl start smart-attendance.service"
echo "To view logs, run: sudo journalctl -fu smart-attendance.service"
echo "==============================================="
