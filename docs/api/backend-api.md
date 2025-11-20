# Backend API Reference

Complete API documentation for the Watchtower backend server.

## Base URL

All API endpoints are prefixed with `/api`. The backend server runs on port 8080 by default.

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible. Consider implementing authentication for production deployments.

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
      "pool": "production"
    }
  ]
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

### Delete VM

Delete a virtual machine or container.

**Endpoint**: `DELETE /api/proxmox/vms/:node/:vmid`

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

### Get VNC Console URL

Get a VNC console URL for accessing a VM's console.

**Endpoint**: `GET /api/proxmox/vms/:node/:vmid/vnc`

**Parameters**:
- `node` (path): Proxmox node name
- `vmid` (path): Virtual machine ID
- `type` (query, optional): VM type, default "qemu"

**Response**:
```json
{
  "success": true,
  "url": "https://proxmox-host:8006/?console=kvm&novnc=1&vmid=100&node=proxmox-node1&resize=1&token=abc123"
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

## Environment Variables

The backend requires the following environment variables:

### OpenVPN
- `OPENVPN_HOST`: OpenVPN server hostname (default: localhost)
- `OPENVPN_PORT`: OpenVPN management port (default: 7505)
- `OPENVPN_PASSWORD`: Management interface password (optional)

### Proxmox
- `PROXMOX_HOST`: Proxmox server hostname
- `PROXMOX_PORT`: Proxmox API port (default: 8006)
- `PROXMOX_USER`: Proxmox username
- `PROXMOX_REALM`: Authentication realm (default: pam)
- `PROXMOX_TOKEN_ID`: API token ID
- `PROXMOX_TOKEN_SECRET`: API token secret

### Server
- `PORT`: Backend server port (default: 8080)

