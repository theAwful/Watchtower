import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

/**
 * Full-screen VNC console viewer. Used inside an iframe from the Proxmox page.
 * URL params: node, vmid, type (optional, default qemu).
 * Connects to our backend WebSocket proxy at /api/proxmox/vnc-ws.
 */
export default function VncViewer() {
  const [searchParams] = useSearchParams();
  const screenRef = useRef(null);
  const rfbRef = useRef(null);
  const [status, setStatus] = useState('Connecting…');
  const [error, setError] = useState(null);

  const node = searchParams.get('node');
  const vmid = searchParams.get('vmid');
  const type = searchParams.get('type') || 'qemu';

  useEffect(() => {
    if (!node || !vmid || !screenRef.current) return;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/api/proxmox/vnc-ws?node=${encodeURIComponent(node)}&vmid=${encodeURIComponent(vmid)}&type=${encodeURIComponent(type)}`;

    let rfb = null;
    let cancelled = false;

    (async () => {
      try {
        const { default: RFB } = await import('@novnc/novnc/core/rfb.js');
        if (cancelled || !screenRef.current) return;
        rfb = new RFB(screenRef.current, wsUrl);
        rfbRef.current = rfb;
        rfb.scaleViewport = true;
        rfb.resizeSession = true;
        rfb.addEventListener('connect', () => setStatus('Connected'));
        rfb.addEventListener('disconnect', (e) => {
          setStatus(e.detail?.clean ? 'Disconnected' : 'Connection closed');
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load console');
      }
    })();

    return () => {
      cancelled = true;
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect();
        } catch (_) {}
        rfbRef.current = null;
      }
    };
  }, [node, vmid, type]);

  if (!node || !vmid) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography>Missing node or vmid in URL.</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1a1a1a',
      }}
    >
      <Typography variant="caption" sx={{ px: 1, py: 0.5, color: '#888' }}>
        {status}
      </Typography>
      <Box ref={screenRef} sx={{ flex: 1, minHeight: 0 }} />
    </Box>
  );
}
