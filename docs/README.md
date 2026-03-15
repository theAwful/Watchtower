# Watchtower Documentation

Watchtower is a **Proxmox VM management** dashboard: one UI to list, start, stop, restart, and clone VMs across your cluster, with optional HTTPS for IP-and-port access.

## Documentation

- **[Proxmox VM Management](pages/proxmox.md)** – UI overview: VM list, filters, Create from template, noVNC, API usage
- **[Backend API Reference](api/backend-api.md)** – REST endpoints for Proxmox and health

## Getting started

- **[README](../README.md)** – Overview, Docker quick start, env vars
- **[DEPLOY.md](../DEPLOY.md)** – Docker, systemd, PM2, HTTPS
- **[QUICKSTART.md](../QUICKSTART.md)** – Minimal steps to run with Docker or Node

## Stack

- **Frontend:** React 19, Material UI 7, Vite 6
- **Backend:** Node.js 18+, Express 4
- **Proxmox:** REST API (token auth); clone via `/api2/json` or `/api2/extjs` as needed
