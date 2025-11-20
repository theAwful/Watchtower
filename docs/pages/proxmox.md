# Proxmox VM Management

The Proxmox page provides comprehensive virtual machine and container management through integration with the Proxmox Virtual Environment API.

## Overview

This page allows you to view, deploy, manage, and access all virtual machines and containers in your Proxmox environment. VMs are organized by storage pools for better organization.

## Features

### VM Display

VMs are displayed in separate tables, grouped by their assigned storage pool:
- Each pool has its own table section
- Unassigned VMs are shown in a separate "Unassigned VMs" section
- Each VM shows:
  - **VMID**: Virtual machine ID
  - **Name**: VM name
  - **Node**: Proxmox node hosting the VM
  - **Status**: Current state (running, stopped, etc.)
  - **CPU**: CPU usage percentage
  - **Memory**: Memory usage (used/total)
  - **Uptime**: How long the VM has been running
  - **Actions**: Control buttons

### VM Actions

For each VM, you can:
- **Start**: Power on a stopped VM
- **Stop**: Gracefully shut down a running VM
- **Delete**: Remove a VM (with confirmation dialog)
- **VNC Console**: Open a NoVNC web console in a new window
- **Change Pool**: Move VM to a different storage pool (via dropdown)

### Deploy New VM

Click the "Deploy New VM" button to open the deployment dialog:

#### Basic Configuration
- **Node**: Select which Proxmox node to deploy on
- **VMID**: Unique virtual machine ID (must be available)
- **Name**: Display name for the VM
- **Pool**: Select storage pool to assign VM to (optional)

#### Installation Type
Choose how to provision the VM:
- **None**: Create VM without installation media
- **ISO Image**: Boot from an ISO file
- **Template**: Use a Proxmox template (requires cloning)
- **Clone Existing VM**: Clone an existing VM

#### ISO Image Configuration
If "ISO Image" is selected:
- **ISO Image**: Dropdown of available ISO files on the selected node
- ISOs are automatically fetched from all storage devices

#### Template Configuration
If "Template" is selected:
- Note: Templates typically require cloning. Use "Clone Existing VM" option instead.

#### Clone Configuration
If "Clone Existing VM" is selected:
- **Source VM**: Select VM to clone from (filtered by node)
- **Clone Type**: 
  - **Linked Clone**: Faster, shares disk with source
  - **Full Clone**: Independent copy, slower but complete

### Pool Management

- VMs are automatically organized by their assigned pool
- Use the pool dropdown next to each VM to move it between pools
- Pools are fetched from Proxmox and displayed as separate sections

### Auto-refresh

- VM list automatically refreshes every 10 seconds
- Manual refresh button available in the header
- Loading indicators show during refresh

## API Integration

The Proxmox page uses multiple backend endpoints:
- `GET /api/proxmox/vms` - Fetch all VMs
- `GET /api/proxmox/nodes` - Get available nodes
- `GET /api/proxmox/pools` - Get storage pools
- `GET /api/proxmox/nodes/:node/isos-templates` - Get installation media
- `POST /api/proxmox/vms/deploy` - Deploy new VM
- `POST /api/proxmox/vms/:node/:vmid/start` - Start VM
- `POST /api/proxmox/vms/:node/:vmid/stop` - Stop VM
- `DELETE /api/proxmox/vms/:node/:vmid` - Delete VM
- `GET /api/proxmox/vms/:node/:vmid/vnc` - Get VNC console URL
- `PUT /api/proxmox/vms/:node/:vmid/pool` - Change VM pool

## Configuration

### Proxmox API Setup

1. Log into Proxmox web interface
2. Go to **Datacenter** → **Permissions** → **API Tokens**
3. Create a new token with appropriate permissions
4. Set environment variables in backend:
   - `PROXMOX_HOST`: Proxmox server hostname
   - `PROXMOX_PORT`: Proxmox API port (default: 8006)
   - `PROXMOX_USER`: Proxmox username
   - `PROXMOX_REALM`: Authentication realm (usually "pam")
   - `PROXMOX_TOKEN_ID`: Token ID
   - `PROXMOX_TOKEN_SECRET`: Token secret

## Troubleshooting

### VMs not loading
1. Verify Proxmox API credentials in backend environment variables
2. Check backend server logs for API errors
3. Ensure Proxmox API is accessible from backend server
4. Verify API token has necessary permissions

### Deploy fails
1. Check that VMID is available (not already in use)
2. Verify node has sufficient resources
3. Ensure ISO/template exists on selected storage
4. Check backend logs for detailed error messages

### VNC console not opening
1. Verify VM is running
2. Check that VNC is enabled on the VM
3. Ensure browser allows pop-ups for the site
4. Verify Proxmox VNC service is accessible

### Pool changes not saving
1. Verify API token has pool management permissions
2. Check backend logs for permission errors
3. Ensure pool exists in Proxmox

