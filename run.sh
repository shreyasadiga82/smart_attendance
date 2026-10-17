#!/bin/bash
set -e  # Exit on any error

echo "=============================================================="
echo "   Smart Attendance System - Installation and Setup Script"
echo "   For Linux/macOS"
echo "=============================================================="
echo

# Check if we're in the right directory
if [ ! -f "backend/requirements.txt" ]; then
    echo "Error: This script must be run from the smart_attendance directory"
    echo "Please navigate to the project folder and try again."
    exit 1
fi

# Step 1: Create Python virtual environment
echo "[1/7] Creating Python virtual environment..."
if [ ! -d "backend/venv" ]; then
    cd backend
    python3 -m venv venv
    cd ..
else
    echo "Virtual environment already exists."
fi

# Step 2: Activate virtual environment and install backend dependencies
echo "[2/7] Installing backend dependencies..."
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Step 3: Install frontend dependencies
echo "[3/7] Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Step 4: Generate SSL certificates if mkcert is available
echo "[4/7] Checking for mkcert and generating certificates..."
if command -v mkcert &> /dev/null; then
    echo "mkcert found. Generating SSL certificates..."
    python scripts/make_cert.py
else
    echo "mkcert not found. Skipping certificate generation."
    echo "To generate certificates for HTTPS (required for mobile camera):"
    echo "  1. Install mkcert (Linux: sudo apt install libnss3-tools, then follow mkcert installation)"
    echo "  2. Run: python scripts/make_cert.py"
fi

# Step 5: Create admin user
echo "[5/7] Creating admin user..."
source backend/venv/bin/activate
python scripts/create_admin.py

# Step 6: Seed demo data (optional)
echo "[6/7] Seeding demo data..."
read -p "Do you want to seed the database with demo data? (y/n): " seed
if [[ "$seed" == "y" || "$seed" == "Y" ]]; then
    source backend/venv/bin/activate
    python scripts/seed_demo.py
else
    echo "Skipping demo data seeding."
fi

# Step 7: Start the server
echo "[7/7] Starting the server..."
echo
echo "=============================================================="
echo "   Server starting..."
echo "   Backend API: http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   API Documentation: http://localhost:8000/docs"
echo
echo "   To access from mobile devices on the same network:"
echo "   - Find your computer's IP address (run hostname -I or ifconfig)"
echo "   - Use https://YOUR_IP:3000 if SSL certificates were generated"
echo "   - Use http://YOUR_IP:3000 if using HTTP"
echo
echo "   Press Ctrl+C to stop the server"
echo "=============================================================="
echo

# Set SSL environment variables if certificates exist
if [ -f "certs/localhost.pem" ]; then
    export SSL_KEYFILE="certs/localhost-key.pem"
    export SSL_CERTFILE="certs/localhost.pem"
    export USE_SSL=true
fi

# Start the backend server (which serves the frontend)
source backend/venv/bin/activate
uvicorn app.main:app --reload

# Deactivate virtual environment on exit (though the script will end when server stops)
deactivate