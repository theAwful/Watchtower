# Watchtower

Web app for **Proxmox VM operations** aimed at operators: one place to see pool-scoped VMs, power them on/off, create machines from standard templates, and **flag** machines for later removal—without handing out Proxmox admin or raw delete rights.

| If you want to… | Read |
|-----------------|------|
| Run it quickly | [QUICKSTART.md](QUICKSTART.md) |
| Deploy Docker, systemd, HTTPS | [DEPLOY.md](DEPLOY.md) |
| Every environment variable | [docs/configuration.md](docs/configuration.md) |
| What the Proxmox screen does | [docs/pages/proxmox.md](docs/pages/proxmox.md) |
| HTTP API details | [docs/api/backend-api.md](docs/api/backend-api.md) |

## What it does today

- **VM table** — Guests in a configurable Proxmox **pool** (default `VM-Operators_Pool`). Search by name, VMID, or IP; filter running vs all.
- **Power** — Start, stop, restart (pool-checked on the server).
- **Create VM** — User picks **Kali** or **Windows 11** only; the backend picks the node (round-robin with capacity skips), clones the matching **per-node template** (`tmpl-Kali` / `tmpl-Win11`), **full clone**, adds the guest to the operators pool. VM names get a date suffix automatically.
- **Flag for deletion** — Trash control adds a Proxmox tag (default `ToBeDeleted`) so infrastructure can delete safely later. No delete API from the UI.
- **Optional login** — Set `WATCHTOWER_USER` / `WATCHTOWER_PASSWORD` to require a session before `/api/*`.
- **Optional HTTPS** — `SSL_CERT_PATH` + `SSL_KEY_PATH`, or TLS at a reverse proxy (see [DEPLOY.md](DEPLOY.md)).

**Not in the v1 UI:** VM delete, noVNC console (some backend routes may still exist for future use).

## Quick start (Docker)

**Prerequisites:** Docker, Docker Compose, a Proxmox API token.

```bash
git clone <your-repo-url> watchtower && cd watchtower
cp .env.example .env
# Edit .env: PROXMOX_HOST, PROXMOX_USER, PROXMOX_REALM, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET
docker compose up -d
```

Open `http://<server-ip>:8080` (or `https://` if you configured TLS in `.env` and Compose).

## Local development (no Docker)

**Backend** (Node 18+):

```bash
cd backend-server
npm ci
cp ../.env.example .env
npm start
```

**Frontend** (second terminal):

```bash
cd frontend
npm ci
npm run dev
```

UI: `http://localhost:5173` (Vite). API default: `http://localhost:8080`.

**Production-style single process:** build the UI, then only run the backend; it serves `frontend/dist`:

```bash
cd frontend && npm ci && npm run build && cd ..
cd backend-server && npm start
```

## Repository layout

| Path | Role |
|------|------|
| `backend-server/` | Express app: Proxmox proxy, optional OpenVPN, static UI in production |
| `frontend/` | React + Vite + MUI; main page `Proxmox.jsx` |
| `docs/` | User and API documentation |
| `.env.example` | Environment template |

## License

MIT
