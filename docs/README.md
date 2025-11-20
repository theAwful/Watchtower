# Watchtower Documentation

Watchtower is a centralized infrastructure management application for penetration testing environments. It provides a unified dashboard for monitoring connected devices, managing virtual machines, accessing knowledge bases, and tracking tasks.

## Overview

Watchtower is built with:
- **Frontend**: React.js with Material UI, using MVC architecture
- **Backend**: Node.js Express server
- **Architecture**: MVC (Model-View-Controller) pattern for scalability and maintainability

## Application Pages

### 1. [Dashboard (Connected Devices)](./pages/dashboard.md)
Monitor all devices connected to your OpenVPN network in real-time. View connection status, IP addresses, data transfer statistics, and manage device metadata.

### 2. [NUC Build Request](./pages/nuc-build-request.md)
Request form for NUC (Next Unit of Computing) device builds. Submit build requests with client information, engagement details, and shipping addresses.

### 3. [Proxmox VM Management](./pages/proxmox.md)
Manage Proxmox virtual machines and containers. Deploy, start, stop, and delete VMs. Access VNC consoles and organize VMs by pools.

### 4. [Knowledge Base](./pages/knowledge-base.md)
Access and manage pentesting knowledge base articles. Integrates with Atlassian Confluence API or uses local storage for documentation.

### 5. [Task Board](./pages/task-board.md)
Track internal development projects and tasks. Integrates with Trello API or uses local storage for task management.

## API Documentation

- [Backend API Reference](./api/backend-api.md) - Complete API endpoint documentation

## Architecture

### Frontend Structure (MVC)

```
src/
├── models/          # Data layer - API services and business logic
│   ├── ApiModel.js
│   ├── AtlassianModel.js
│   ├── PlexTracModel.js
│   └── TrelloModel.js
├── views/           # Presentation layer - React components
│   ├── components/  # Reusable UI components
│   └── pages/       # Page components
├── controllers/     # Coordination layer - State management
│   └── useInterval.js
└── utils/           # Utility functions
```

### Backend Structure

```
backend-server/
├── server.js        # Express server and OpenVPN integration
├── proxmox.js       # Proxmox API integration
└── package.json
```

## Getting Started

See the main [README.md](../README.md) for setup instructions.

## Features

- **Real-time Device Monitoring**: Automatic refresh of OpenVPN connected devices
- **VM Management**: Full Proxmox integration for virtual machine lifecycle management
- **Knowledge Base**: Centralized documentation with Confluence integration
- **Task Tracking**: Project management with Trello integration
- **Dark/Light Theme**: OLED-friendly dark mode with theme persistence
- **Responsive Design**: Works on desktop and mobile devices
- **RDP Integration**: Quick access to devices via Remote Desktop Protocol
- **VNC Console**: Embedded console access for Proxmox VMs

## Technology Stack

- **Frontend**: React 19, Material UI 7, React Router 7
- **Backend**: Node.js 18+, Express 4
- **Build Tool**: Vite 6
- **Language**: JavaScript (ES6+)

