import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import net from 'net';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import * as proxmox from './proxmox.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
const LOG_DIR = process.env.LOG_DIR || path.resolve(__dirname, 'logs');
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || path.join(LOG_DIR, 'server-events.log');
const REQUEST_LOG_LEVEL = (process.env.REQUEST_LOG_LEVEL || 'changes').toLowerCase();
const MAX_LOG_FILE_SIZE_MB = parseInt(process.env.MAX_LOG_FILE_SIZE_MB || '10', 10);
const MAX_LOG_FILE_SIZE_BYTES = Math.max(1, MAX_LOG_FILE_SIZE_MB) * 1024 * 1024;
const LOG_MAX_ROLLOVERS = parseInt(process.env.LOG_MAX_ROLLOVERS || '5', 10);
const ATTACK_MACHINE_TAG = (process.env.ATTACK_MACHINE_TAG || 'attack-machine').trim();

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateLogFiles() {
  try {
    if (!fs.existsSync(LOG_FILE_PATH)) return;
    const stats = fs.statSync(LOG_FILE_PATH);
    if (!stats.isFile() || stats.size < MAX_LOG_FILE_SIZE_BYTES) return;

    const maxRollovers = Math.max(1, LOG_MAX_ROLLOVERS);
    const oldestPath = `${LOG_FILE_PATH}.${maxRollovers}`;
    if (fs.existsSync(oldestPath)) {
      fs.unlinkSync(oldestPath);
    }

    for (let i = maxRollovers - 1; i >= 1; i -= 1) {
      const src = `${LOG_FILE_PATH}.${i}`;
      const dest = `${LOG_FILE_PATH}.${i + 1}`;
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
      }
    }

    fs.renameSync(LOG_FILE_PATH, `${LOG_FILE_PATH}.1`);
  } catch (err) {
    console.error('Failed to rotate server log:', err.message);
  }
}

function appendServerLog(entry) {
  const line = `${JSON.stringify(entry)}\n`;
  rotateLogFiles();
  fs.appendFile(LOG_FILE_PATH, line, (err) => {
    if (err) {
      console.error('Failed to write server log:', err.message);
    }
  });
}

function logEvent(event, details = {}) {
  const payload = { ts: new Date().toISOString(), level: 'info', event, ...details };
  appendServerLog(payload);
  if (REQUEST_LOG_LEVEL === 'verbose') {
    console.log(`[${event}]`, details);
  }
}

function logError(event, error, details = {}) {
  const message = error?.message || String(error);
  const payload = {
    ts: new Date().toISOString(),
    level: 'error',
    event,
    message,
    ...details,
  };
  appendServerLog(payload);
  console.error(`[${event}]`, message);
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((t) => String(t || '').trim()).filter(Boolean))];
  }
  if (typeof tags === 'string') {
    return [...new Set(tags.split(/[;,]/).map((t) => t.trim()).filter(Boolean))];
  }
  return [];
}

function withAttackMachineTag(tags) {
  const merged = new Set(normalizeTags(tags));
  if (ATTACK_MACHINE_TAG) merged.add(ATTACK_MACHINE_TAG);
  return Array.from(merged);
}

// OpenVPN management interface configuration
const OPENVPN_HOST = process.env.OPENVPN_HOST || '192.168.68.66';
const OPENVPN_PORT = parseInt(process.env.OPENVPN_PORT || '7505', 10);
const OPENVPN_PASSWORD = process.env.OPENVPN_PASSWORD || '';

