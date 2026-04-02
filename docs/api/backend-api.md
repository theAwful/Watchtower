# Backend API Reference

REST API for the Watchtower backend (`/api/...`). Default port **8080** unless `PORT` is set.

For a full environment variable list see [Configuration](../configuration.md).

## Base URL

Use the same origin as the web UI in production (the backend serves the built frontend). In local dev, the UI often talks to `http://localhost:8080`.

## Authentication

- If **`WATCHTOWER_USER`** and **`WATCHTOWER_PASSWORD`** are **not** set, `/api/*` is open (except you should still protect the host at the network or reverse-proxy layer).
- If they **are** set, clients must establish a **session cookie** via login; unauthenticated requests to `/api/*` return **401**, except:
  - `POST /api/auth/login`
  - `GET /api/auth/status`
  - `GET /api/health`

Send credentials with `credentials: 'include'` (or equivalent) from browsers so the session cookie is stored and sent.

### Watchtower auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Body: `{ "username", "password" }` — sets session on success |
| POST | `/api/auth/logout` | Destroys session |
| GET | `/api/auth/status` | `{ "user": { "username" } }` or 401 |

## OpenVPN Endpoints

### Get Connected Devices

Retrieve a list of all devices currently connected to the OpenVPN network.

**Endpoint**: `GET /api/devices`

**Response**:
```json
{
  "devices": [
    {
      "id": "device-hostname",
      "name": "device-hostname",
      "hostname": "device-hostname",
      "realAddress": "192.168.1.100:12345",
      "virtualAddress": "10.8.0.5",
      "connectedSince": "2024-01-15T10:30:00",
      "lastSeen": "2024-01-15T14:30:00",
      "bytesReceived": "1048576",
      "bytesSent": "524288",
      "online": true
    }
  ],
  "auth_required": false
}
```

**Error Response** (500):
```json
{
  "devices": [],
  "error": "Failed to fetch devices",
  "auth_required": false
}
```

## Proxmox Endpoints

### Get All VMs

Retrieve a list of all virtual machines and containers from all Proxmox nodes.

**Endpoint**: `GET /api/proxmox/vms`

**Response**:
```json
{
  "vms": [
    {
      "vmid": 100,
      "name": "VM-100",
      "node": "proxmox-node1",
      "type": "qemu",
      "status": "running",
      "cpu": 0.5,
      "mem": 1073741824,
      "maxmem": 2147483648,
      "uptime": 86400,
      "pool": "VM-Operators_Pool",
      "tags": ["SomeTag"]
    }
  ],
  "operatorsPool": "VM-Operators_Pool"
}
```

When pool restriction is active (default `VM-Operators_Pool`, unless `WATCHTOWER_PROXMOX_POOL_ALLOW_ALL=1`), `vms` only includes guests in that pool, and `operatorsPool` echoes the pool id. Mutating endpoints return **403** if the target VM is not in that pool.

`tags` is included when Proxmox exposes tags on cluster resources (e.g. deletion-request workflow).

### Get QEMU templates (UI subset)

**Endpoint**: `GET /api/proxmox/templates`

Returns templates after server-side filtering to **`tmpl-Kali`** and **`tmpl-Win11`** only. The create-VM API resolves the template **on the selected node** by name.

### List operator users (Create VM dropdown)

Proxmox users who belong to **`WATCHTOWER_PROXMOX_OPERATORS_GROUP`** (default `VM_Operators`). Requires API token permission to read `/access/users`.

**Endpoint**: `GET /api/proxmox/operators`

**Response**:
```json
{
  "operators": [
    { "userid": "jdoe@pam", "label": "jdoe (pam)", "slug": "jdoe-pam" }
  ],
  "group": "VM_Operators"
}
```

### Get Proxmox Nodes

Retrieve a list of all Proxmox nodes.

**Endpoint**: `GET /api/proxmox/nodes`

**Response**:
```json
{
  "nodes": [
    {
      "node": "proxmox-node1",
      "status": "online",
      "cpu": 0.5,
      "mem": 8589934592,
      "maxmem": 17179869184
    }
  ]
}
```

### Get Available ISOs and Templates

Get a list of available ISO images and templates for a specific node.

**Endpoint**: `GET /api/proxmox/nodes/:node/isos-templates`

**Parameters**:
- `node` (path): Proxmox node name

**Response**:
```json
{
  "isos": [
    {
      "volid": "local:iso/ubuntu-22.04.iso",
      "size": 2147483648,
      "storage": "local"
    }
  ],
  "templates": [
    {
      "volid": "local:vztmpl/ubuntu-22.04.tar.gz",
      "size": 536870912,
      "storage": "local"
    }
  ]
}
```

### Deploy New VM

Create a new virtual machine or container.

**Endpoint**: `POST /api/proxmox/vms/deploy`

**Request Body**:
```json
{
  "node": "proxmox-node1",
  "vmid": 200,
  "config": {
    "name": "New-VM",
    "type": "qemu",
    "pool": "development",
    "iso": "local:iso/ubuntu-22.04.iso",
    "params": {
      "cores": 2,
      "memory": 2048
    }
  }
}
```

**Clone Request Body**:
```json
{
  "node": "proxmox-node1",
  "vmid": 201,
  "config": {
    "name": "Cloned-VM",
    "type": "qemu",
    "pool": "development",
    "cloneFrom": 100,
    "full": false,
    "params": {}
  }
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "vmid": 200
  }
}
```

### Start VM

Start a stopped virtual machine or container.

**Endpoint**: `POST /api/proxmox/vms/:node/:vmid/start`

