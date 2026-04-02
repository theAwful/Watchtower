# Proxmox VM Management (main UI)

The default Watchtower experience: a single page to work with VMs that live in your **operators pool** in Proxmox.

## Who sees what

- With **`WATCHTOWER_PROXMOX_POOL`** set (default `VM-Operators_Pool`), the table lists only VMs that belong to that pool. Power actions, create-from-template, and flag-for-deletion all enforce the same rule on the server.
- **`WATCHTOWER_PROXMOX_POOL_ALLOW_ALL=1`** turns off that filter (use only for debugging or special environments).

## VM table

| Column | Description |
|--------|-------------|
| VMID | Proxmox guest id |
| Name | Guest name |
| Status | e.g. running / stopped |
| CPU | Usage (cluster resource view) |
| Memory | Used / max |
| Uptime | Time running |
| IP | Guest IPv4 from QEMU agent when available; click to copy |
| Actions | Start, restart, stop; **flag for deletion** (trash) |

## Create VM

1. Click **Create VM**.
2. Choose **Kali** or **Windows 11** (maps to `tmpl-Kali` / `tmpl-Win11`).
3. Choose an **Operator** from the dropdown (Proxmox users in the configured group, default **`VM_Operators`** — see `WATCHTOWER_PROXMOX_OPERATORS_GROUP`).
4. Enter a **Client name** (free text; normalized to a DNS-safe segment).
5. Confirm **Create VM**.

The VM name is built on the server as **`operator-client-YYYY-MM-DD`** (segments lowercased; spaces and punctuation become hyphens).

**You do not pick a node.** The server:

- Maintains a **round-robin pointer** over online nodes (sorted by name).
- Walks that order and **skips** nodes that exceed CPU / memory / disk thresholds (see [configuration](../configuration.md)).
- Clones using the template **on the chosen node** (same template name must exist on each node you use; cloning does not rely on moving a template from another node).
- Uses a **full** clone (`full=1`) and targets default QEMU disk storage on that node when needed.
- Adds the new VM to the configured operators pool.

Creation is asynchronous in Proxmox; refresh the list after a short wait.

## Flag for deletion

The trash action opens a short confirmation. It does **not** call Proxmox delete. It **merges** the tag configured by **`WATCHTOWER_VM_DELETE_REQUEST_TAG`** (default `ToBeDeleted`) onto the VM’s existing tags so administrators can remove it later under your own process.

- Template VMs cannot be flagged.
- Guests that already carry that tag (case-insensitive match) show the control disabled.

## Search and filter

- **Search** — Substring match on name, VMID, or IP.
- **Show** — **Running only** (default) or **All**.

## APIs used by this page

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/proxmox/vms` | Pool-scoped VM list (includes `tags` when Proxmox exposes them) |
| GET | `/api/proxmox/templates` | Filtered list for UI (`tmpl-Kali`, `tmpl-Win11` only) |
| GET | `/api/proxmox/operators` | Users in `WATCHTOWER_PROXMOX_OPERATORS_GROUP` for the operator dropdown |
| POST | `/api/proxmox/vms/create-from-template` | Body: `templateName`, `operatorSlug`, `clientName` (or legacy `name` for automation) |
| POST | `/api/proxmox/vms/:node/:vmid/start` | Query `type=qemu` or `lxc` |
| POST | `/api/proxmox/vms/:node/:vmid/stop` | Same |
| POST | `/api/proxmox/vms/:node/:vmid/restart` | Same |
| POST | `/api/proxmox/vms/:node/:vmid/flag-delete` | Adds deletion-request tag |

Direct **DELETE** of a VM through Watchtower is **not** supported; use Proxmox as an admin.

## Configuration

See [Configuration reference](../configuration.md) and the root [.env.example](../../.env.example).

## Troubleshooting

- **No VMs** — Confirm pool id, token permissions, and that guests are members of the pool in Proxmox.
- **Create fails on one node** — Ensure `tmpl-Kali` / `tmpl-Win11` exist **on that node** with the expected names.
- **No IP** — Install and run the QEMU guest agent in the VM.
- **Auth errors** — If `WATCHTOWER_USER` / `WATCHTOWER_PASSWORD` are set, log in through the app before calling the API from scripts.
