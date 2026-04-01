# Quick start

Minimal steps to run Watchtower. For production hardening, TLS, and systemd, use [DEPLOY.md](DEPLOY.md). For every environment variable, see [docs/configuration.md](docs/configuration.md).

## Docker (fastest)

```bash
git clone <repo-url> watchtower && cd watchtower
cp .env.example .env
```

Edit `.env` — at minimum:

- `PROXMOX_HOST`, `PROXMOX_USER`, `PROXMOX_REALM`
- `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`  
  (Proxmox: **Datacenter → Permissions → API Tokens**)

Optional but recommended for operators:

- `WATCHTOWER_PROXMOX_POOL` — pool id your VMs live in (default matches `VM-Operators_Pool`)
- `WATCHTOWER_USER`, `WATCHTOWER_PASSWORD` — require login to the app

Then:

```bash
docker compose up -d
```

Open `http://<server-ip>:8080`.

## Local development (Node)

**Terminal 1 — backend**

```bash
cd backend-server
npm ci
cp ../.env.example .env
npm start
```

**Terminal 2 — frontend**

```bash
cd frontend
npm ci
npm run dev
```

- UI: `http://localhost:5173`
- API: `http://localhost:8080` (configure proxy if your frontend expects a different URL)

**Single-URL preview:** build the frontend, run only the backend — see [README.md](README.md#local-development-no-docker).

## Proxmox token checklist

The token’s user needs rights to list and manage guests in your target pool: read VMs/nodes, power, clone, and (for flag-for-deletion) update VM config / tags as your ACLs require.

## If something fails

| Symptom | Check |
|---------|--------|
| Empty VM list | Pool membership, `WATCHTOWER_PROXMOX_POOL`, token scope |
| 401 from API | Set `WATCHTOWER_*` login — call `POST /api/auth/login` or use the app login page |
| Create VM fails on a node | Same template **name** exists on **that** node (`tmpl-Kali` / `tmpl-Win11`) |
| TLS | [DEPLOY.md](DEPLOY.md) — Docker volume mounts or reverse proxy |