// Auth: single user from env. Session secret derived from credentials if not set.
const AUTH_USER = process.env.WATCHTOWER_USER || '';
const AUTH_PASSWORD = process.env.WATCHTOWER_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || (
  AUTH_USER && AUTH_PASSWORD
    ? crypto.createHash('sha256').update(AUTH_USER + ':' + AUTH_PASSWORD).digest('hex')
    : 'watchtower-fallback'
);

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === '1',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// Require session for /api except auth and health (only when login is configured)
app.use('/api', (req, res, next) => {
  if (!AUTH_USER || !AUTH_PASSWORD) {
    return next();
  }
  const pathOnly = (req.originalUrl || req.url || '').split('?')[0];
  if (pathOnly === '/api/auth/login' && req.method === 'POST') return next();
  if (pathOnly === '/api/auth/status' && req.method === 'GET') return next();
  if (pathOnly === '/api/health' && req.method === 'GET') return next();
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Optional request logging (off by default; verbose only when explicitly enabled)
app.use('/api', (req, res, next) => {
  if (REQUEST_LOG_LEVEL !== 'verbose') return next();
  const started = Date.now();
  res.on('finish', () => {
    logEvent('api_request', {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - started,
    });
  });
  next();
});

// Persistent connection to OpenVPN
let openvpnClient = null;
let connectionReady = false;
let connectionPromise = null;

// Helper function to get or create OpenVPN connection
function getOpenVPNConnection() {
  // If we have a ready connection, return it
  if (openvpnClient && connectionReady) {
    return Promise.resolve({ client: openvpnClient, authenticated: true });
  }
  
  // If we're already connecting, wait for that
  if (connectionPromise) {
    return connectionPromise;
  }
  
  // Start new connection
  connectionPromise = connectToOpenVPN();
  return connectionPromise;
}

// Helper function to connect to OpenVPN management interface
function connectToOpenVPN() {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(OPENVPN_PORT, OPENVPN_HOST);
    let buffer = '';
    let authenticated = false;
    let timeoutId;

    // Helper to authenticate and resolve
    const authenticate = () => {
      if (!authenticated) {
        authenticated = true;
        connectionReady = true;
        openvpnClient = client;
        clearTimeout(timeoutId);
        connectionPromise = null;
        resolve({ client, authenticated: true });
      }
    };

    client.on('connect', () => {
      console.log('Connected to OpenVPN management interface');
      
      // If no password is required, authenticate immediately
      // Some OpenVPN interfaces don't send greeting, so we proceed right away
      if (!OPENVPN_PASSWORD) {
        authenticate();
      }
    });

    client.on('data', (data) => {
      const dataStr = data.toString();
      buffer += dataStr;
      
      // Debug: log first data received
      if (buffer.length === dataStr.length) {
        console.log('Received initial data from OpenVPN:', buffer.substring(0, 100));
      }
      
      // Check for initial greeting or ready message
      if (!authenticated) {
        // If password is required, check for authentication prompt
        if (OPENVPN_PASSWORD) {
          // Look for password prompt or send password
          if (buffer.includes('ENTER PASSWORD:') || buffer.includes('>PASSWORD:')) {
            client.write(`PASSWORD ${OPENVPN_PASSWORD}\r\n`);
          } else if (buffer.includes('SUCCESS: password is correct')) {
            authenticated = true;
            buffer = '';
            clearTimeout(timeoutId);
            resolve({ client, authenticated: true });
            return;
          } else if (buffer.includes('ERROR') || buffer.includes('FAILURE')) {
            clearTimeout(timeoutId);
            client.destroy();
            reject(new Error('OpenVPN authentication failed'));
            return;
          }
        } else {
          // No password required - if we get here, authenticate (shouldn't happen if connect handler worked)
          authenticate();
        }
      }
    });


    client.on('close', () => {
      console.log('OpenVPN connection closed');
      // Reset connection state
      if (openvpnClient === client) {
        openvpnClient = null;
        connectionReady = false;
        connectionPromise = null;
      }
    });
    
    client.on('error', (err) => {
      console.error('OpenVPN connection error:', err);
      // Reset connection state on error
      if (openvpnClient === client) {
        openvpnClient = null;
        connectionReady = false;
        connectionPromise = null;
      }
      clearTimeout(timeoutId);
      connectionPromise = null;
      reject(err);
    });

    // Timeout for connection/authentication
    timeoutId = setTimeout(() => {
      if (!authenticated) {
        client.destroy();
        reject(new Error('OpenVPN connection timeout - check if management interface is enabled and accessible'));
      }
    }, 10000); // Increased timeout to 10 seconds
  });
}

