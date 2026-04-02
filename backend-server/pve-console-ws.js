/**
 * Bridges browser ↔ Proxmox VM VNC WebSocket so the client never opens
 * wss://proxmox/.../vncwebsocket directly (no PVE cookie in the browser).
 *
 * Flow: POST vncproxy → GET …/qemu|lxc/{vmid}/vncwebsocket?port=&vncticket= (upstream from Node).
 */
import crypto from 'crypto';
import WebSocket, { WebSocketServer } from 'ws';
import * as proxmox from './proxmox.js';

const TOKEN_TTL_MS = 120_000;
/** @type {Map<string, { node: string, vmid: number, type: string, vncticket: string, port: number, pveCookie: string | null, expiresAt: number }>} */
const consoleTokens = new Map();

export function issuePveConsoleToken(meta) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  consoleTokens.set(token, { ...meta, expiresAt });
  setTimeout(() => consoleTokens.delete(token), TOKEN_TTL_MS + 10_000);
  return token;
}

function buildUpstreamHeaders(pveCookie) {
  if (pveCookie) {
    return { Cookie: `PVEAuthCookie=${pveCookie}` };
  }
  const auth = proxmox.getPveApiTokenAuthorizationHeader();
  if (!auth) return null;
  return { Authorization: auth };
}

/**
 * @param {import('http').Server | import('https').Server} httpServer
 */
export function attachPveConsoleWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    let pathname;
    try {
      pathname = new URL(request.url || '', 'http://localhost').pathname;
    } catch {
      return;
    }
    if (pathname !== '/ws/pve-console') return;

    let token;
    try {
      token = new URL(request.url || '', 'http://localhost').searchParams.get('token');
    } catch {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    if (!token) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const meta = consoleTokens.get(token);
    if (!meta || Date.now() > meta.expiresAt) {
      consoleTokens.delete(token);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const headers = buildUpstreamHeaders(meta.pveCookie);
    if (!headers) {
      consoleTokens.delete(token);
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    const upstreamUrl = proxmox.getProxmoxVncWebSocketUrl(
      meta.node,
      meta.vmid,
      meta.type,
      meta.vncticket,
      meta.port,
    );

    wss.handleUpgrade(request, socket, head, (clientWs) => {
      consoleTokens.delete(token);

      let upstream;
      try {
        upstream = new WebSocket(upstreamUrl, { rejectUnauthorized: false, headers });
      } catch (err) {
        console.error('[pve-console-ws] upstream create failed:', err.message);
        clientWs.close(1011, 'Upstream failed');
        return;
      }

      const clientQueue = [];

      const flushClientQueue = () => {
        while (clientQueue.length && upstream.readyState === WebSocket.OPEN) {
          const [data, isBinary] = clientQueue.shift();
          upstream.send(data, { binary: !!isBinary });
        }
      };

      clientWs.on('message', (data, isBinary) => {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(data, { binary: !!isBinary });
        } else {
          clientQueue.push([data, isBinary]);
        }
      });

      upstream.on('open', () => {
        flushClientQueue();
      });

      upstream.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data, { binary: !!isBinary });
        }
      });

      const shutdown = (fromErr) => {
        if (fromErr) console.error('[pve-console-ws]', fromErr.message || fromErr);
        try {
          clientWs.close();
        } catch {
          /* ignore */
        }
        try {
          upstream.close();
        } catch {
          /* ignore */
        }
      };

      upstream.on('error', (err) => shutdown(err));
      clientWs.on('error', (err) => shutdown(err));
      upstream.on('close', () => {
        try {
          clientWs.close();
        } catch {
          /* ignore */
        }
      });
      clientWs.on('close', () => {
        try {
          upstream.close();
        } catch {
          /* ignore */
        }
      });
    });
  });
}
