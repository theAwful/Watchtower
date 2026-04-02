import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  OpenInNew as ConsoleIcon,
} from '@mui/icons-material';
import api from '../../models/ApiModel';
import { useInterval } from '../../controllers/useInterval';
import { copyToClipboard } from '../../utils/clipboardUtils';

const STATUS_FILTER_ALL = 'all';
const STATUS_FILTER_RUNNING = 'running';
const VM_POLL_INTERVAL_MS = 30000;
const TEMPLATE_OPTIONS = [
  { name: 'tmpl-Kali', label: 'Kali' },
  { name: 'tmpl-Win11', label: 'Windows 11' },
];

/** Matches backend default WATCHTOWER_VM_DELETE_REQUEST_TAG (ToBeDeleted), case-insensitive. */
const hasDeletionRequestTag = (vm) =>
  Array.isArray(vm?.tags) &&
  vm.tags.some((t) => String(t || '').trim().toLowerCase() === 'tobedeleted');

const powerPendingKey = (vm) => `${vm.node}|${vm.vmid}|${vm?.type === 'lxc' ? 'lxc' : 'qemu'}`;

const CREATE_PROVISION_POLL_MS = 3000;
const CREATE_PROVISION_TIMEOUT_MS = 600000;

/** Same vmid + final name checks as create provisioning (must match API list row). */
function vmCloneMatchesProvision(v, vmid, provisionName) {
  if (Number(v?.vmid) !== Number(vmid)) return false;
  const actual = String(v.name || '').trim().toLowerCase();
  if (!actual) return false;
  const expected = String(provisionName || '').trim().toLowerCase();
  if (expected) {
    return actual === expected;
  }
  const id = String(vmid);
  const generic = new Set([`vm-${id}`, `vm ${id}`, `vmid-${id}`, id]);
  return !generic.has(actual);
}

/** Same filtering as the VM table (status + search) — provisioning completes only when the row is visible here. */
function getTableVisibleVms(vms, statusFilter, searchQuery) {
  const filteredVms =
    statusFilter === STATUS_FILTER_RUNNING ? vms.filter((vm) => vm.status === 'running') : vms;
  const searchLower = searchQuery.trim().toLowerCase();
  if (!searchLower) return filteredVms;
  return filteredVms.filter(
    (vm) =>
      (vm.name && vm.name.toLowerCase().includes(searchLower)) ||
      String(vm.vmid).includes(searchQuery.trim()) ||
      (vm.ip && vm.ip.includes(searchQuery.trim())),
  );
}

