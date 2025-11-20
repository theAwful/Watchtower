# Quick Start Guide

## Prerequisites

1. **OpenVPN Server** with management interface enabled
2. **Node.js 18+** installed
3. Access to OpenVPN management interface (typically port 7505)

## Step 1: Enable OpenVPN Management Interface

Add this line to your OpenVPN server configuration file:

```
management localhost 7505
```

Or if you want password protection:

```
management localhost 7505 /path/to/password-file
```

Then restart your OpenVPN server.

## Step 2: Start the Backend Server

```bash
cd backend-server

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on port 8080 by default. You can change this by setting the `PORT` environment variable.

## Step 3: Start the Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port Vite assigns).

## Configuration

### Backend Environment Variables

Create a `.env` file in `backend-server/`:

```env
# OpenVPN Configuration
OPENVPN_HOST=localhost
OPENVPN_PORT=7505
OPENVPN_PASSWORD=

# Proxmox Configuration (optional - for VM management)
PROXMOX_HOST=your-proxmox-host
PROXMOX_PORT=8006
PROXMOX_USER=root
PROXMOX_REALM=pam
PROXMOX_TOKEN_ID=your-token-id
PROXMOX_TOKEN_SECRET=your-token-secret

# Server Configuration
PORT=8080
```

**Required:**
- `OPENVPN_HOST`: Hostname where OpenVPN management interface is running (default: localhost)
- `OPENVPN_PORT`: Port for OpenVPN management interface (default: 7505)
- `OPENVPN_PASSWORD`: Password if management interface requires authentication (leave empty if not needed)
- `PORT`: Backend server port (default: 8080)

**Optional (for Proxmox features):**
- `PROXMOX_HOST`: Proxmox server hostname
- `PROXMOX_PORT`: Proxmox API port (default: 8006)
- `PROXMOX_USER`: Proxmox username
- `PROXMOX_REALM`: Authentication realm (default: pam)
- `PROXMOX_TOKEN_ID`: API token ID
- `PROXMOX_TOKEN_SECRET`: API token secret

## Troubleshooting

### "Cannot connect to OpenVPN management interface"

1. Verify OpenVPN is running: `systemctl status openvpn` (Linux) or check your OpenVPN service
2. Check management interface is enabled in OpenVPN config
3. Test connection manually: `telnet localhost 7505` (should connect)
4. Check firewall allows connections to port 7505

### "No devices showing"

1. Make sure devices are actually connected to OpenVPN
2. Check backend server logs for errors
3. Verify OpenVPN management interface responds: `echo "status 2" | nc localhost 7505`

### Backend server errors

Check the console output for detailed error messages. Common issues:
- OpenVPN management interface not accessible
- Wrong port number
- Password required but not provided
- Firewall blocking connection

## Production Deployment

For production, you'll want to:

1. Build the frontend: `cd frontend && npm run build`
2. Serve the built files with a web server (nginx, Apache, etc.)
3. Run the backend server as a service (systemd, PM2, etc.)
4. Set up proper firewall rules
5. Use HTTPS for the frontend

See the main README.md for more details.

