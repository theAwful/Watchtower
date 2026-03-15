# Watchtower Backend

Node.js Express server that proxies the Proxmox API and serves the Watchtower frontend in production. Optional: OpenVPN management for device features.

## Run

```bash
npm ci
cp ../.env.example .env
# Edit .env: PROXMOX_HOST, PROXMOX_USER, PROXMOX_REALM, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET
npm start
```

For production, build the frontend first from the repo root:

```bash
cd ../frontend && npm ci && npm run build
```

Then the backend serves the UI at `http://localhost:8080` (or your `PORT`).

## Environment

See the root [.env.example](../.env.example). Required for Proxmox:

- `PROXMOX_HOST`, `PROXMOX_USER`, `PROXMOX_REALM`, `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`

Optional: `PORT`, `SSL_CERT_PATH`, `SSL_KEY_PATH` (HTTPS), `OPENVPN_*`.

## Scripts

- `npm start` – Run server
- `npm run dev` – Run with `--watch` for development

## Docs

- [Deploy (Docker, systemd, HTTPS)](../DEPLOY.md)
- [Backend API](../docs/api/backend-api.md)
