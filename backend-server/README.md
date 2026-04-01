# Watchtower backend

Express server: Proxmox API proxy, optional OpenVPN device list, session auth, structured logging. In production it serves the built SPA from `frontend/dist`.

## Run

```bash
npm ci
cp ../.env.example .env
# Edit .env — see ../docs/configuration.md
npm start
```

Build the frontend first if you want the UI at the same port:

```bash
cd ../frontend && npm ci && npm run build
```

## Highlights

- **Pool scope** — `WATCHTOWER_PROXMOX_POOL` (and optional `WATCHTOWER_PROXMOX_POOL_ALLOW_ALL`)
- **Create from template** — `POST /api/proxmox/vms/create-from-template` with `templateName`; per-node templates + placement (see docs)
- **Flag delete** — `POST .../flag-delete` merges `WATCHTOWER_VM_DELETE_REQUEST_TAG` (default `ToBeDeleted`)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Production-style run |
| `npm run dev` | `node --watch server.js` |

## Documentation

- [Configuration (env vars)](../docs/configuration.md)
- [Backend API](../docs/api/backend-api.md)
- [Deploy (Docker, systemd, HTTPS)](../DEPLOY.md)