// Helper function to send command to OpenVPN
function sendCommand(client, command) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let responseComplete = false;
    let timeoutId;

    const dataHandler = (data) => {
      const dataStr = data.toString();
      buffer += dataStr;
      
      
      // OpenVPN status command ends with "END" on a line by itself
      // Check multiple patterns for END marker
      const hasEnd = buffer.includes('\nEND\n') || 
                     buffer.includes('\r\nEND\r\n') ||
                     buffer.endsWith('\nEND') || 
                     buffer.endsWith('\r\nEND') ||
                     buffer.endsWith('END\r\n') ||
                     buffer.endsWith('END\n') ||
                     /END[\r\n]*$/.test(buffer);
      
      // Also check if we see the prompt ">" which indicates command is done
      const hasPrompt = buffer.includes('\n>') || buffer.endsWith('>');
      
      if (hasEnd || hasPrompt) {
        responseComplete = true;
        clearTimeout(timeoutId);
        client.removeListener('data', dataHandler);
        resolve(buffer);
      }
    };

    client.on('data', dataHandler);
    
    client.write(`${command}\r\n`);

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      if (!responseComplete) {
        client.removeListener('data', dataHandler);
        reject(new Error('Command timeout'));
      }
    }, 10000);
  });
}

// Parse OpenVPN status output
// OpenVPN status format: CSV with HEADER,CLIENT_LIST line followed by CLIENT_LIST,data lines
function parseStatus(statusText) {
  const lines = statusText.split('\n');
  const clients = [];
  let headerFound = false;
  let headerIndexes = {};

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for CLIENT_LIST header to understand column order
    if (trimmed.startsWith('HEADER,CLIENT_LIST')) {
      headerFound = true;
      // Parse header: HEADER,CLIENT_LIST,Common Name,Real Address,Virtual Address,...
      const headerParts = trimmed.split(',');
      // In header: index 0=HEADER, 1=CLIENT_LIST, 2=Common Name, 3=Real Address, etc.
      // In data: index 0=CLIENT_LIST, 1=Common Name, 2=Real Address, etc.
      // So we need to subtract 1 from header index to get data index
      headerIndexes = {
        commonName: headerParts.indexOf('Common Name') - 1,
        realAddress: headerParts.indexOf('Real Address') - 1,
        virtualAddress: headerParts.indexOf('Virtual Address') - 1,
        bytesReceived: headerParts.indexOf('Bytes Received') - 1,
        bytesSent: headerParts.indexOf('Bytes Sent') - 1,
        connectedSince: headerParts.indexOf('Connected Since') - 1,
        username: headerParts.indexOf('Username') >= 0 ? headerParts.indexOf('Username') - 1 : -1,
      };
      continue;
    }
    
    // Look for client list data entries: CLIENT_LIST,CommonName,RealAddress,VirtualAddress,...
    if (headerFound && trimmed.startsWith('CLIENT_LIST,')) {
      const parts = trimmed.split(',');
      // parts[0] = "CLIENT_LIST", parts[1] = Common Name, parts[2] = Real Address, etc.
      if (parts.length >= 4) {
        const client = {
          commonName: parts[headerIndexes.commonName] || parts[1] || '',
          realAddress: parts[headerIndexes.realAddress] || parts[2] || '',
          virtualAddress: parts[headerIndexes.virtualAddress] || parts[3] || '',
          bytesReceived: parts[headerIndexes.bytesReceived] || parts[5] || '0',
          bytesSent: parts[headerIndexes.bytesSent] || parts[6] || '0',
          connectedSince: parts[headerIndexes.connectedSince] || parts[7] || '',
          username: headerIndexes.username >= 0 ? (parts[headerIndexes.username] || '') : '',
          lastSeen: new Date().toISOString(),
        };
        clients.push(client);
      } else {
      }
    }
    
    // Stop parsing when we hit END or ROUTING_TABLE
    if (trimmed === 'END' || trimmed.startsWith('ROUTING_TABLE') || trimmed.startsWith('HEADER,ROUTING_TABLE')) {
      break;
    }
  }

  return clients;
}

