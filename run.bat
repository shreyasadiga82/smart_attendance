@echo off
setlocal enabledelayedexpansion

echo.
echo ==============================================================
echo   Smart Attendance System - Installation and Setup Script
echo   For Windows
echo ==============================================================
echo.

:: Check if we're in the right directory
if not exist "backend\requirements.txt" (
    echo Error: This script must be run from the smart_attendance directory
    echo Please navigate to the project folder and try again.
    pause
    exit /b 1
)

:: Step 1: Create Python virtual environment
echo [1/7] Creating Python virtual environment...
if not exist "backend\venv" (
    cd backend
    python -m venv venv
    cd ..
) else (
    echo Virtual environment already exists.
)

:: Step 2: Activate virtual environment and install backend dependencies
echo [2/7] Installing backend dependencies...
call backend\venv\Scripts\activate
pip install -r backend\requirements.txt

:: Step 3: Install frontend dependencies
echo [3/7] Installing frontend dependencies...
cd frontend
npm install
cd ..

:: Step 4: Generate SSL certificates if mkcert is available
echo [4/7] Checking for mkcert and generating certificates...
where mkcert >nul 2>&1
if !errorlevel! equ 0 (
    echo mkcert found. Generating SSL certificates...
    python scripts\make_cert.py
) else (
    echo mkcert not found. Skipping certificate generation.
    echo To generate certificates for HTTPS (required for mobile camera):
    echo   1. Install mkcert: choco install mkcert
    echo   2. Run: python scripts\make_cert.py
)

:: Step 5: Create admin user
echo [5/7] Creating admin user...
call backend\venv\Scripts\activate
python scripts\create_admin.py

:: Step 6: Seed demo data (optional)
echo [6/7] Seeding demo data...
set /p seed=Do you want to seed the database with demo data? (y/n):
if /i "%seed%"=="y" (
    call backend\venv\Scripts\activate
    python scripts\seed_demo.py
) else (
    echo Skipping demo data seeding.
)

:: Step 7: Start the server
echo [7/7] Starting the server...
echo.
echo ==============================================================
echo   Server starting...
echo   Backend API: http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Documentation: http://localhost:8000/docs
echo.
echo   To access from mobile devices on the same network:
echo   - Find your computer's IP address (run ipconfig)
echo   - Use https://YOUR_IP:3000 if SSL certificates were generated
echo   - Use http://YOUR_IP:3000 if using HTTP
echo.
echo   Press Ctrl+C to stop the server
echo ==============================================================
echo.

:: Set SSL environment variables if certificates exist
if exist "certs\localhost.pem" (
    set SSL_KEYFILE=certs\localhost-key.pem
    set SSL_CERTFILE=certs\localhost.pem
    set USE_SSL=true
)

:: Start the backend server (which serves the frontend)
call backend\venv\Scripts\activate
uvicorn app.main:app --reload

endlocal
pause