# Starting the Smart Attendance Project

This document outlines how to easily start and run the Smart Attendance system on Windows using the provided `start.ps1` script.

## The `start.ps1` Script

The repository includes a PowerShell script `start.ps1` designed to automate the entire installation and startup process for Windows users.

### What the script does:
1. **Creates a Virtual Environment**: Sets up an isolated Python environment (`backend/venv`).
2. **Installs Backend Dependencies**: Installs all required Python packages from `backend/requirements.txt`.
3. **Installs Frontend Dependencies**: Runs `npm install` to download all React/Vite dependencies.
4. **Generates SSL Certificates**: Uses `mkcert` (if available) to generate trusted HTTPS certificates. (HTTPS is required by browsers to access your webcam).
5. **Initializes the Database**: Sets up the SQLite database and creates the default `admin` user.
6. **Seeds Demo Data**: Populates the database with some sample students so you can test right away.
7. **Starts Both Servers**: 
   - Launches the FastAPI backend on port `8000`.
   - Launches the Vite React frontend on port `3000`.

### How to use it:

1. Open **PowerShell** (not CMD).
2. Navigate to the project root directory:
   ```powershell
   cd C:\Users\User\Desktop\smart_attendance
   ```
3. Execute the script:
   ```powershell
   .\start.ps1
   ```

*(Note: If you receive an execution policy error, you may need to run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

### Accessing the App

Once the script finishes starting both servers, you can access the application in your browser:
- **URL**: `http://localhost:3000` (or `https://localhost:3000` if SSL was configured).
- **Default Login**:
  - Username: `admin`
  - Password: `admin123`

To stop the servers, simply press `Ctrl+C` in the PowerShell window where the script is running.
