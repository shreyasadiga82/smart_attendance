#!/usr/bin/env python3
"""
Script to generate SSL certificates for local development using mkcert.
If mkcert is not installed, it will provide instructions to install it.
"""

import os
import subprocess
import sys
from pathlib import Path

def check_mkcert_installed():
    """Check if mkcert is installed and available in PATH."""
    try:
        subprocess.run(['mkcert', '--version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_mkcert_instructions():
    """Print instructions for installing mkcert."""
    print("mkcert is not installed. Please install it first:")
    print("  Windows: choco install mkcert && mkcert -install")
    print("  macOS:   brew install mkcert && mkcert -install")
    print("  Linux (Debian/Ubuntu/Pi OS):")
    print("    sudo apt update && sudo apt install -y libnss3-tools curl")
    print("    curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'  # or linux/arm64 on Pi")
    print("    chmod +x mkcert-v*-linux-* && sudo cp mkcert-v*-linux-* /usr/local/bin/mkcert")
    print("    mkcert -install")
    print("After installing, run this script again.")
    sys.exit(1)

def generate_certificates():
    """Generate SSL certificates for localhost and LAN access."""
    # Create certificates directory if it doesn't exist
    cert_dir = Path(__file__).parent.parent / "certs"
    cert_dir.mkdir(exist_ok=True)

    # Change to certs directory
    os.chdir(cert_dir)

    # Generate certificate for localhost and common LAN patterns
    # We'll use the IP address of the machine, but for simplicity, we'll generate for localhost
    # In a real scenario, you might want to specify the IP or hostname
    domains = ["localhost", "127.0.0.1", "::1"]

    # Try to get the local IP address for LAN access
    try:
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        if local_ip not in domains:
            domains.append(local_ip)
    except:
        pass  # If we can't get the IP, just use localhost

    print(f"Generating certificate for domains: {', '.join(domains)}")

    # Run mkcert
    cmd = ["mkcert"] + domains
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)

        # Find the generated files
        cert_file = None
        key_file = None
        for file in os.listdir("."):
            if file.endswith(".pem") and "localhost" in file:
                cert_file = file
            elif file.endswith("-key.pem") and "localhost" in file:
                key_file = file

        if cert_file and key_file:
            print(f"\nCertificate generated successfully!")
            print(f"Certificate file: {cert_file}")
            print(f"Key file: {key_file}")
            print(f"\nTo use these certificates, set the following environment variables:")
            print(f"  SSL_KEYFILE={os.path.abspath(key_file)}")
            print(f"  SSL_CERTFILE={os.path.abspath(cert_file)}")
            print(f"  USE_SSL=true")
        else:
            print("Warning: Could not locate generated certificate files.")
            print("Files in directory:", os.listdir("."))

    except subprocess.CalledProcessError as e:
        print(f"Error running mkcert: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)

if __name__ == "__main__":
    if not check_mkcert_installed():
        install_mkcert_instructions()

    generate_certificates()