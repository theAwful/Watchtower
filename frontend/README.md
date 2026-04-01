# Watchtower frontend

React 19, Vite 6, Material UI 7. The shipped operator experience is the **Proxmox** page (`src/views/pages/Proxmox.jsx`): VM table, create from template (Kali / Windows 11), power actions, flag for deletion, search/filter.

## Development

```bash
npm ci
npm run dev
```

Default: `http://localhost:5173`. The Vite dev server proxies API calls to the backend (typically port **8080**); ensure the backend is running with a valid `.env`.

## Production build

```bash
npm ci
npm run build
```

Output: `dist/`. The Watchtower backend serves this folder in production (or your Docker image copies it).

## Documentation

- [Project README](../README.md)
- [Proxmox UI behavior](../docs/pages/proxmox.md)
- [Docs index](../docs/README.md)
