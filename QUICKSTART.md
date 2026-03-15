# Quick Start

Get Watchtower (Proxmox VM management) running in a few minutes.

## Option A: Docker

1. **Clone and configure**

   ```bash
   git clone <repo-url> watchtower && cd watchtower
   cp .env.example .env
   ```

2. **Edit `.env`** – set your Proxmox API token:

   - `PROXMOX_HOST` – Proxmox IP or hostname  
   - `PROXMOX_USER` – e.g. `root`  
   - `PROXMOX_REALM` – `pam`  
   - `PROXMOX_TOKEN_ID` and `PROXMOX_TOKEN_SECRET` – from Proxmox: **Datacenter → Permissions → API Tokens → Add**

3. **Run**

   ```bash
   docker compose up -d
   ```

4. **Open** `http://<this-machine-ip>:8080`

## Option B: Local (Node)

1. **Backend**

   ```bash
   cd backend-server
   npm ci
   cp ../.env.example .env
   # Edit .env with PROXMOX_* (see above)
   npm start
   ```

2. **Frontend (separate terminal)**

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

3. **Open** `http://localhost:5173` (Vite). The UI talks to the backend on port 8080.

For a single URL in production, build the frontend and run only the backend: see [README.md](README.md#running-without-docker).

## Proxmox API token

1. Log into the Proxmox web UI.  
2. Go to **Datacenter → Permissions → API Tokens**.  
3. **Add**: choose user (e.g. `root@pam`), token ID, and generate a secret.  
4. Put the same user in `PROXMOX_USER`, token ID in `PROXMOX_TOKEN_ID`, secret in `PROXMOX_TOKEN_SECRET`.

## Troubleshooting

- **VMs not loading** – Check `PROXMOX_HOST` and that the server can reach Proxmox (e.g. `curl -k https://<PROXMOX_HOST>:8006/api2/json/version`). Confirm the token has at least **VM.Audit**, **VM.Config.Network**, **Datastore.AllocateSpace** (and **VM.Clone** for Create VM).
- **Create VM fails** – Ensure the source is a template (e.g. `tmpl-Kali`). VM names must be DNS-friendly (letters, numbers, hyphens; no spaces).
- **HTTPS** – See [DEPLOY.md](DEPLOY.md) for SSL with Docker or systemd.
