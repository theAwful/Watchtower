# Dashboard - Connected Devices

The Dashboard page provides real-time monitoring of all devices connected to your OpenVPN network.

## Overview

The Dashboard displays a comprehensive table of all OpenVPN-connected devices, showing both currently online devices and recently disconnected devices. This allows you to track device activity over time.

## Features

### Device Information Display

Each device shows:
- **Name/Hostname**: The device's common name from OpenVPN certificate
- **IP Address**: Virtual IP address assigned by OpenVPN
- **Client**: Editable client name (defaults to hostname)
- **Connected Since**: Time since device connected (or "Disconnected X ago" for offline devices)
- **Data Received**: Total bytes received by the device
- **Data Sent**: Total bytes sent by the device
- **Status**: Online/Offline indicator chip
- **Notes**: Editable notes field for additional information
- **Actions**: Copy IP, RDP connection button

### Real-time Updates

- Automatically refreshes device list every 5 seconds
- Maintains history of disconnected devices (marked as offline)
- Shows online/offline counts in the header

### Device Management

#### Editing Client Names
1. Click the edit icon next to a client name
2. Type the new name
3. Press Enter or click outside to save
4. Changes are saved to browser localStorage

#### Adding Notes
1. Click the edit icon in the Notes column
2. Type your notes (supports multi-line)
3. Press Ctrl+Enter or click outside to save
4. Notes are saved to browser localStorage

#### RDP Connection
1. Click the computer icon in the Actions column for online devices
2. Opens RDP connection using the device's VPN IP address
3. Also copies `mstsc /v:IP_ADDRESS` command to clipboard

### Search and Filtering

- Search bar filters devices by:
  - Hostname
  - IP Address
  - Client Name
  - Notes
- Real-time filtering as you type

### Pagination

- Configurable rows per page: 10, 25, 50, 100
- Default: 50 devices per page
- Page navigation controls

## Data Persistence

- Client names and notes are stored in browser localStorage
- Data persists across browser sessions
- Each device is identified by its hostname for consistent storage

## Offline Device Tracking

- Devices that disconnect remain visible in the list
- Marked with "Offline" status chip (red)
- Shows "Disconnected X ago" instead of connection time
- IP addresses and data stats are grayed out for offline devices
- Offline devices are sorted below online devices

## API Integration

The Dashboard uses the `/api/devices` endpoint which:
- Connects to OpenVPN management interface
- Retrieves current client list
- Returns device information including IPs, connection times, and data statistics

## Troubleshooting

### No devices showing
1. Verify OpenVPN management interface is enabled
2. Check backend server is running on port 8080
3. Verify OpenVPN management port (default 7505) is accessible
4. Check browser console for API errors

### Devices not updating
1. Check backend server logs for connection errors
2. Verify OpenVPN management interface is responding
3. Refresh the page manually if auto-refresh stops

### RDP connection not working
1. Ensure device is online (green status chip)
2. Verify device has a valid IP address
3. Check Windows Remote Desktop is enabled on target device
4. Use the copied `mstsc` command as fallback

