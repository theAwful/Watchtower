import { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
  Computer as VNCIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import api from '../../models/ApiModel';
import { useInterval } from '../../controllers/useInterval';
import { copyToClipboard } from '../../utils/clipboardUtils';

const STATUS_FILTER_ALL = 'all';
const STATUS_FILTER_RUNNING = 'running';
const VM_POLL_INTERVAL_MS = 30000;

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
    name: '',
  });
  const [vmTemplates, setVmTemplates] = useState([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(typeof document !== 'undefined' ? document.visibilityState === 'visible' : true);

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

  const fetchVMs = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get('/api/proxmox/vms');
      setVms(response.data.vms || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching VMs:', err);
      setError(err.response?.data?.error || 'Failed to fetch VMs');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const tplRes = await api.get('/api/proxmox/templates');
      setVmTemplates(tplRes.data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setVmTemplates([]);
    }
  };

  useEffect(() => {
    fetchVMs(true);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);
      if (visible) {
        fetchVMs();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useInterval(() => {
    fetchVMs();
  }, isPageVisible ? VM_POLL_INTERVAL_MS : null);

  useEffect(() => {
    if (createDialogOpen) {
      fetchTemplates();
    }
  }, [createDialogOpen]);

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
    try {
      await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/start?type=${vmType(vm)}`);
      setSnackbar({ open: true, message: `Starting VM ${vm.name}...`, severity: 'success' });
      setTimeout(() => fetchVMs(), 1000);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to start VM', severity: 'error' });
    }
  };

  const handleStop = async (vm) => {
    try {
      await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/stop?type=${vmType(vm)}`);
      setSnackbar({ open: true, message: `Stopping VM ${vm.name}...`, severity: 'success' });
      setTimeout(() => fetchVMs(), 1000);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to stop VM', severity: 'error' });
    }
  };

  const handleRestart = async (vm) => {
    try {
      await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/restart?type=${vmType(vm)}`);
      setSnackbar({ open: true, message: `Restarting VM ${vm.name}...`, severity: 'success' });
      setTimeout(() => fetchVMs(), 2000);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to restart VM', severity: 'error' });
    }
  };

  const handleVNC = async (vm) => {
    try {
      const type = vmType(vm);
      const vmname = (vm.name && typeof vm.name === 'string') ? encodeURIComponent(vm.name) : '';
      const apiUrl = `/api/proxmox/vms/${vm.node}/${vm.vmid}/console?type=${type}${vmname ? `&vmname=${vmname}` : ''}`;
      const response = await api.get(apiUrl);
      const consoleUrl = response.data?.url;
      if (consoleUrl) {
        window.open(consoleUrl, '_blank', 'noopener,noreferrer');
        setSnackbar({ open: true, message: 'Console opened in new tab. Log into Proxmox in this browser first if it doesn’t load.', severity: 'info' });
      } else {
        setSnackbar({ open: true, message: 'No console URL returned', severity: 'warning' });
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to get console URL';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const getVmName = (baseName) => (baseName || '').trim() || 'VM';

  const handleCreateFromTemplate = async () => {
    if (!createConfig.template) {
      setSnackbar({ open: true, message: 'Please select a template', severity: 'warning' });
      return;
    }
    const [templateNode, templateVmid] = createConfig.template.split('/');
    if (!templateNode || !templateVmid) {
      setSnackbar({ open: true, message: 'Invalid template selection', severity: 'error' });
      return;
    }
    const vmName = getVmName(createConfig.name);
    try {
      setCreateSubmitting(true);
      const response = await api.post('/api/proxmox/vms/create-from-template', {
        templateNode,
        templateVmid: parseInt(templateVmid, 10),
        name: vmName,
      });
      const { name, node, vmid } = response.data;
      setSnackbar({
        open: true,
        message: `VM creation started: "${name || vmid}" on ${node}. It may take a minute—refresh the list.`,
        severity: 'success',
      });
      setCreateDialogOpen(false);
      setCreateConfig({ template: '', name: '' });
      setTimeout(() => fetchVMs(), 3000);
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
            onClick={() => setCreateDialogOpen(true)}
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
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      <Chip
                        label={vm.status || 'unknown'}
                        color={vm.status === 'running' ? 'success' : vm.status === 'stopped' ? 'default' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>{(vm.cpu * 100).toFixed(1)}%</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      {formatBytes(vm.mem || 0)} / {formatBytes(vm.maxmem || 0)}
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>{formatUptime(vm.uptime)}</TableCell>
                    <TableCell align="center" sx={{ fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'center' }}>
                      {vm.ip ? (
                        <Tooltip title="Click to copy">
                          <Box
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
                              '&:hover': { opacity: 0.8 },
                            }}
                          >
                            {vm.ip}
                          </Box>
                        </Tooltip>
                      ) : (
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          —
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center' }}>
                      <Box component="span" sx={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 0 }}>
                        <Tooltip title="Start">
                          <IconButton
                            size="small"
                            onClick={() => handleStart(vm)}
                            disabled={vm.status === 'running'}
                            color="success"
                          >
                            <PlayIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Restart">
                          <IconButton
                            size="small"
                            onClick={() => handleRestart(vm)}
                            disabled={vm.status !== 'running'}
                            color="info"
                          >
                            <RestartIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Stop">
                          <IconButton
                            size="small"
                            onClick={() => handleStop(vm)}
                            disabled={vm.status !== 'running'}
                            color="warning"
                          >
                            <StopIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="VNC Console">
                          <IconButton
                            size="small"
                            onClick={() => handleVNC(vm)}
                            disabled={vm.status !== 'running'}
                            color="primary"
                          >
                            <VNCIcon />
                          </IconButton>
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

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create VM from template</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Template</InputLabel>
              <Select
                value={createConfig.template}
                onChange={(e) => setCreateConfig({ ...createConfig, template: e.target.value })}
                label="Template"
              >
                {vmTemplates.map((t) => (
                  <MenuItem key={`${t.node}/${t.vmid}`} value={`${t.node}/${t.vmid}`}>
                    {t.vmid} — {t.name || `Template ${t.vmid}`}
                  </MenuItem>
                ))}
                {vmTemplates.length === 0 && (
                  <MenuItem disabled>No templates found (e.g. tmpl-Kali, tmpl-Win11)</MenuItem>
                )}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Name"
              value={createConfig.name}
              onChange={(e) => setCreateConfig({ ...createConfig, name: e.target.value })}
              placeholder="e.g. Kali-Hedy"
            />
            {createConfig.name?.trim() && (
              <Typography variant="caption" color="text.secondary">
                VM will be named: <strong>{getVmName(createConfig.name)}</strong>
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              New VMs are added to the operators pool.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateFromTemplate}
            variant="contained"
            disabled={!createConfig.template || createSubmitting}
          >
            {createSubmitting ? 'Creating…' : 'Create VM'}
          </Button>
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
