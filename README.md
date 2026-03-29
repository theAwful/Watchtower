# Watchtower

Proxmox VM management dashboard. One app to view, control, and clone VMs across your Proxmox cluster—with optional HTTPS for IP-and-port access.

## Features

- **VM list** – All QEMU/LXC VMs in one table (operators pool scope when configured)
- **Start / Stop / Restart** – Power controls per VM
- **Create VM from template** – Clone from a template (e.g. `tmpl-Kali`, `tmpl-Win11`) with auto VMID; placement is **load-balanced** across online nodes (CPU/memory), with round-robin among near-ties
- **Search & filter** – Search by name, VMID, or IP; filter by “Running only” or “All”
- **IP column** – Guest IP (when QEMU agent is available), click to copy
- **HTTPS** – Optional SSL so you can use `https://<ip>:<port>`

## Quick start with Docker

**Prerequisites:** Docker and Docker Compose.

1. **Clone and configure**

   ```bash
   git clone <your-repo-url> watchtower && cd watchtower
   cp .env.example .env
   ```

2. **Edit `.env`** – set at least:

   - `PROXMOX_HOST` – Proxmox hostname or IP  
   - `PROXMOX_USER` – e.g. `root` or a service user  
   - `PROXMOX_REALM` – usually `pam`  
   - `PROXMOX_TOKEN_ID` and `PROXMOX_TOKEN_SECRET` – from Proxmox **Datacenter → Permissions → API Tokens**

3. **Run**

   ```bash
   docker compose up -d
   ```

4. **Open** `http://<server-ip>:8080` (or `https://` if you set `SSL_CERT_PATH` and `SSL_KEY_PATH`).

See [Deploying Watchtower](DEPLOY.md) for HTTPS, systemd, and other options.

## Running without Docker

**Prerequisites:** Node.js 18+, npm.

1. **Backend**

   ```bash
   cd backend-server
   npm ci
   cp ../.env.example .env
   # Edit .env with PROXMOX_* and optional SSL paths
   npm start
   ```

2. **Frontend (dev)** – in another terminal:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

   UI: `http://localhost:5173` (Vite), API: `http://localhost:8080`.

3. **Production** – build once, then the backend serves the UI:

   ```bash
   cd frontend && npm ci && npm run build && cd ..
   cd backend-server && npm start
   ```

   Single URL: `http://localhost:8080` (or your `PORT`).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PROXMOX_HOST` | Yes | Proxmox hostname or IP |
| `PROXMOX_PORT` | No | API port (default `8006`) |
| `PROXMOX_USER` | Yes | Username (e.g. `root` or API token user) |
| `PROXMOX_REALM` | No | Realm (default `pam`) |
| `PROXMOX_TOKEN_ID` | Yes | API token name |
| `PROXMOX_TOKEN_SECRET` | Yes | API token secret (UUID) |
| `PORT` | No | Server port (default `8080`) |
| `SSL_CERT_PATH` | No | Path to TLS cert (enables HTTPS) |
| `SSL_KEY_PATH` | No | Path to TLS key |
| `OPENVPN_*` | No | Only if you use OpenVPN device features |

See [.env.example](.env.example) for a full template.

## Project layout

- **backend-server/** – Express server: Proxmox API proxy, optional OpenVPN, serves frontend in production
- **frontend/** – React + Vite + Material UI; single page: Proxmox VM Management

## Docs

- [Deploying Watchtower (Docker, systemd, HTTPS)](DEPLOY.md)
- [Quick start (local dev)](QUICKSTART.md)
- [Proxmox page & API](docs/pages/proxmox.md)  
- [Backend API reference](docs/api/backend-api.md)

## License

MIT