// --- Auth ---
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!AUTH_USER || !AUTH_PASSWORD) {
    return res.status(503).json({ error: 'Login not configured (set WATCHTOWER_USER and WATCHTOWER_PASSWORD)' });
  }
  if (String(username) === AUTH_USER && String(password) === AUTH_PASSWORD) {
    req.session.user = { username: AUTH_USER };
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json({ user: req.session.user });
    });
    return;
  }
  res.status(401).json({ error: 'Incorrect username or password' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Get connected devices
app.get('/api/devices', async (req, res) => {
  try {
    // Get or create persistent connection
    const connection = await getOpenVPNConnection();
    const client = connection.client;
    
    // Get status (status 2 = detailed status with client list)
    const statusText = await sendCommand(client, 'status 2');
    
    // Parse the status
    const clients = parseStatus(statusText);
    
    res.json({
      devices: clients.map(client => ({
        id: client.commonName || client.realAddress,
        name: client.commonName || 'Unknown',
        hostname: client.commonName || 'Unknown',
        realAddress: client.realAddress,
        virtualAddress: client.virtualAddress,
        connectedSince: client.connectedSince,
        lastSeen: client.lastSeen,
        bytesReceived: client.bytesReceived,
        bytesSent: client.bytesSent,
        online: true, // All clients in status are online
      })),
      auth_required: false,
    });
  } catch (error) {
    console.error('Error fetching OpenVPN devices:', error);
    // Reset connection on error so it reconnects next time
    openvpnClient = null;
    connectionReady = false;
    connectionPromise = null;
    
    res.status(500).json({
      devices: [],
      error: error.message || 'Failed to fetch devices',
      auth_required: false,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxmox API endpoints

// Get all VMs
app.get('/api/proxmox/vms', async (req, res) => {
  try {
    const vms = await proxmox.getVMs();
    res.json({ vms: vms || [] });
  } catch (error) {
    logError('proxmox_vms_fetch_failed', error);
    res.status(500).json({
      vms: [],
      error: error.message || 'Failed to fetch VMs',
    });
  }
});

// Get Proxmox nodes
app.get('/api/proxmox/nodes', async (req, res) => {
  try {
    const nodes = await proxmox.getNodes();
    res.json({ nodes });
  } catch (error) {
    console.error('Error fetching Proxmox nodes:', error);
    res.status(500).json({
      nodes: [],
      error: error.message || 'Failed to fetch nodes',
    });
  }
});

// Get QEMU VM templates (e.g. tmpl-Kali, tmpl-Win11)
app.get('/api/proxmox/templates', async (req, res) => {
  try {
    const templates = await proxmox.getTemplates();
    res.json({ templates: templates || [] });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      templates: [],
      error: error.message || 'Failed to fetch templates',
    });
  }
});

// Get next available VMID
app.get('/api/proxmox/next-vmid', async (req, res) => {
  try {
    const nextId = await proxmox.getNextVmid();
    res.json({ nextid: nextId });
  } catch (error) {
    console.error('Error fetching next VMID:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch next VMID',
    });
  }
});

// Create VM from template (clone on pve-node0; backend task runs async)
app.post('/api/proxmox/vms/create-from-template', async (req, res) => {
  try {
    const { templateVmid, templateNode, name, vmid, pool, full, tags } = req.body;
    if (!templateVmid || !templateNode) {
      return res.status(400).json({
        error: 'templateVmid and templateNode are required',
      });
    }
    const result = await proxmox.createFromTemplate({
      templateVmid: parseInt(templateVmid, 10),
      templateNode,
      name: name || undefined,
      vmid: vmid != null ? parseInt(vmid, 10) : undefined,
      pool: pool || undefined,
      full: full === true,
      tags: withAttackMachineTag(tags),
    });
    logEvent('proxmox_vm_create_started', {
      templateNode,
      templateVmid: parseInt(templateVmid, 10),
      vmid: result?.vmid,
      node: result?.node,
      name: result?.name || name || null,
      user: req.session?.user?.username || null,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logError('proxmox_vm_create_failed', error, {
      templateNode: req.body?.templateNode || null,
      templateVmid: req.body?.templateVmid || null,
      user: req.session?.user?.username || null,
    });
    res.status(500).json({
      error: error.message || 'Failed to create VM from template',
    });
  }
});

// Poll task status (clone progress)
app.get('/api/proxmox/tasks/status', async (req, res) => {
  try {
    const { node, upid } = req.query;
    if (!node || !upid) {
      return res.status(400).json({ error: 'node and upid are required' });
    }
    const status = await proxmox.getTaskStatus(node, decodeURIComponent(upid));
    res.json(status || {});
  } catch (error) {
    console.error('Error fetching task status:', error);
    res.status(500).json({
      error: error.message || 'Failed to get task status',
      status: 'error',
    });
  }
});

// Finalize VM creation after clone task completes (migrate if needed)
app.post('/api/proxmox/vms/create-from-template/finalize', async (req, res) => {
  try {
    const { templateNode, vmid, targetNode, name } = req.body;
    if (!templateNode || vmid == null) {
      return res.status(400).json({
        error: 'templateNode and vmid are required',
      });
    }
    const result = await proxmox.finalizeCreateFromTemplate({
      templateNode,
      vmid: parseInt(vmid, 10),
      targetNode: targetNode || templateNode,
      name: name || undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error finalizing VM creation:', error);
    res.status(500).json({
      error: error.message || 'Failed to finalize VM creation',
    });
  }
});

// Get available ISOs and templates for a node
app.get('/api/proxmox/nodes/:node/isos-templates', async (req, res) => {
  try {
    const { node } = req.params;
    const result = await proxmox.getAvailableISOsAndTemplates(node);
    res.json(result);
  } catch (error) {
    console.error('Error fetching ISOs and templates:', error);
    res.status(500).json({
      isos: [],
      templates: [],
      error: error.message || 'Failed to fetch ISOs and templates',
    });
  }
});

// Deploy a new VM
app.post('/api/proxmox/vms/deploy', async (req, res) => {
  try {
    const { node, vmid, config } = req.body;

    if (!node || !vmid) {
      return res.status(400).json({
        error: 'Missing required fields: node and vmid are required',
      });
    }

    // Check if this is a clone operation
    if (config?.cloneFrom) {
      const cloneConfig = { ...(config || {}), tags: withAttackMachineTag(config?.tags) };
      const result = await proxmox.cloneVM(node, config.cloneFrom, vmid, cloneConfig);
      logEvent('proxmox_vm_clone_started', {
        node,
        sourceVmid: config.cloneFrom,
        vmid,
        user: req.session?.user?.username || null,
      });
      res.json({ success: true, result });
    } else {
      const deployConfig = { ...(config || {}), tags: withAttackMachineTag(config?.tags) };
      const result = await proxmox.deployVM(node, vmid, deployConfig);
      logEvent('proxmox_vm_deploy_started', {
        node,
        vmid,
        type: config?.type || 'qemu',
        user: req.session?.user?.username || null,
      });
      res.json({ success: true, result });
    }
  } catch (error) {
    logError('proxmox_vm_deploy_failed', error, {
      node: req.body?.node || null,
      vmid: req.body?.vmid || null,
      user: req.session?.user?.username || null,
    });
    res.status(500).json({
      error: error.message || 'Failed to deploy VM',
    });
  }
});

// Normalize VM type from query (avoid "undefined" string breaking Proxmox paths)
const vmType = (t) => (t === 'lxc' ? 'lxc' : 'qemu');

// Tear down (delete) a VM
app.delete('/api/proxmox/vms/:node/:vmid', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const type = vmType(req.query.type);

    const status = await proxmox.getVMStatus(node, vmid, type);
    if (status && status.status === 'running') {
      return res.status(400).json({
        error: 'VM must be stopped first',
      });
    }

    const result = await proxmox.tearDownVM(node, vmid, type);
    logEvent('proxmox_vm_deleted', {
      node,
      vmid,
      type,
      user: req.session?.user?.username || null,
    });
    res.json({ success: true, result });
  } catch (error) {
    logError('proxmox_vm_delete_failed', error, {
      node: req.params?.node || null,
      vmid: req.params?.vmid || null,
      type: req.query?.type || 'qemu',
      user: req.session?.user?.username || null,
    });
    const message = (error.message || '').toLowerCase();
    if (message.includes('running') || message.includes('stop the vm') || message.includes('must be stopped')) {
      return res.status(400).json({ error: 'VM must be stopped first' });
    }
    res.status(500).json({
      error: error.message || 'Failed to tear down VM',
    });
  }
});

// Start a VM
app.post('/api/proxmox/vms/:node/:vmid/start', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const type = vmType(req.query.type);
    
    const result = await proxmox.startVM(node, vmid, type);
    logEvent('proxmox_vm_start_requested', {
      node,
      vmid,
      type,
      user: req.session?.user?.username || null,
    });
    res.json({ success: true, result });
  } catch (error) {
    logError('proxmox_vm_start_failed', error, {
      node: req.params?.node || null,
      vmid: req.params?.vmid || null,
      type: req.query?.type || 'qemu',
      user: req.session?.user?.username || null,
    });
    res.status(500).json({
      error: error.message || 'Failed to start VM',
    });
  }
});

// Stop a VM
app.post('/api/proxmox/vms/:node/:vmid/stop', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const type = vmType(req.query.type);
    
    const result = await proxmox.stopVM(node, vmid, type);
    logEvent('proxmox_vm_stop_requested', {
      node,
      vmid,
      type,
      user: req.session?.user?.username || null,
    });
    res.json({ success: true, result });
  } catch (error) {
    logError('proxmox_vm_stop_failed', error, {
      node: req.params?.node || null,
      vmid: req.params?.vmid || null,
      type: req.query?.type || 'qemu',
      user: req.session?.user?.username || null,
    });
    res.status(500).json({
      error: error.message || 'Failed to stop VM',
    });
  }
});

app.post('/api/proxmox/vms/:node/:vmid/restart', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const type = vmType(req.query.type);
    
    const result = await proxmox.rebootVM(node, vmid, type);
    logEvent('proxmox_vm_restart_requested', {
      node,
      vmid,
      type,
      user: req.session?.user?.username || null,
    });
    res.json({ success: true, result });
  } catch (error) {
    logError('proxmox_vm_restart_failed', error, {
      node: req.params?.node || null,
      vmid: req.params?.vmid || null,
      type: req.query?.type || 'qemu',
      user: req.session?.user?.username || null,
    });
    res.status(500).json({
      error: error.message || 'Failed to restart VM',
    });
  }
});

