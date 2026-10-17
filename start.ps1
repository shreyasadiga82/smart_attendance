<#
.SYNOPSIS
Smart Attendance System - Installation and Setup Script for Windows (PowerShell)
#>

Write-Host ""
Write-Host "=============================================================="
Write-Host "  Smart Attendance System - Installation and Setup Script"
Write-Host "  For Windows (PowerShell)"
Write-Host "=============================================================="
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend\requirements.txt")) {
    Write-Host "Error: This script must be run from the smart_attendance directory" -ForegroundColor Red
    Write-Host "Please navigate to the project folder and try again."
    pause
    exit 1
}

# Step 1: Create Python virtual environment
Write-Host "[1/7] Creating Python virtual environment..." -ForegroundColor Cyan
if (-not (Test-Path "backend\venv")) {
    Push-Location backend
    python -m venv venv
    Pop-Location
} else {
    Write-Host "Virtual environment already exists."
}

# Step 2: Activate virtual environment and install backend dependencies
Write-Host "[2/7] Installing backend dependencies..." -ForegroundColor Cyan
. "backend\venv\Scripts\activate.ps1"
pip install -r backend\requirements.txt

# Step 3: Install frontend dependencies
Write-Host "[3/7] Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location frontend
npm install
npm run build
Pop-Location

# Step 4: Generate SSL certificates if mkcert is available
Write-Host "[4/7] Checking for mkcert and generating certificates..." -ForegroundColor Cyan
if (Get-Command mkcert -ErrorAction SilentlyContinue) {
    Write-Host "mkcert found. Generating SSL certificates..."
    python scripts\make_cert.py
} else {
    Write-Host "mkcert not found. Skipping certificate generation." -ForegroundColor Yellow
    Write-Host "To generate certificates for HTTPS (required for mobile camera):"
    Write-Host "  1. Install mkcert: choco install mkcert"
    Write-Host "  2. Run: python scripts\make_cert.py"
}

# Step 5: Create admin user
Write-Host "[5/7] Creating admin user..." -ForegroundColor Cyan
. "backend\venv\Scripts\activate.ps1"
python scripts\create_admin.py

# Step 6: Seed demo data (optional)
Write-Host "[6/7] Seeding demo data..." -ForegroundColor Cyan
$seed = Read-Host "Do you want to seed the database with demo data? (y/n)"
if ($seed -match "^[yY]$") {
    . "backend\venv\Scripts\activate.ps1"
    python scripts\seed_demo.py
} else {
    Write-Host "Skipping demo data seeding."
}

# Step 7: Start the server
Write-Host "[7/7] Starting the server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "=============================================================="
Write-Host "  Server starting..."
Write-Host "  Backend API: http://localhost:8000"
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  API Documentation: http://localhost:8000/docs"
Write-Host ""
Write-Host "  To access from mobile devices on the same network:"
Write-Host "  - Find your computer's IP address (run ipconfig)"
Write-Host "  - Use https://YOUR_IP:3000 if SSL certificates were generated"
Write-Host "  - Use http://YOUR_IP:3000 if using HTTP"
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server"
Write-Host "=============================================================="
Write-Host ""

# Set SSL environment variables if certificates exist
if (Test-Path "certs\localhost.pem") {
    $env:SSL_KEYFILE = "certs\localhost-key.pem"
    $env:SSL_CERTFILE = "certs\localhost.pem"
    $env:USE_SSL = "true"
}

# Start the backend server (which serves the frontend)
. "backend\venv\Scripts\activate.ps1"
$env:PYTHONPATH = "backend"
uvicorn app.main:app --reload --app-dir backend

pause
