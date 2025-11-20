# Watchtower Backend (Node.js)

Node.js Express backend that connects to OpenVPN management interface and Proxmox API.

## Setup

### Install Dependencies

```bash
npm install
```

### Configuration

Set environment variables:

```bash
# OpenVPN Configuration
export OPENVPN_HOST=localhost
export OPENVPN_PORT=7505
export OPENVPN_PASSWORD=

# Proxmox Configuration
export PROXMOX_HOST=your-proxmox-host
export PROXMOX_PORT=8006
export PROXMOX_USER=root
export PROXMOX_REALM=pam
export PROXMOX_TOKEN_ID=your-token-id
export PROXMOX_TOKEN_SECRET=your-token-secret

# Server Configuration
export PORT=8080
```

Or create a `.env` file (you'll need dotenv package):

```env
OPENVPN_HOST=localhost
OPENVPN_PORT=7505
OPENVPN_PASSWORD=

PROXMOX_HOST=your-proxmox-host
PROXMOX_PORT=8006
PROXMOX_USER=root
PROXMOX_REALM=pam
PROXMOX_TOKEN_ID=your-token-id
PROXMOX_TOKEN_SECRET=your-token-secret

PORT=8080
```

### Proxmox API Token Setup

1. Log into your Proxmox web interface
2. Go to **Datacenter** → **Permissions** → **API Tokens**
3. Click **Add** to create a new token
4. Set the token ID and secret
5. Copy the token ID and secret to your environment variables

### Run

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### OpenVPN
- `GET /api/devices` - Get list of all connected OpenVPN devices

### Proxmox
- `GET /api/proxmox/vms` - Get list of all VMs and containers
- `GET /api/proxmox/nodes` - Get list of Proxmox nodes
- `POST /api/proxmox/vms/deploy` - Deploy a new VM
  - Body: `{ node: string, vmid: number, config: { name: string, type: 'qemu' | 'lxc', params?: object } }`
- `DELETE /api/proxmox/vms/:node/:vmid?type=qemu` - Tear down (delete) a VM
- `POST /api/proxmox/vms/:node/:vmid/start?type=qemu` - Start a VM
- `POST /api/proxmox/vms/:node/:vmid/stop?type=qemu` - Stop a VM

### General
- `GET /api/health` - Health check endpoint

## Requirements

- Node.js 18+
- Express
- cors