// Set Proxmox session cookie (same-origin only). After Watchtower login, redirect here to set PVEAuthCookie so noVNC works when Proxmox is reverse-proxied under the same domain.
app.get('/api/proxmox/set-session', async (req, res) => {
  const redirectTo = (req.query.redirect && typeof req.query.redirect === 'string') ? req.query.redirect : '/';
  try {
    const { ticket } = await proxmox.getPVETicket();
    const isSecure = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
    res.cookie('PVEAuthCookie', ticket, {
      path: '/',
      maxAge: 2 * 60 * 60,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
    });
    res.redirect(302, redirectTo.startsWith('/') ? redirectTo : '/');
  } catch (err) {
    console.error('Proxmox set-session failed:', err.message);
    res.redirect(302, redirectTo.startsWith('/') ? redirectTo : '/');
  }
});

// Console: API token → vncproxy (websocket=1) → vncticket + port → return Proxmox noVNC URL. No session, no WebSocket proxy. User must be logged into Proxmox in browser for noVNC to work.
app.get('/api/proxmox/vms/:node/:vmid/console', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const type = vmType(req.query.type) || 'qemu';
    const vmname = (req.query.vmname && typeof req.query.vmname === 'string') ? req.query.vmname : '';
    const result = await proxmox.getVNCConsole(node, vmid, type, vmname);
    if (!result?.url) {
      return res.status(502).json({ error: 'Proxmox vncproxy did not return a console URL' });
    }
    res.json({ success: true, url: result.url });
  } catch (err) {
    console.error('[Console]', err.message);
    res.status(500).json({ error: err.message || 'Failed to get console URL' });
  }
});

