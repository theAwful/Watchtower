# Watchtower Frontend

React + Vite + Material UI. Single main page: **Proxmox VM Management** (list VMs, start/stop/restart, create from template, noVNC, search/filter).

## Dev

```bash
npm ci
npm run dev
```

Runs at `http://localhost:5173`. Set the backend URL if needed (default proxy in Vite points to port 8080).

## Build

```bash
npm ci
npm run build
```

Output in `dist/`. The Watchtower backend serves this in production (or when using Docker).

## Structure

- `src/views/pages/Proxmox.jsx` – Main (and only visible) page
- `src/models/ApiModel.js` – API client
- `src/views/components/` – Shared UI (e.g. AppLayout)

See the root [README](../README.md) and [docs](docs/README.md) for full setup and deployment.