**Parameters**:
- `node` (path): Proxmox node name
- `vmid` (path): Virtual machine ID
- `type` (query, optional): VM type, default "qemu"

**Response**:
```json
{
  "success": true,
  "result": {}
}
```

### Stop VM

Stop a running virtual machine or container.

**Endpoint**: `POST /api/proxmox/vms/:node/:vmid/stop`

**Parameters**:
- `node` (path): Proxmox node name
- `vmid` (path): Virtual machine ID
- `type` (query, optional): VM type, default "qemu"

**Response**:
```json
{
  "success": true,
  "result": {}
}
```

### Restart VM

**Endpoint**: `POST /api/proxmox/vms/:node/:vmid/restart`

**Parameters**: `node`, `vmid`, optional query `type` (`qemu` default, or `lxc`).

**Response**: `{ "success": true, "result": {} }` on success.

### Create VM from template

Starts a **full** clone on a node selected by the backend (round-robin with capacity thresholds). Request body should prefer **`templateName`** (`tmpl-Kali` or `tmpl-Win11`). Legacy **`templateNode`** + **`templateVmid`** is still accepted for tools that pass explicit ids.

**Endpoint**: `POST /api/proxmox/vms/create-from-template`

**Request body** (recommended):

```json
{
  "templateName": "tmpl-Kali",
  "operatorSlug": "jdoe-pam",
  "clientName": "Acme Red Team"
}
```

The server builds `name` as `operatorSlug-clientSlug-YYYY-MM-DD` (normalized segments, local server date). For automation-only calls you may send **`name`** instead of `operatorSlug` / `clientName`.

Optional: `vmid` (cluster next id is used if omitted), `tags` (extra tags as string array).

**Response** (example):

```json
{
  "success": true,
  "vmid": 200,
  "node": "pve-node1",
  "name": "MyLab-2026-03-31"
}
```

New guests are added to `WATCHTOWER_PROXMOX_POOL` when pool restriction is enabled.

**Endpoint** (optional follow-up): `POST /api/proxmox/vms/create-from-template/finalize` — body includes `vmid`, and `placedNode` (or `templateNode`) for pool checks / migration helpers.

### Flag VM for deletion (tag only)

Does **not** delete the VM. Merges **`WATCHTOWER_VM_DELETE_REQUEST_TAG`** (default `ToBeDeleted`) with existing Proxmox VM tags. Target must be in the operators pool. Template VMs are rejected.

**Endpoint**: `POST /api/proxmox/vms/:node/:vmid/flag-delete?type=qemu`

**Response**:

```json
{
  "success": true,
  "already": false,
  "tags": ["ExistingTag", "ToBeDeleted"],
  "tag": "ToBeDeleted"
}
```

`already: true` if the tag was already present (case-insensitive match).

### Delete VM (disabled)

Watchtower does not delete VMs. Use the Proxmox UI or API as an administrator.

**Endpoint**: `DELETE /api/proxmox/vms/:node/:vmid`

**Response** (403):
```json
{
  "error": "Deleting VMs from Watchtower is disabled. Use Proxmox as an administrator."
}
```

### Get console URL (noVNC)

> **v1 UI:** Watchtower does not show a console button; this endpoint remains for API clients or a future UI.

Returns a Proxmox noVNC-style URL (API token → `vncproxy`). Behavior depends on Proxmox and auth setup.

**Endpoint**: `GET /api/proxmox/vms/:node/:vmid/console`

**Parameters**:
- `node` (path): Proxmox node name
- `vmid` (path): Virtual machine ID
- `type` (query, optional): VM type, default "qemu"

**Response**:
```json
{
  "success": true,
  "url": "https://proxmox-host:8006/?console=kvm&novnc=1&vmid=100&node=proxmox-node1&resize=off&vncticket=..."
}
```

### Get Storage Pools

Retrieve a list of all Proxmox storage pools.

**Endpoint**: `GET /api/proxmox/pools`

**Response**:
```json
{
  "pools": [
    {
      "poolid": "production",
      "comment": "Production VMs"
    },
    {
      "poolid": "development",
      "comment": "Development VMs"
    }
  ]
}
```

### Get Pool Details

Get details about a specific pool, including member VMs.

**Endpoint**: `GET /api/proxmox/pools/:poolid`

**Parameters**:
- `poolid` (path): Pool ID

**Response**:
```json
{
  "poolid": "production",
  "comment": "Production VMs",
  "members": [
    {
      "vmid": 100,
      "type": "qemu",
      "name": "VM-100"
    }
  ]
}
```

### Update VM Pool Membership

Move a VM to a different pool.

**Endpoint**: `PUT /api/proxmox/vms/:node/:vmid/pool`

**Parameters**:
- `node` (path): Proxmox node name
- `vmid` (path): Virtual machine ID

**Request Body**:
```json
{
  "type": "qemu",
  "poolid": "production"
}
```

**Response**:
```json
{
  "success": true,
  "result": {}
}
```

## General Endpoints

### Health Check

Check if the backend server is running.

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "ok"
}
```

## Error Responses

All endpoints may return error responses with the following format:

**Status Code**: 400, 500, etc.

**Response**:
```json
{
  "error": "Error message describing what went wrong"
}
```

## Rate Limiting

Currently, there is no rate limiting implemented. Consider adding rate limiting for production deployments.

## CORS

The API has CORS enabled to allow requests from the frontend. In development, the frontend proxy handles CORS. In production, ensure proper CORS configuration.

## Environment variables

See **[Configuration reference](../configuration.md)** for tables covering Proxmox, Watchtower pool/login/delete-tag, clone placement thresholds, TLS, logging, and OpenVPN.