// Get storage pools
app.get('/api/proxmox/pools', async (req, res) => {
  try {
    const pools = await proxmox.getPools();
    res.json({ pools: pools || [] });
  } catch (error) {
    console.error('Error fetching pools:', error);
    // Return empty array instead of error, so frontend can still work
    res.json({
      pools: [],
      error: error.message || 'Failed to fetch pools',
    });
  }
});

// Get pool details
app.get('/api/proxmox/pools/:poolid', async (req, res) => {
  try {
    const { poolid } = req.params;
    const poolInfo = await proxmox.getPoolVMs(poolid);
    res.json({ ...poolInfo });
  } catch (error) {
    console.error('Error fetching pool details:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch pool details',
    });
  }
});

// Update pool directly (for removing VMs)
app.put('/api/proxmox/pools/:poolid', async (req, res) => {
  try {
    const { poolid } = req.params;
    const { vms } = req.body;
    
    const result = await proxmox.updatePool(poolid, vms);
    logEvent('proxmox_pool_updated', {
      poolid,
      vmCount: typeof vms === 'string' && vms.trim() ? vms.split(',').length : 0,
      user: req.session?.user?.username || null,
    });
    res.json({ success: true, result });
  } catch (error) {
    logError('proxmox_pool_update_failed', error, {
      poolid: req.params?.poolid || null,
      user: req.session?.user?.username || null,
    });
    res.status(500).json({
      error: error.message || 'Failed to update pool',
    });
  }
});

