# Proxmox VM Management

The main Watchtower page: view and manage Proxmox VMs and containers from a single UI.

## Overview

- **VM list** – All QEMU and LXC VMs from every node, grouped by node.
- **Filters** – “Running only” (default) or “All”; search by name, VMID, node, or IP.
- **Create VM from template** – Clone a template (e.g. `tmpl-Kali`, `tmpl-Win11`) with auto VMID; new VMs are created on `pve-node0`.
- **Power actions** – Start, Restart, Stop per VM.
- **noVNC** – Open a web console in a new tab (VM must be running).
- **IP** – Guest IP when QEMU agent is available; click to copy.

## VM table

Each VM row shows:

| Column   | Description                          |
|----------|--------------------------------------|
| VMID     | Proxmox VM/container ID              |
| Name     | VM name                              |
| Status   | running / stopped / etc.              |
| CPU      | CPU usage %                          |
| Memory   | Used / max                            |
| Uptime   | Time running                          |
| IP       | Guest IP (if agent present); click to copy |
| Actions  | Start, Restart, Stop, noVNC, Delete  |

Tables are grouped by **node** (e.g. `pve-node0`, `pve-node1`). There is no separate “Nodes” summary bar.

## Create VM from template

1. Click **Create VM**.
2. Choose a **Template** (e.g. `105 — tmpl-Kali`).
3. Enter a **Name** (DNS-friendly: letters, numbers, hyphens; no spaces).
4. Click **Create VM**.

The backend starts a clone on the template’s node with `target=pve-node0`. Creation runs as a task on Proxmox; the list will update after a refresh. New VMs use the next free VMID.

## Search and filter

- **Search** – Matches VM name, VMID, node, or IP as you type.
- **Show** – “Running only” (default) or “All”.

## API used by this page

- `GET /api/proxmox/vms` – All VMs (with guest IP when agent is available)
- `GET /api/proxmox/nodes` – Node list
- `GET /api/proxmox/templates` – Templates for the Create VM dropdown
- `POST /api/proxmox/vms/create-from-template` – Clone from template (body: `templateNode`, `templateVmid`, `name`)
- `POST /api/proxmox/vms/:node/:vmid/start` – Start
- `POST /api/proxmox/vms/:node/:vmid/stop` – Stop
- `POST /api/proxmox/vms/:node/:vmid/restart` – Restart
- `DELETE /api/proxmox/vms/:node/:vmid` – Delete VM
- `GET /api/proxmox/vms/:node/:vmid/vnc` – noVNC URL

## Configuration

Proxmox is configured via environment variables (see [README](../../README.md) and [.env.example](../../.env.example)):

- `PROXMOX_HOST`, `PROXMOX_PORT`, `PROXMOX_USER`, `PROXMOX_REALM`
- `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`
- `PROXMOX_PASSWORD` (optional) – Password for the same user; **required for noVNC** when users are not logged into the Proxmox UI in their browser. The server uses it to obtain a console ticket.

Create the token in Proxmox: **Datacenter → Permissions → API Tokens**. The token needs at least VM and node read, and VM power/clone/delete where you use those features.

## Troubleshooting

- **VMs not loading** – Check backend logs and Proxmox connectivity. Ensure the API token has permissions (e.g. VM.Audit, VM.Allocate).
- **Create VM fails** – Use a template (e.g. name starting with `tmpl-` or marked template in Proxmox). Keep VM names DNS-friendly.
- **No guest IP** – Install and enable the QEMU guest agent in the VM; IP is read from the agent.
- **noVNC not opening / 401 No ticket** – Set `PROXMOX_PASSWORD` in `.env` (same user as `PROXMOX_USER`) so the server can obtain a console ticket without requiring a Proxmox login in the browser. Ensure the VM is running and the browser allows pop-ups.
