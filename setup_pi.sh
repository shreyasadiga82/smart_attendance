#!/bin/bash
# ==============================================================================
# Smart Attendance System - Raspberry Pi 3 Model B Setup Script
# Target OS: Raspberry Pi OS Lite (64-bit, Debian Bookworm or Bullseye)
# Hardware: Raspberry Pi 3 Model B (1GB RAM)
# NOTE: Does NOT require Node/npm on the Pi; uses prebuilt frontend dist.
# ==============================================================================
set -e

if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root: sudo ./setup_pi.sh"
  exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
USER_HOME=$(eval echo "~$REAL_USER")
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect LCD_MODE from existing .env or environment variable (default: parallel)
LCD_MODE="${LCD_MODE:-parallel}"
if [ -f "$INSTALL_DIR/backend/.env" ]; then
    ENV_LCD_MODE=$(grep -E "^LCD_MODE=" "$INSTALL_DIR/backend/.env" | cut -d '=' -f2 | tr -d ' "' || true)
    [ -n "$ENV_LCD_MODE" ] && LCD_MODE="$ENV_LCD_MODE"
elif [ -f "$INSTALL_DIR/.env" ]; then
    ENV_LCD_MODE=$(grep -E "^LCD_MODE=" "$INSTALL_DIR/.env" | cut -d '=' -f2 | tr -d ' "' || true)
    [ -n "$ENV_LCD_MODE" ] && LCD_MODE="$ENV_LCD_MODE"
fi

echo "=================================================================="
echo "  Smart Attendance System - Raspberry Pi 3 Model B Optimizer"
echo "  Target User: $REAL_USER"
echo "  Directory:   $INSTALL_DIR"
echo "  LCD Mode:    $LCD_MODE"
echo "=================================================================="

# 1. Update OS repositories
echo "[1/8] Updating apt repositories..."
apt-get update -y

# 2. Install native system dependencies
echo "[2/8] Installing essential hardware and Python libraries..."
apt-get install -y --no-install-recommends \
    python3-pip python3-venv python3-dev build-essential \
    libatlas-base-dev libavcodec-dev libavformat-dev libswscale-dev libv4l-dev \
    libxvidcore-dev libx264-dev libgl1-mesa-glx python3-smbus \
    zram-tools libcamera-dev v4l-utils
if [ "$LCD_MODE" = "i2c" ]; then
    apt-get install -y --no-install-recommends i2c-tools
fi

# 3. Configure ZRAM Swap (Crucial for 1GB RAM on Pi 3 Model B)
echo "[3/8] Configuring ZRAM swap for memory efficiency..."
if [ -f /etc/default/zramswap ]; then
    sed -i 's/^#*ALLOCATION=.*/ALLOCATION=512/' /etc/default/zramswap
    sed -i 's/^#*PRIORITY=.*/PRIORITY=100/' /etc/default/zramswap
    systemctl restart zramswap || true
fi

# 4. Enable Camera, GPU memory allocation, and conditional I2C
echo "[4/8] Configuring boot firmware (Camera, GPU Memory, LCD Mode: $LCD_MODE)..."
CONFIG_FILE="/boot/firmware/config.txt"
[ ! -f "$CONFIG_FILE" ] && CONFIG_FILE="/boot/config.txt"

if [ -f "$CONFIG_FILE" ]; then
    # Enable Camera
    if ! grep -q "^start_x=1" "$CONFIG_FILE"; then
        echo "start_x=1" >> "$CONFIG_FILE"
    fi
    # Allocate 128MB GPU memory for video buffer
    if grep -q "^gpu_mem=" "$CONFIG_FILE"; then
        sed -i 's/^gpu_mem=.*/gpu_mem=128/' "$CONFIG_FILE"
    else
        echo "gpu_mem=128" >> "$CONFIG_FILE"
    fi

    # Enable I2C only if LCD_MODE=i2c
    if [ "$LCD_MODE" = "i2c" ]; then
        echo "Enabling I2C in $CONFIG_FILE for I2C LCD backpack..."
        if ! grep -q "^dtparam=i2c_arm=on" "$CONFIG_FILE"; then
            echo "dtparam=i2c_arm=on" >> "$CONFIG_FILE"
        fi
    else
        echo "LCD_MODE is '$LCD_MODE' (parallel 4-bit default): skipping I2C bus activation."
    fi
fi

# Load I2C kernel module only if using I2C
if [ "$LCD_MODE" = "i2c" ]; then
    modprobe i2c-dev || true
fi

# 5. Add user to hardware groups
echo "[5/8] Granting hardware permissions (gpio, video, conditional i2c)..."
usermod -a -G gpio,video "$REAL_USER" || true
if [ "$LCD_MODE" = "i2c" ]; then
    usermod -a -G i2c "$REAL_USER" || true
fi

# 6. Python Virtual Environment Setup (Lean Pi 3 requirements)
echo "[6/8] Creating Python virtual environment..."
cd "$INSTALL_DIR/backend"
if [ ! -d "venv" ]; then
    sudo -u "$REAL_USER" python3 -m venv venv
fi

sudo -u "$REAL_USER" "$INSTALL_DIR/backend/venv/bin/pip" install --upgrade pip setuptools wheel
if [ -f "requirements-pi.txt" ]; then
    sudo -u "$REAL_USER" "$INSTALL_DIR/backend/venv/bin/pip" install -r requirements-pi.txt
else
    sudo -u "$REAL_USER" "$INSTALL_DIR/backend/venv/bin/pip" install -r requirements.txt
fi

# 7. Configure Pi 3 Profile Environment
echo "[7/8] Generating .env configuration for Pi 3 profile..."
if [ ! -f "$INSTALL_DIR/backend/.env" ]; then
    sudo -u "$REAL_USER" bash -c "cat << 'EOF' > '$INSTALL_DIR/backend/.env'
PROFILE=pi3
FACE_ENGINE=opencv_sface
STREAM_FPS=2
FRAME_WIDTH=320
DETECT_EVERY_N_FRAMES=3
MAX_FACES=1
RECOGNITION_THRESHOLD=0.363
LIVENESS_CHECK=true
NOTIFIER_TYPE=console
LCD_MODE=parallel
LCD_RS_PIN=25
LCD_E_PIN=24
LCD_D4_PIN=5
LCD_D5_PIN=6
LCD_D6_PIN=13
LCD_D7_PIN=19
LCD_I2C_ADDR=39
PIN_LED_GREEN=17
PIN_LED_RED=27
PIN_BUZZER=22
PIN_BUTTON=23
EOF"
fi

# 8. Install Systemd Services
echo "[8/8] Installing systemd services..."
if [ -f "$INSTALL_DIR/scripts/systemd/smart-attendance.service" ]; then
    cp "$INSTALL_DIR/scripts/systemd/smart-attendance.service" /etc/systemd/system/
    sed -i "s|/home/pi/smart_attendance|$INSTALL_DIR|g" /etc/systemd/system/smart-attendance.service
    sed -i "s|User=pi|User=$REAL_USER|g" /etc/systemd/system/smart-attendance.service
    sed -i "s|Group=pi|Group=$REAL_USER|g" /etc/systemd/system/smart-attendance.service
    systemctl daemon-reload
    systemctl enable smart-attendance.service || true
fi

echo "=================================================================="
echo "  Raspberry Pi 3 Setup Complete!"
echo "  Note: Frontend uses prebuilt dist from packaging (no npm required)."
echo "  To launch: sudo systemctl start smart-attendance.service"
echo "  To monitor: sudo journalctl -u smart-attendance.service -f"
echo "=================================================================="
