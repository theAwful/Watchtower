# Deploying Watchtower

Run Watchtower on a server so you can manage Proxmox VMs from one place. Access via **`http://<server-ip>:8080`** (or **`https://`** if you configure SSL). One process serves both the API and the UI.

---

## 1. Docker (recommended)

Stand up a container whenever you need it; no Node or build tools on the host.

### Prerequisites

- Docker and Docker Compose on the server
- Proxmox API token (Datacenter → Permissions → API Tokens)

### Steps

1. **Clone the repo** (e.g. from Gitea):

   ```bash
   git clone <your-gitea-url>/watchtower.git /opt/watchtower
   cd /opt/watchtower
   ```

2. **Configure environment** (`.env` in the same directory as `docker-compose.yml`):

   ```bash
   cp .env.example .env
   # Edit .env: set PROXMOX_HOST, PROXMOX_USER, PROXMOX_REALM, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET
   ```

3. **Build and run:**

   ```bash
   docker compose up -d
   ```

4. **Open** `http://<server-ip>:8080`.

### HTTPS with Docker

To use HTTPS (e.g. self-signed or Let’s Encrypt), mount the cert and key and point the app at them:

1. In `.env` add (paths are **inside** the container):

   ```env
   SSL_CERT_PATH=/run/secrets/ssl_cert
   SSL_KEY_PATH=/run/secrets/ssl_key
   ```

2. In `docker-compose.yml` uncomment and adjust the `volumes` under `watchtower`:

   ```yaml
   volumes:
     - /path/on/host/fullchain.pem:/run/secrets/ssl_cert:ro
     - /path/on/host/privkey.pem:/run/secrets/ssl_key:ro
   ```

3. Restart: `docker compose up -d --force-recreate`.

### Updating the image

```bash
cd /opt/watchtower
git pull
docker compose build --no-cache
docker compose up -d
```

---

## 2. Run on the host (no Docker)

### Prerequisites

- Node.js 18+ and npm
- Git (to clone the repo)

### Clone and install

```bash
git clone <your-gitea-url>/watchtower.git /opt/watchtower
cd /opt/watchtower
```

**Backend:**

```bash
cd backend-server
npm ci
```

**Frontend (build for production):**

```bash
cd /opt/watchtower/frontend
npm ci
npm run build
```

The backend will serve the built UI from `frontend/dist/`.

### Environment

```bash
cp /opt/watchtower/.env.example /opt/watchtower/backend-server/.env
# Edit backend-server/.env with Proxmox and optional SSL settings
```

Required for Proxmox:

- `PROXMOX_HOST` – Proxmox hostname or IP  
- `PROXMOX_USER`, `PROXMOX_REALM`, `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`

Optional: `PORT` (default 8080), `SSL_CERT_PATH`, `SSL_KEY_PATH` for HTTPS, OpenVPN vars if you use them.

### Run

**One-off (foreground):**

```bash
cd /opt/watchtower/backend-server
node server.js
```

**systemd (survives reboot):**

1. Create `/etc/systemd/system/watchtower.service`:

   ```ini
   [Unit]
   Description=Watchtower - Proxmox VM Management
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/watchtower/backend-server
   EnvironmentFile=/opt/watchtower/backend-server/.env
   ExecStart=/usr/bin/node server.js
   Restart=on-failure
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable watchtower
   sudo systemctl start watchtower
   sudo systemctl status watchtower
   ```

**PM2:**

```bash
npm install -g pm2
cd /opt/watchtower/backend-server
pm2 start server.js --name watchtower
pm2 save && pm2 startup
```

### HTTPS (non-Docker)

In `backend-server/.env` set:

- `SSL_CERT_PATH` – full path to certificate file  
- `SSL_KEY_PATH` – full path to private key file  

Use absolute paths. For IP-only access you can use a self-signed cert; the browser will show a warning you can bypass.

### Updating after code changes

```bash
cd /opt/watchtower
git pull

cd frontend && npm ci && npm run build
cd ../backend-server && npm ci
```

Then restart the service (systemd: `sudo systemctl restart watchtower` or PM2: `pm2 restart watchtower`).

---

## 3. Reverse proxy (optional)

To use a hostname and terminate SSL at a reverse proxy (e.g. `https://watchtower.yourdomain.com`), run Watchtower on HTTP (e.g. port 8080) and put Nginx (or Caddy) in front.

Example Nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

No need to set `SSL_*` in Watchtower; the proxy handles TLS.

---

## Summary

| Method    | Use when                          |
|----------|------------------------------------|
| **Docker** | You want a container; easiest to stand up and move. |
| **systemd** | You run Node on the host and want a service. |
| **PM2**  | You prefer PM2 for process management. |

All methods: configure Proxmox (and optional SSL) in `.env`, then open `http(s)://<server-ip>:8080` (or your `PORT`).
