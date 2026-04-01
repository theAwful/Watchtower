# Watchtower documentation

This folder is the **documentation home** for the Watchtower repo. The app shipped here is centered on **Proxmox VM management** for a defined operator pool.

## Start here

1. **[../README.md](../README.md)** — Project overview, features, Docker and dev commands.
2. **[../QUICKSTART.md](../QUICKSTART.md)** — Shortest path to a running instance.
3. **[configuration.md](configuration.md)** — All environment variables in one place.

## By topic

| Document | Contents |
|----------|----------|
| [pages/proxmox.md](pages/proxmox.md) | Proxmox UI: table, create VM, flag for deletion, behavior notes |
| [api/backend-api.md](api/backend-api.md) | REST endpoints, auth, request/response shapes |
| [../DEPLOY.md](../DEPLOY.md) | Docker, host install, systemd, PM2, HTTPS, reverse proxy |
| [../backend-server/README.md](../backend-server/README.md) | Backend-only run notes |
| [../frontend/README.md](../frontend/README.md) | Frontend dev and build |

## Other pages under `pages/`

Files such as [dashboard.md](pages/dashboard.md) describe **OpenVPN / dashboard** style features that may exist or evolve alongside the main Proxmox flow. Treat **proxmox.md** and **backend-api.md** as the source of truth for the primary operator workflow.

## Contributing to docs

When behavior changes (new env vars, API routes, or UI flows), update:

- [configuration.md](configuration.md) for env vars  
- [api/backend-api.md](api/backend-api.md) for HTTP API  
- [pages/proxmox.md](pages/proxmox.md) for operator-facing behavior  
- [../README.md](../README.md) feature list if user-visible scope shifts  

Keep [.env.example](../.env.example) in sync with new variables.