const Proxmox = () => {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_RUNNING);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createConfig, setCreateConfig] = useState({
    template: '',
    operatorUserid: '',
    clientName: '',
  });
  const [operators, setOperators] = useState([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorsError, setOperatorsError] = useState(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [namePreview, setNamePreview] = useState('');
  const [namePreviewLoading, setNamePreviewLoading] = useState(false);
  const [createProvisioning, setCreateProvisioning] = useState(null);
  const [powerPending, setPowerPending] = useState({});
  const [flagDeleteDialogVm, setFlagDeleteDialogVm] = useState(null);
  const [flagDeleteSubmitting, setFlagDeleteSubmitting] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(typeof document !== 'undefined' ? document.visibilityState === 'visible' : true);
  const [consoleOpeningKey, setConsoleOpeningKey] = useState(null);

  const provisionCompleteFiredRef = useRef(false);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const fetchVMs = useCallback(async (showLoading = false, options = {}) => {
    const silent = options.silent === true;
    try {
      if (showLoading) setLoading(true);
      const response = await api.get('/api/proxmox/vms');
      const list = response.data.vms || [];
      setVms(list);
      setError(null);
      setPowerPending((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const pend = next[key];
          if (Date.now() > pend.deadline) {
            delete next[key];
            continue;
          }
          const [node, vmidStr, typ] = key.split('|');
          const vmid = parseInt(vmidStr, 10);
          const row = list.find(
            (v) => v.node === node && v.vmid === vmid && (v.type === 'lxc' ? 'lxc' : 'qemu') === typ,
          );
          if (!row) continue;
          if (pend.untilStatus === 'running' && pend.restartGateMs != null) {
            if (row.status === 'running' && Date.now() >= pend.restartGateMs) delete next[key];
          } else if (row.status === pend.untilStatus) {
            delete next[key];
          }
        }
        return next;
      });
    } catch (err) {
      console.error('Error fetching VMs:', err);
      if (!silent) {
        setError(err.response?.data?.error || 'Failed to fetch VMs');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVMs(true);
  }, [fetchVMs]);

  useEffect(() => {
    if (Object.keys(powerPending).length === 0) return undefined;
    const id = setInterval(() => {
      fetchVMs(false, { silent: true });
    }, 2000);
    return () => clearInterval(id);
  }, [powerPending, fetchVMs]);

  useEffect(() => {
    if (!createDialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        setOperatorsLoading(true);
        setOperatorsError(null);
        const res = await api.get('/api/proxmox/operators');
        if (cancelled) return;
        setOperators(res.data.operators || []);
      } catch (err) {
        if (!cancelled) {
          setOperators([]);
          setOperatorsError(err.response?.data?.error || 'Could not load operators from Proxmox');
        }
      } finally {
        if (!cancelled) setOperatorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createDialogOpen]);

  useEffect(() => {
    if (!createDialogOpen || createProvisioning) {
      setNamePreview('');
      setNamePreviewLoading(false);
      return;
    }
    const uid = createConfig.operatorUserid;
    const cn = createConfig.clientName;
    if (!uid || !String(cn).trim()) {
      setNamePreview('');
      setNamePreviewLoading(false);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setNamePreviewLoading(true);
        const r = await api.get('/api/proxmox/vm-name-preview', {
          params: { operatorUserid: uid, clientName: cn },
        });
        setNamePreview(r.data?.name || '');
      } catch {
        setNamePreview('');
      } finally {
        setNamePreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [createDialogOpen, createProvisioning, createConfig.operatorUserid, createConfig.clientName]);

  useEffect(() => {
    if (!createProvisioning?.vmid) return undefined;
    const { timedOut, deadline } = createProvisioning;

    const tick = async () => {
      await fetchVMs(false, { silent: true });
      if (!timedOut && Date.now() > deadline) {
        setCreateProvisioning((p) => (p && !p.timedOut ? { ...p, timedOut: true } : p));
      }
    };

    const intervalMs = timedOut ? 15000 : CREATE_PROVISION_POLL_MS;
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [createProvisioning, fetchVMs]);

  useEffect(() => {
    if (!createProvisioning?.vmid) {
      provisionCompleteFiredRef.current = false;
      return;
    }
    if (provisionCompleteFiredRef.current) return;

    const { vmid, name: provisionName } = createProvisioning;
    const visible = getTableVisibleVms(vms, statusFilter, searchQuery);
    const hit = visible.some((v) => vmCloneMatchesProvision(v, vmid, provisionName));
    if (!hit) return;

    provisionCompleteFiredRef.current = true;
    const displayName = provisionName?.trim() || `VM ${vmid}`;
    setCreateProvisioning(null);
    setCreateDialogOpen(false);
    setCreateConfig({ template: '', operatorUserid: '', clientName: '' });
    setSnackbar({
      open: true,
      message: `${displayName} is ready.`,
      severity: 'success',
    });
  }, [vms, createProvisioning, statusFilter, searchQuery]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);
      if (visible) {
        fetchVMs(false, { silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchVMs]);

  useInterval(() => {
    fetchVMs(false, { silent: true });
  }, isPageVisible ? VM_POLL_INTERVAL_MS : null);

  const filteredVms = statusFilter === STATUS_FILTER_RUNNING
    ? vms.filter((vm) => vm.status === 'running')
    : vms;

  const searchLower = searchQuery.trim().toLowerCase();
  const searchFilteredVms = searchLower
    ? filteredVms.filter(
        (vm) =>
          (vm.name && vm.name.toLowerCase().includes(searchLower)) ||
          String(vm.vmid).includes(searchQuery.trim()) ||
          (vm.ip && vm.ip.includes(searchQuery.trim())),
      )
    : filteredVms;

  const sortedVms = [...searchFilteredVms].sort((a, b) => {
    const na = (a.name || '').toLowerCase();
    const nb = (b.name || '').toLowerCase();
    if (na !== nb) return na.localeCompare(nb);
    return (a.vmid || 0) - (b.vmid || 0);
  });

  const vmType = (vm) => (vm?.type === 'lxc' ? 'lxc' : 'qemu');

  const handleStart = async (vm) => {
    const key = powerPendingKey(vm);
    try {
      setPowerPending((p) => ({
        ...p,
        [key]: { action: 'start', untilStatus: 'running', deadline: Date.now() + 120000 },
      }));
      await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/start?type=${vmType(vm)}`);
      setSnackbar({ open: true, message: 'Starting…', severity: 'info' });
      await fetchVMs(false, { silent: true });
    } catch (err) {
      setPowerPending((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to start VM', severity: 'error' });
    }
  };

  const handleStop = async (vm) => {
    const key = powerPendingKey(vm);
    try {
      setPowerPending((p) => ({
        ...p,
        [key]: { action: 'stop', untilStatus: 'stopped', deadline: Date.now() + 120000 },
      }));
      await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/stop?type=${vmType(vm)}`);
      setSnackbar({ open: true, message: 'Stopping…', severity: 'info' });
      await fetchVMs(false, { silent: true });
    } catch (err) {
      setPowerPending((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to stop VM', severity: 'error' });
    }
  };

  const handleRestart = async (vm) => {
    const key = powerPendingKey(vm);
    try {
      setPowerPending((p) => ({
        ...p,
        [key]: {
          action: 'restart',
          untilStatus: 'running',
          restartGateMs: Date.now() + 8000,
          deadline: Date.now() + 120000,
        },
      }));
      await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/restart?type=${vmType(vm)}`);
      setSnackbar({ open: true, message: 'Restarting…', severity: 'info' });
      await fetchVMs(false, { silent: true });
    } catch (err) {
      setPowerPending((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to restart VM', severity: 'error' });
    }
  };

  const confirmFlagForDeletion = async () => {
    const vm = flagDeleteDialogVm;
    if (!vm) return;
    try {
      setFlagDeleteSubmitting(true);
      const res = await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/flag-delete?type=${vmType(vm)}`);
      const displayName = vm.name?.trim() || 'This machine';
      const msg = res.data?.already
        ? `${displayName} is already flagged for deletion.`
        : `${displayName} has been flagged for deletion.`;
      setSnackbar({ open: true, message: msg, severity: 'success' });
      setFlagDeleteDialogVm(null);
      setTimeout(() => fetchVMs(false, { silent: true }), 1500);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to flag VM for deletion',
        severity: 'error',
      });
    } finally {
      setFlagDeleteSubmitting(false);
    }
  };

  const handleOpenConsole = (vm) => {
    if (vm.template) return;
    const key = powerPendingKey(vm);
    setConsoleOpeningKey(key);
    setSnackbar({ open: true, message: 'Opening console…', severity: 'info' });

    const win = window.open('about:blank', '_blank');
    if (!win) {
      setSnackbar({ open: true, message: 'Allow pop-ups for this site to open the console', severity: 'warning' });
      setConsoleOpeningKey(null);
      return;
    }
    try {
      win.document.title = 'Console';
      win.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;margin:2rem;color:#888">Opening console…</p>';
    } catch {
      /* ignore */
    }

    (async () => {
      try {
        const typ = vmType(vm);
        const params = new URLSearchParams({ type: typ });
        if (vm.name) params.set('vmname', vm.name);
        const res = await api.get(
          `/api/proxmox/vms/${encodeURIComponent(vm.node)}/${vm.vmid}/console?${params}`,
        );
        const url = res.data?.url;
        if (!url) {
          win.close();
          setSnackbar({ open: true, message: 'No console URL returned', severity: 'error' });
          return;
        }
        win.location.href = url;
      } catch (err) {
        try {
          win.close();
        } catch {
          /* ignore */
        }
        setSnackbar({
          open: true,
          message: err.response?.data?.error || 'Could not open console',
          severity: 'error',
        });
      } finally {
        setConsoleOpeningKey(null);
      }
    })();
  };

  const handleCreateFromTemplate = async () => {
    if (!createConfig.template) {
      setSnackbar({ open: true, message: 'Please select a template', severity: 'warning' });
      return;
    }
    if (!createConfig.operatorUserid) {
      setSnackbar({ open: true, message: 'Please select an operator', severity: 'warning' });
      return;
    }
    if (!namePreview) {
      setSnackbar({
        open: true,
        message: 'Enter a client name to see the VM name preview.',
        severity: 'warning',
      });
      return;
    }
    try {
      setCreateSubmitting(true);
      const response = await api.post('/api/proxmox/vms/create-from-template', {
        templateName: createConfig.template,
        operatorUserid: createConfig.operatorUserid,
        clientName: createConfig.clientName,
      });
      const vmid = response.data?.vmid;
      const name = response.data?.name || namePreview;
      if (vmid != null) {
        provisionCompleteFiredRef.current = false;
        setStatusFilter(STATUS_FILTER_ALL);
        setSearchQuery('');
        setCreateProvisioning({
          vmid: Number(vmid),
          name: String(name || ''),
          deadline: Date.now() + CREATE_PROVISION_TIMEOUT_MS,
        });
      } else {
        setSnackbar({
          open: true,
          message: name ? `Started creating "${name}". Refresh the list in a moment.` : 'Create request sent.',
          severity: 'success',
        });
        setCreateDialogOpen(false);
        setCreateConfig({ template: '', operatorUserid: '', clientName: '' });
        setTimeout(() => fetchVMs(false, { silent: true }), 3000);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to create VM from template',
        severity: 'error',
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', p: { xs: 1, sm: 2, md: 3 }, boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Proxmox VM Management</Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={() => fetchVMs(true)} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCreateProvisioning(null);
              setCreateDialogOpen(true);
            }}
            sx={{ ml: 2 }}
          >
            Create VM
          </Button>
        </Box>
      </Box>

      {loading && vms.length === 0 ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, VMID, or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2, maxWidth: 400 }}
            InputProps={{
              sx: { backgroundColor: 'background.paper' },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Show:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                variant={statusFilter === STATUS_FILTER_ALL ? 'contained' : 'outlined'}
                onClick={() => setStatusFilter(STATUS_FILTER_ALL)}
              >
                All
              </Button>
              <Button
                size="small"
                variant={statusFilter === STATUS_FILTER_RUNNING ? 'contained' : 'outlined'}
                onClick={() => setStatusFilter(STATUS_FILTER_RUNNING)}
              >
                Running only
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
              Virtual machines ({sortedVms.length})
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>VMID</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>Name</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>Status</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>CPU</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>Memory</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>Uptime</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>IP</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedVms.map((vm) => (
                  <TableRow key={`${vm.node}-${vm.vmid}`} hover>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>{vm.vmid}</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>{vm.name || `VM-${vm.vmid}`}</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center', minWidth: 120 }}>
                      {(() => {
                        const pend = powerPending[powerPendingKey(vm)];
                        const label = pend
                          ? pend.action === 'start'
                            ? 'Starting…'
                            : pend.action === 'stop'
                              ? 'Stopping…'
                              : 'Restarting…'
                          : vm.status || 'unknown';
                        const color = pend
                          ? 'warning'
                          : vm.status === 'running'
                            ? 'success'
                            : vm.status === 'stopped'
                              ? 'default'
                              : 'warning';
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, py: 0.5 }}>
                            <Chip label={label} color={color} size="small" />
                            {pend ? (
                              <LinearProgress
                                variant="indeterminate"
                                sx={{ width: '100%', maxWidth: 140, height: 4, borderRadius: 1 }}
                              />
                            ) : null}
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>{(vm.cpu * 100).toFixed(1)}%</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      {formatBytes(vm.mem || 0)} / {formatBytes(vm.maxmem || 0)}
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>{formatUptime(vm.uptime)}</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      {vm.ip ? (
                        <Tooltip title="Click to copy">
                          <Typography
                            component="span"
                            onClick={async () => {
                              const ok = await copyToClipboard(vm.ip);
                              setSnackbar({
                                open: true,
                                message: ok ? `${vm.ip} copied to clipboard` : 'Failed to copy',
                                severity: ok ? 'success' : 'warning',
                              });
                            }}
                            sx={{
                              cursor: 'pointer',
                              display: 'inline',
                              font: 'inherit',
                              fontSize: 'inherit',
                              lineHeight: 'inherit',
                              letterSpacing: 'inherit',
                              '&:hover': { opacity: 0.8 },
                            }}
                          >
                            {vm.ip}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography
                          component="span"
                          color="text.secondary"
                          sx={{ display: 'inline', font: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
                        >
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      <Box component="span" sx={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 0 }}>
                        <Tooltip title="Console (opens Proxmox noVNC in a new tab)">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenConsole(vm)}
                              disabled={
                                !!vm.template ||
                                !!powerPending[powerPendingKey(vm)] ||
                                consoleOpeningKey === powerPendingKey(vm)
                              }
                              color="primary"
                            >
                              <ConsoleIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Start">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleStart(vm)}
                              disabled={vm.status === 'running' || !!powerPending[powerPendingKey(vm)]}
                              color="success"
                            >
                              <PlayIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Restart">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRestart(vm)}
                              disabled={vm.status !== 'running' || !!powerPending[powerPendingKey(vm)]}
                              color="info"
                            >
                              <RestartIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Stop">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleStop(vm)}
                              disabled={vm.status !== 'running' || !!powerPending[powerPendingKey(vm)]}
                              color="warning"
                            >
                              <StopIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Flag for deletion">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setFlagDeleteDialogVm(vm)}
                              disabled={!!vm.template || hasDeletionRequestTag(vm) || !!powerPending[powerPendingKey(vm)]}
                              color="error"
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {sortedVms.length === 0 && !loading && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {searchQuery.trim()
                  ? 'No VMs match your search'
                  : statusFilter === STATUS_FILTER_RUNNING
                    ? 'No running VMs'
                    : 'No VMs found'}
              </Typography>
            </Paper>
          )}
        </>
      )}

      <Dialog open={!!flagDeleteDialogVm} onClose={() => !flagDeleteSubmitting && setFlagDeleteDialogVm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Flag VM for deletion?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This does not remove the machine right away. An administrator will complete the removal.
          </Typography>
          {flagDeleteDialogVm && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              <strong>{flagDeleteDialogVm.name?.trim() || 'This virtual machine'}</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlagDeleteDialogVm(null)} disabled={flagDeleteSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={confirmFlagForDeletion}
            color="error"
            variant="contained"
            disabled={flagDeleteSubmitting}
          >
            {flagDeleteSubmitting ? 'Working…' : 'DELETE'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={createDialogOpen}
        onClose={() => {
          if (createSubmitting) return;
          setCreateDialogOpen(false);
          setCreateProvisioning(null);
          setCreateConfig({ template: '', operatorUserid: '', clientName: '' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {createProvisioning ? 'Creating virtual machine' : 'Create VM from template'}
        </DialogTitle>
        {createSubmitting || createProvisioning ? (
          <LinearProgress variant="indeterminate" />
        ) : null}
        <DialogContent>
          {createProvisioning ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Waiting for <strong>{createProvisioning.name || 'the new VM'}</strong> (VMID{' '}
                <strong>{createProvisioning.vmid}</strong>) to show up in your pool. This usually takes under a
                minute while Proxmox finishes the clone.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                This dialog closes when the VM appears in the list with its final name. You can leave it open or
                dismiss anytime.
              </Typography>
              {createProvisioning.timedOut ? (
                <Alert severity="info">
                  Taking longer than usual. Refresh the page or check Proxmox; we&apos;ll keep checking in the
                  background until it shows up or you dismiss.
                </Alert>
              ) : null}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Template</InputLabel>
                <Select
                  value={createConfig.template}
                  onChange={(e) => setCreateConfig({ ...createConfig, template: e.target.value })}
                  label="Template"
                  disabled={createSubmitting}
                >
                  {TEMPLATE_OPTIONS.map((t) => (
                    <MenuItem key={t.name} value={t.name}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required disabled={operatorsLoading || createSubmitting}>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={createConfig.operatorUserid}
                  onChange={(e) => setCreateConfig({ ...createConfig, operatorUserid: e.target.value })}
                  label="Operator"
                >
                  {operators.map((op) => (
                    <MenuItem key={op.userid} value={op.userid}>
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {operatorsLoading ? (
                <Typography variant="caption" color="text.secondary">
                  Loading operators from Proxmox…
                </Typography>
              ) : null}
              {operatorsError ? (
                <Alert severity="warning">{operatorsError}</Alert>
              ) : null}

              <TextField
                fullWidth
                required
                label="Client name"
                value={createConfig.clientName}
                onChange={(e) => setCreateConfig({ ...createConfig, clientName: e.target.value })}
                placeholder="e.g. Old Glory Bank"
                disabled={createSubmitting}
              />
              {createConfig.operatorUserid && createConfig.clientName.trim() ? (
                <Typography variant="caption" color="text.secondary" display="block">
                  VM name:{' '}
                  <strong>
                    {namePreviewLoading ? '…' : namePreview || '—'}
                  </strong>
                </Typography>
              ) : null}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {createProvisioning ? (
            <Button
              onClick={() => {
                setCreateProvisioning(null);
                setCreateDialogOpen(false);
                setCreateConfig({ template: '', operatorUserid: '', clientName: '' });
                fetchVMs(false, { silent: true });
              }}
            >
              Dismiss
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setCreateDialogOpen(false);
                  setCreateConfig({ template: '', operatorUserid: '', clientName: '' });
                }}
                disabled={createSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFromTemplate}
                variant="contained"
                disabled={
                  !createConfig.template ||
                  !createConfig.operatorUserid ||
                  !namePreview ||
                  namePreviewLoading ||
                  createSubmitting ||
                  operatorsLoading
                }
              >
                {createSubmitting ? 'Creating…' : 'Create VM'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Proxmox;
