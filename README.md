<div align="center">

# 🎓 Smart Attendance System
### *Edge-Ready Biometric Face Recognition & IoT Attendance Platform*

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Raspberry Pi](https://img.shields.io/badge/Raspberry_Pi-3_Model_B-C51A4A?style=for-the-badge&logo=raspberry-pi&logoColor=white)](https://www.raspberrypi.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

**A complete, production-grade biometric attendance tracking system powered by deep learning face recognition, WebSocket streaming, progressive web app (PWA) mobility, and Raspberry Pi IoT hardware integration.**

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Raspberry Pi Setup](#-raspberry-pi-deployment) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Project Structure](#-project-structure)

</div>

---

## 🌟 Key Features

| Capability | Description |
| :--- | :--- |
| 👁️ **Dual-Engine Face Recognition** | Powered by **InsightFace (buffalo_s)** for high-accuracy desktop/server workloads and **OpenCV SFace** for fast, low-memory ARM/Raspberry Pi inference. |
| 🛡️ **Liveness Detection & Anti-Spoofing** | Analyzes facial movement and texture dynamics to prevent spoof attacks from static photos or screens. |
| 📱 **Cross-Platform PWA & Mobile LAN** | Installable Progressive Web App (PWA) for iOS, Android, and Desktop. Includes zero-hassle HTTPS certificate setup for mobile camera permissions over local Wi-Fi. |
| 🍓 **Raspberry Pi 3 Model B Edge IoT** | Dedicated hardware client support with **16x2 I2C LCD**, **active buzzer audio cues**, **status LEDs**, and **physical push-button trigger**. |
| ⚡ **Low-Latency WebSocket Streaming** | Real-time bi-directional video frame recognition with sub-second feedback and live bounding box visualization. |
| 📊 **Analytics & Automated Reports** | Interactive dashboard with attendance trends, session donut charts, and one-click export to formatted Excel (`.xlsx`) or CSV sheets. |
| 🔔 **Multi-Channel Notifications** | Automatic parental or administrative notifications dispatched via **Console**, **WhatsApp Cloud API**, **Twilio SMS**, or **SMTP Email**. |
| 🔐 **Role-Based Security & Timings** | Admin authentication via hashed credentials and JWT tokens, coupled with configurable morning and afternoon session cutoffs. |

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Clients["📱 Client Interfaces"]
        Browser["React 18 PWA (Desktop / Mobile)"]
        PiClient["Raspberry Pi 3 Edge Client (edge/pi_client.py)"]
    end

    subgraph Hardware["🍓 IoT Hardware Peripherals"]
        Cam["Pi Camera / USB Cam"]
        LCD["16x2 I2C LCD (0x27)"]
        Buzzer["5V Active Buzzer"]
        LED["Green & Red Status LEDs"]
    end

    subgraph Backend["⚡ FastAPI Backend Engine (Python 3.11)"]
        Router["FastAPI Routers\n(Auth, Students, Attendance, Reports, Stream)"]
        WS["WebSocket Stream Manager"]
        
        subgraph Vision["🧠 Vision Subsystem"]
            Insight["InsightFace (buffalo_s)"]
            SFace["OpenCV SFace Engine"]
            Liveness["Liveness Verifier"]
        end
        
        subgraph Services["🛠️ Core Services"]
            AttService["Attendance Engine"]
            ReportGen["Excel & Report Service"]
            Notifier["Notification Dispatcher\n(WhatsApp / SMS / Mail)"]
        end
        
        DB[("SQLite Database\n(attendance.db)")]
    end

    Browser <-->|HTTP REST / WebSocket| Router
    PiClient <-->|WebSocket Stream & Telemetry| WS
    Cam --> PiClient
    PiClient --> LCD
    PiClient --> Buzzer
    PiClient --> LED

    Router --> WS
    WS --> Vision
    Vision --> AttService
    AttService --> DB
    AttService --> Notifier
    Router --> ReportGen
```

---

## 🍓 Raspberry Pi Deployment

The system is uniquely optimized to run on the **Raspberry Pi 3 Model B** (Broadcom BCM2837, Quad-Core Cortex-A53 @ 1.2 GHz, 1 GB RAM).

### 1. Deployment Topologies

```
┌────────────────────────────────────────────────────────────────────────┐
│ Mode A: Standalone Pi                                                  │
│   Pi runs FastAPI backend + OpenCV SFace + serves built PWA frontend.  │
├────────────────────────────────────────────────────────────────────────┤
│ Mode B: Pi Edge Client (Recommended)                                   │
│   Pi streams camera frames to PC/Server over WebSocket; PC runs AI;    │
│   PC replies with status; Pi displays name on LCD & beeps buzzer.      │
├────────────────────────────────────────────────────────────────────────┤
│ Mode C: Laptop / Workstation Only                                      │
│   Full standalone execution using InsightFace buffalo_s and webcam.    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2. GPIO Hardware Wiring Guide

#### 1602A HD44780 16x2 Character LCD (4-bit Parallel, Default `LCD_MODE=parallel`)
| 1602A Pin | Signal | Physical Pin | BCM GPIO | Notes |
| :---: | :--- | :--- | :--- | :--- |
| **1** | VSS (GND) | Pin 6 | GND | Power ground |
| **2** | VDD (+5V) | Pin 2 | +5V | Logic power |
| **3** | V0 (Contrast) | Pot Center | Contrast | Wiper of 10kΩ pot between 5V/GND (or 1k-2.2kΩ to GND) |
| **4** | RS | Pin 22 | **GPIO 25** | Register Select |
| **5** | RW | Ground Rail | GND | Tied to GND (Write mode) |
| **6** | E | Pin 18 | **GPIO 24** | Enable clock |
| **11** | D4 | Pin 29 | **GPIO 5** | 4-bit Data line 4 |
| **12** | D5 | Pin 31 | **GPIO 6** | 4-bit Data line 5 |
| **13** | D6 | Pin 33 | **GPIO 13** | 4-bit Data line 6 |
| **14** | D7 | Pin 35 | **GPIO 19** | 4-bit Data line 7 |
| **15** | A (LED+) | Pin 4 | +5V (via 220Ω) | Backlight Anode with 220Ω current limiting resistor |
| **16** | K (LED-) | Pin 34 | GND | Backlight Cathode to GND |

#### Status Indicators & Controls
| Peripheral | Component | Physical Pin | BCM GPIO | Circuit Connection |
| :--- | :--- | :--- | :--- | :--- |
| **Green LED** | Anode (+) | Pin 11 | **GPIO 17** | 330Ω resistor in series to LED (+) -> Cathode to GND |
| **Red LED** | Anode (+) | Pin 13 | **GPIO 27** | 330Ω resistor in series to LED (+) -> Cathode to GND |
| **Active Buzzer** | Signal (+) | Pin 15 | **GPIO 22** | 5V Active Buzzer (+) -> Buzzer (-) to GND |
| **Push Button** | Terminal 1 | Pin 16 | **GPIO 23** | Terminal 1 to GPIO 23, Terminal 2 to GND (Pin 14) |

*(Optional I2C LCD with PCF8574 backpack: set `LCD_MODE=i2c` in `.env` with SDA on GPIO 2, SCL on GPIO 3, default address `0x27`).*

---

### 3. Mode B: Pi Edge Client Setup

In Mode B, your laptop/server runs the heavy InsightFace AI backend, and the Raspberry Pi runs as a lightweight camera + LCD terminal.

```bash
# 1. On your Raspberry Pi, navigate to the edge directory
cd ~/smart_attendance/edge

# 2. Set up virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-pi-client.txt

# 3. Launch the edge client:
# If your laptop backend is on HTTP / unencrypted ws://:
EDGE_SERVER_URL=ws://192.168.1.100:8000/ws/recognition python pi_client.py

# If your laptop backend is on HTTPS / wss://:
# To trust local mkcert CA:
EDGE_SERVER_URL=wss://192.168.1.100:8000/ws/recognition EDGE_CA_FILE=../certs/rootCA.pem python pi_client.py

# Or to bypass SSL certificate validation on trusted LAN:
EDGE_SERVER_URL=wss://192.168.1.100:8000/ws/recognition EDGE_VERIFY_SSL=false python pi_client.py
```


## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** installed and added to PATH
- **Node.js 18+** & npm
- **Git**
- *(Optional)* [mkcert](https://github.com/FiloSottile/mkcert) for generating trusted local HTTPS certificates (required for mobile browser camera access)

---

### Option 1: Automated Launchers (Recommended)

#### 🪟 Windows (PowerShell)
```powershell
.\start.ps1
```

#### 🪟 Windows (CMD Batch)
```cmd
run.bat
```

#### 🐧 Linux / 🍎 macOS
```bash
chmod +x run.sh
./run.sh
```

The automated script automatically:
1. Creates a Python virtual environment (`backend/venv`)
2. Installs backend dependencies (`backend/requirements.txt`)
3. Installs frontend packages and builds the UI
4. Provisions local SSL certificates via `mkcert` (if present)
5. Seeds the administrative account (`admin` / `admin123`)
6. Launches the FastAPI server and Vite frontend

---

### Option 2: Step-by-Step Manual Setup

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txtact

# Create admin user
python ../scripts/create_admin.py

# Optional: Seed demo students and records
python ../scripts/seed_demo.py

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

---

## 📱 Mobile & PWA Access (Camera on Phones)

Modern mobile browsers (iOS Safari, Android Chrome) **block camera access (`getUserMedia`) on unencrypted HTTP connections** unless accessed through `localhost`.

To use phone cameras over your local Wi-Fi, install [mkcert](https://github.com/FiloSottile/mkcert) using the single dedicated package method for your operating system:

- **Windows** (via Chocolatey):
  ```powershell
  choco install mkcert
  mkcert -install
  ```
- **macOS** (via Homebrew):
  ```bash
  brew install mkcert
  mkcert -install
  ```
- **Linux** (Debian, Ubuntu, Raspberry Pi OS):
  ```bash
  sudo apt update && sudo apt install -y libnss3-tools curl
  # Download standalone binary for your architecture (amd64 or arm64)
  curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/$(dpkg --print-architecture)"
  chmod +x mkcert-v*-linux-*
  sudo cp mkcert-v*-linux-* /usr/local/bin/mkcert
  mkcert -install
  ```

2. Generate local certificates:
   ```bash
   python scripts/make_cert.py
   ```
3. Start the server with SSL enabled:
   ```bash
   # Set in .env or pass through environment
   USE_SSL=true
   SSL_CERTFILE=certs/cert.pem
   SSL_KEYFILE=certs/key.pem
   ```
4. Find your machine's local IP address (`ipconfig` on Windows or `hostname -I` on Linux) and open `https://<YOUR_LOCAL_IP>:3000` on your smartphone!
5. Tap **"Add to Home Screen"** to install as a standalone PWA application.

---

## ⚙️ Configuration

Copy `.env.example` to `backend/.env` and configure as required:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PROFILE` | `laptop` | Profile preset: `laptop` or `pi3` (Pi 3 Model B optimizations) |
| `SECRET_KEY` | *changeme* | Secret key for JWT signature creation |
| `ALGORITHM` | `HS256` | Token hashing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT expiration (24 hours) |
| `DATABASE_URL` | `sqlite:///../data/attendance.db` | SQLite database URI |
| `FACE_ENGINE` | `insightface` | Recognition engine: `insightface` or `opencv_sface` |
| `RECOGNITION_THRESHOLD` | `0.45` | Cosine similarity threshold for identity match |
| `LIVENESS_CHECK` | `true` | Enable/disable anti-spoof liveness verification |
| `NOTIFIER_TYPE` | `console` | Dispatcher type: `console`, `whatsapp`, `sms`, `email` |
| `LCD_MODE` | `parallel` | LCD driver: `parallel` (1602A HD44780 4-bit) or `i2c` (PCF8574) |
| `LCD_RS_PIN` | `25` | 1602A Register Select GPIO (BCM) |
| `LCD_E_PIN` | `24` | 1602A Enable Strobe GPIO (BCM) |
| `LCD_D4_PIN`..`D7_PIN` | `5, 6, 13, 19` | 1602A 4-bit Data GPIOs (BCM) |
| `LCD_I2C_ADDR` | `39` | PCF8574 I2C address (0x27 in decimal) when `LCD_MODE=i2c` |
| `PIN_LED_GREEN` | `17` | Green LED indicator GPIO (BCM) |
| `PIN_LED_RED` | `27` | Red LED indicator GPIO (BCM) |
| `PIN_BUZZER` | `22` | Active Buzzer GPIO (BCM) |
| `PIN_BUTTON` | `23` | Push Button GPIO (BCM, pull-up) |
| `EDGE_SERVER_URL` | `ws://...` | WebSocket stream endpoint for `edge/pi_client.py` |
| `EDGE_VERIFY_SSL` | `true` | Validate SSL certificates on `wss://` connections |
| `EDGE_CA_FILE` | *(empty)* | Optional path to local root CA (e.g. `certs/rootCA.pem`) |
| `SESSION_MORNING_START` | `08:30` | Morning session attendance start time |
| `SESSION_MORNING_END` | `10:00` | Morning session cutoff |
| `SESSION_AFTERNOON_START`| `13:30` | Afternoon session attendance start time |
| `SESSION_AFTERNOON_END` | `15:00` | Afternoon session cutoff |
| `USE_SSL` | `false` | Enable HTTPS mode (`true` / `false`) |
| `SSL_CERTFILE` | `certs/cert.pem` | Path to SSL public certificate |
| `SSL_KEYFILE` | `certs/key.pem` | Path to SSL private key |

---

## 📁 Project Structure

```
smart_attendance/
├── backend/                       # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py                # Application entrypoint & middleware
│   │   ├── config.py              # Pydantic v2 settings management
│   │   ├── database.py            # SQLite SQLAlchemy connection
│   │   ├── models.py              # Student, Attendance, Session models
│   │   ├── schemas.py             # Validation schemas
│   │   ├── security.py            # Bcrypt password & JWT handling
│   │   ├── routers/               # Modular REST endpoints
│   │   │   ├── auth.py            # Login & token generation
│   │   │   ├── students.py        # Student records CRUD
│   │   │   ├── enrollment.py      # Multi-angle face capture
│   │   │   ├── attendance.py      # Attendance verification
│   │   │   ├── stream.py          # WebSocket video stream handler
│   │   │   ├── dashboard.py       # Metrics & summary counts
│   │   │   ├── reports.py         # Excel & CSV downloads
│   │   │   └── settings.py        # System configuration APIs
│   │   └── services/              # Business logic & hardware drivers
│   │       ├── face_engine.py     # InsightFace & SFace inference engines
│   │       ├── liveness.py        # Anti-spoofing verification
│   │       ├── attendance_service.py # Attendance validation rules
│   │       ├── notifier.py        # WhatsApp, SMS, Console notifications
│   │       ├── mailer.py          # SMTP email delivery
│   │       ├── report_service.py  # OpenpyXL formatted report generation
│   │       └── hardware/          # Camera capture & Pi GPIO controllers
│   └── requirements.txt           # Python backend dependencies
│
├── frontend/                      # React 18 + Vite PWA
│   ├── src/
│   │   ├── components/            # Reusable UI & Layout components
│   │   │   ├── camera/            # Camera feed, overlays & device selector
│   │   │   ├── charts/            # Recharts trends & session donuts
│   │   │   ├── layout/            # AppShell, NavRail, BottomNav, TopBar
│   │   │   └── ui/                # Buttons, Dialogs, Cards, Inputs, Toast
│   │   ├── pages/                 # Full view pages
│   │   │   ├── Dashboard.tsx      # System overview & live stats
│   │   │   ├── LiveAttendance.tsx # Real-time recognition monitor
│   │   │   ├── EnrollStudent.tsx  # Interactive biometric enrollment
│   │   │   ├── Students.tsx       # Student roster management
│   │   │   ├── Records.tsx        # Searchable attendance log
│   │   │   ├── Reports.tsx        # Filterable Excel report generator
│   │   │   ├── Settings.tsx       # Dynamic system & timing configs
│   │   │   └── Login.tsx          # Admin login screen
│   │   ├── hooks/                 # Custom React hooks (camera, WebSocket)
│   │   └── lib/                   # API clients & authentication helpers
│   └── package.json               # Frontend dependencies
│
├── edge/                          # Raspberry Pi 3 Edge Software
│   ├── pi_client.py               # Lightweight streaming edge client
│   └── requirements-pi-client.txt # Edge dependencies
│
├── scripts/                       # Maintenance & Setup Utilities
│   ├── make_cert.py               # Local SSL certificate generator
│   ├── create_admin.py            # Initial administrator creation
│   ├── seed_demo.py               # Sample database population
│   └── package_for_pi.py          # Bundle packager for Raspberry Pi OS
│
├── run.bat                        # Windows CMD 1-click runner
├── start.ps1                      # Windows PowerShell 1-click runner
├── run.sh                         # Linux / macOS 1-click runner
└── setup_pi.sh                    # Raspberry Pi OS system setup script
```

---

## 🔒 Security Best Practices

1. **Change Default Credentials**: Log into the application and immediately update the admin password under **Settings → Security**.
2. **Rotate JWT Secret**: Update `SECRET_KEY` in `backend/.env` with a cryptographically secure random string before production deployment.
3. **Database Privacy**: The local SQLite database (`data/attendance.db`) and enrolled facial embedding matrices are strictly isolated and ignored by `.gitignore` to protect personal biometric information.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.

<div align="center">
<sub>Built with precision for seamless biometric attendance tracking.</sub>
</div>