// Update VM pool membership
app.put('/api/proxmox/vms/:node/:vmid/pool', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const { type, poolid } = req.body;

    if (!poolid) {
      return res.status(400).json({
        error: 'Missing required field: poolid',
      });
    }

    const result = await proxmox.updateVMPool(vmid, type || 'qemu', poolid, node);
    logEvent('proxmox_vm_pool_updated', {
      node,
      vmid,
      type: type || 'qemu',
      poolid,
      user: req.session?.user?.username || null,
    });
    res.json({ success: true, result });
  } catch (error) {
    logError('proxmox_vm_pool_update_failed', error, {
      node: req.params?.node || null,
      vmid: req.params?.vmid || null,
      user: req.session?.user?.username || null,
    });
    res.status(500).json({
      error: error.message || 'Failed to update VM pool',
    });
  }
});

// Serve frontend build in production (single process: API + static UI)
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
const indexHtml = path.join(frontendDist, 'index.html');
const frontendExists = fs.existsSync(frontendDist) && fs.existsSync(indexHtml);

if (frontendExists) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(indexHtml);
  });
  console.log('Serving frontend from', frontendDist);
} else {
  app.get(/^\/(?!api).*/, (req, res) => {
    res.status(503).set('Content-Type', 'text/html').send(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;">
        <h1>Frontend not built</h1>
        <p>Run from the repo root:</p>
        <pre>cd frontend && npm install && npm run build</pre>
        <p>Then restart the server. Expected folder: <code>${frontendDist}</code></p>
      </body></html>`
    );
  });
  console.warn('Frontend dist not found at', frontendDist, '- build with: cd frontend && npm run build');
}

// HTTPS: set SSL_CERT_PATH and SSL_KEY_PATH in .env to serve over https (e.g. IP:port)
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;

function createServer() {
  if (SSL_CERT_PATH && SSL_KEY_PATH) {
    try {
      const key = fs.readFileSync(SSL_KEY_PATH, 'utf8');
      const cert = fs.readFileSync(SSL_CERT_PATH, 'utf8');
      return https.createServer({ key, cert }, app);
    } catch (err) {
      console.error('Failed to load SSL cert/key:', err.message);
      console.error('Check SSL_CERT_PATH and SSL_KEY_PATH in .env. Falling back to HTTP.');
    }
  }
  return http.createServer(app);
}

const server = createServer();
if (!server) process.exit(1);

const onListen = () => {
  console.log(`Watchtower Server running on port ${PORT} (${SSL_CERT_PATH ? 'HTTPS' : 'HTTP'})`);
  console.log(`OpenVPN Management Interface: ${OPENVPN_HOST}:${OPENVPN_PORT}`);
  if (process.env.PROXMOX_HOST) {
    console.log(`Proxmox API: ${process.env.PROXMOX_HOST}:${process.env.PROXMOX_PORT || 8006}`);
  }
  console.log(`Server event log file: ${LOG_FILE_PATH}`);
  console.log(`Log rotation: ${MAX_LOG_FILE_SIZE_MB}MB x ${Math.max(1, LOG_MAX_ROLLOVERS)} files`);
};

server.listen(PORT, onListen);

