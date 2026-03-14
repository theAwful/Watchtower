# Deploying Watchtower on Your Server

This guide covers running Watchtower on a dedicated server (e.g. your “Watchtower server”) with code hosted in Gitea. One Node process serves both the API and the built frontend.

**Access:** Open **`http://<server-ip>:8080`** in a browser (or whatever port you set in `PORT`). One port for the whole app—no separate frontend port like 5173 in production.

---

## 1. Prerequisites on the server

- **Node.js 18+** and npm
- **Git** (to clone from Gitea)
- Access to your **Gitea** instance from this server (clone via SSH or HTTPS)

---

## 2. Clone and install

Clone the repo from Gitea (replace with your Gitea URL and path):

```bash
# Example: clone via SSH
git clone git@your-gitea-host:your-org/watchtower.git /opt/watchtower
cd /opt/watchtower
```

Install dependencies and build the frontend:

```bash
# Backend
cd backend-server
npm ci
cd ..

# Frontend (build for production)
cd frontend
npm ci
npm run build
cd ..
```

The built UI will be in `frontend/dist/`. The backend will serve it automatically when you start the server.

---

## 3. Environment configuration

Copy the example env file into `backend-server` (the server loads `.env` from that directory) and edit with your real values (do not commit `.env`):

```bash
cp .env.example backend-server/.env
# Edit backend-server/.env with your Proxmox (and optional OpenVPN) settings
```

Required for Proxmox:

- `PROXMOX_HOST` – Proxmox hostname or IP
- `PROXMOX_USER` – e.g. `svc_WatchTower`
- `PROXMOX_REALM` – e.g. `pam`
- `PROXMOX_TOKEN_ID` – token name from Proxmox
- `PROXMOX_TOKEN_SECRET` – token secret (UUID)

Optional: `PORT` (default 8080), OpenVPN vars if you use Connected Devices.

---

## 4. Run the app

### Option A: Run once (foreground)

From the repo root:

```bash
cd /opt/watchtower/backend-server
node server.js
```

You get the full app at **`http://<server-ip>:8080`** (or your `PORT`). Stopping the terminal stops the app. To use a different port (e.g. 5173), set `PORT=5173` in `backend-server/.env`.

### Option B: systemd (recommended for a server)

Runs Watchtower as a service, restarts on crash and on reboot.

1. Create a systemd unit (e.g. `/etc/systemd/system/watchtower.service`):

```ini
[Unit]
Description=Watchtower - Proxmox & device management
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

2. Use the correct paths and user for your system. If you use a different user (e.g. `deploy`), set `User=deploy` and ensure that user can read `/opt/watchtower` and `/opt/watchtower/.env`.

3. Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable watchtower
sudo systemctl start watchtower
sudo systemctl status watchtower
```

4. Logs:

```bash
sudo journalctl -u watchtower -f
```

### Option C: PM2

If you prefer PM2 for process management:

```bash
npm install -g pm2
cd /opt/watchtower/backend-server
pm2 start server.js --name watchtower
pm2 save
pm2 startup   # enable start on boot
```

---

## 5. Updating after code changes (e.g. from Gitea)

When you pull new code from Gitea:

```bash
cd /opt/watchtower
git pull

cd frontend
npm ci
npm run build

cd ../backend-server
npm ci
```

Then restart:

- **systemd:** `sudo systemctl restart watchtower`
- **PM2:** `pm2 restart watchtower`

---

## 6. Reverse proxy (optional)

To use a hostname and HTTPS (e.g. `https://watchtower.yourdomain.com`) put **nginx** (or Caddy) in front and proxy to `http://127.0.0.1:8080`. Example nginx location:

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

No need to change the app: it still listens on `PORT` (e.g. 8080); nginx handles SSL and hostname.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Clone repo from Gitea to the server (e.g. `/opt/watchtower`) |
| 2 | `npm ci` in `backend-server` and `frontend`, then `npm run build` in `frontend` |
| 3 | Copy `.env.example` to `.env` and set Proxmox (and optional OpenVPN) vars |
| 4 | Run with systemd (recommended) or PM2 so it survives reboots |
| 5 | On updates: `git pull`, rebuild frontend, reinstall backend deps, restart the service |

The Watchtower server runs a single Node process that serves the API and the built UI; no separate frontend server is required in production.
