#!/usr/bin/env python3
import os
import subprocess
import shutil
import tarfile
from pathlib import Path

def main():
    print("Building frontend...")
    frontend_dir = Path("frontend")
    
    # Check if npm exists
    if shutil.which("npm") is None:
        print("Error: npm is not installed. Please install Node.js.")
        return

    # Run npm install and npm run build
    subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
    subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True)
    
    print("Packaging for Raspberry Pi...")
    
    # Create a distribution folder
    dist_dir = Path("smart_attendance_pi")
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    dist_dir.mkdir()
    
    # Copy backend (excluding venv, __pycache__)
    print("Copying backend...")
    shutil.copytree("backend", dist_dir / "backend", ignore=shutil.ignore_patterns("venv", "__pycache__", "*.pyc", "*.db", "data"))
    
    # Copy frontend dist
    print("Copying frontend dist...")
    shutil.copytree("frontend/dist", dist_dir / "frontend/dist")
    
    # Copy edge scripts
    print("Copying edge client...")
    shutil.copytree("edge", dist_dir / "edge", ignore=shutil.ignore_patterns("__pycache__"))
    
    # Copy scripts
    print("Copying scripts...")
    shutil.copytree("scripts", dist_dir / "scripts", ignore=shutil.ignore_patterns("__pycache__"))
    
    # Copy root files
    print("Copying root files...")
    for f in [".env.example", "setup_pi.sh", "README.md", "run.sh"]:
        if Path(f).exists():
            shutil.copy(f, dist_dir / f)
            
    # Create empty data directories
    (dist_dir / "data" / "faces").mkdir(parents=True)
    (dist_dir / "data" / "models").mkdir(parents=True)
    (dist_dir / "data" / "reports").mkdir(parents=True)
    (dist_dir / "data" / "logs").mkdir(parents=True)
    
    # Add systemd service files
    print("Writing systemd service files...")
    
    svc_backend = """[Unit]
Description=Smart Attendance Backend
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/smart_attendance_pi
ExecStart=/home/pi/smart_attendance_pi/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
"""
    with open(dist_dir / "smart-attendance.service", "w") as f:
        f.write(svc_backend)
        
    svc_edge = """[Unit]
Description=Smart Attendance Edge Client
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/smart_attendance_pi/edge
ExecStart=/home/pi/smart_attendance_pi/edge/venv/bin/python pi_client.py
Restart=always
Environment=SERVER_URL=ws://192.168.1.100:8000/ws/recognition
Environment=DEVICE_TOKEN=default_edge_token

[Install]
WantedBy=multi-user.target
"""
    with open(dist_dir / "smart-attendance-edge.service", "w") as f:
        f.write(svc_edge)
        
    print("Creating tarball...")
    with tarfile.open("smart_attendance_pi.tar.gz", "w:gz") as tar:
        tar.add(dist_dir, arcname=os.path.basename(dist_dir))
        
    # Clean up the dist directory if you want, but keeping it is fine for preview
    shutil.rmtree(dist_dir)
    print("Done! Transfer smart_attendance_pi.tar.gz to your Raspberry Pi.")

if __name__ == "__main__":
    main()
