# Configuration reference

Watchtower reads settings from environment variables. In development, use a `.env` file next to `docker-compose.yml` (Docker) or copy [`.env.example`](../.env.example) into `backend-server/.env` (Node).

## Proxmox API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXMOX_HOST` | Yes | — | Hostname or IP. You may paste a full URL; host and port are normalized. |
| `PROXMOX_PORT` | No | `8006` | HTTPS API port. |
| `PROXMOX_USER` | Yes | — | User that owns the API token (e.g. `svc_WatchTower` or `root`). |
| `PROXMOX_REALM` | No | `pam` | Auth realm (usually `pam`). |
| `PROXMOX_TOKEN_ID` | Yes | — | Token ID from **Datacenter → Permissions → API Tokens**. |
| `PROXMOX_TOKEN_SECRET` | Yes | — | Token secret (UUID). |
| `PROXMOX_PASSWORD` | No | — | Password for `PROXMOX_USER`, used by `/api/proxmox/set-session` and related flows. Quote if it contains special characters. |
| `PROXMOX_PUBLIC_URL` | No | — | Public Proxmox UI base URL if reverse-proxied (no trailing slash). |

Create the token in Proxmox with permissions appropriate for listing VMs, power actions, and cloning (e.g. VM.Audit, VM.PowerMgmt, VM.Clone as needed for your policy).

## Watchtower scope and safety

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WATCHTOWER_PROXMOX_POOL` | No | `VM-Operators_Pool` | Only VMs in this Proxmox **pool** appear in the UI and accept power / clone / flag-delete actions. Enforcement is in Watchtower; the API token may still have wider rights in Proxmox. |
| `WATCHTOWER_PROXMOX_POOL_ALLOW_ALL` | No | unset | Set to `1` to disable pool filtering (break-glass / lab only). |
| `WATCHTOWER_VM_DELETE_REQUEST_TAG` | No | `ToBeDeleted` | Proxmox **tag** merged onto a VM when a user uses **Flag for deletion** in the UI. Does not delete the VM; infra removes guests with this tag in Proxmox. |
| `WATCHTOWER_USER` | No | — | If set with `WATCHTOWER_PASSWORD`, browser **session login** is required for `/api/*` (except health, auth routes). |
| `WATCHTOWER_PASSWORD` | No | — | Password for the Watchtower web user. |
| `SESSION_SECRET` | No | derived | Secret for the session cookie; set explicitly in production. |

## Clone placement

When creating a VM from a template, the backend picks an **online** node using a **round-robin pointer**, trying nodes in order until one passes capacity checks. The clone runs **on that node** using the template with the same name on that node (your templates must exist per node; cross-node clone from a single template is not used).

| Variable | Default | Description |
|----------|---------|-------------|
| `WATCHTOWER_PLACEMENT_MAX_CPU` | `0.9` | Skip node if reported CPU usage is above this fraction (0–1). |
| `WATCHTOWER_PLACEMENT_MAX_MEM_UTIL` | `0.9` | Skip node if memory used ÷ maxmem is above this fraction. |
| `WATCHTOWER_PLACEMENT_MAX_DISK_UTIL` | `0.85` | Skip node if disk used ÷ maxdisk (from cluster node resource) is above this fraction. |
| `WATCHTOWER_PLACEMENT_MIN_FREE_MEM_BYTES` | `0` | Optional minimum free RAM (bytes) required to consider a node eligible. |

Backend logs lines like `[Placement] <node> (mode=best_fit_round_robin, ...)` when a node is chosen.

## Server and TLS

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP(S) listen port. |
| `SSL_CERT_PATH` | — | Path to TLS certificate; if set with `SSL_KEY_PATH`, the app serves HTTPS. |
| `SSL_KEY_PATH` | — | Path to TLS private key. |
| `LOG_DIR` | `backend-server/logs` | Directory for server event logs. |
| `LOG_FILE_PATH` | — | Override log file path. |
| `MAX_LOG_FILE_SIZE_MB` | `10` | Rotate log when size exceeds this. |
| `LOG_MAX_ROLLOVERS` | `5` | Number of rotated files to keep. |
| `REQUEST_LOG_LEVEL` | `changes` | Set to `verbose` to log every API request to the event log. |

## OpenVPN (optional)

Used only if you expose or use the OpenVPN device list API.

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENVPN_HOST` | `192.168.68.66` | Management interface host. |
| `OPENVPN_PORT` | `7505` | Management interface port. |
| `OPENVPN_PASSWORD` | — | Management password if required. |

See [`.env.example`](../.env.example) for a copy-paste template.
