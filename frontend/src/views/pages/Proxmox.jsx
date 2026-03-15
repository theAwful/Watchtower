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
  Delete as DeleteIcon,
  Computer as VNCIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import api from '../../models/ApiModel';
import { useInterval } from '../../controllers/useInterval';
import { copyToClipboard } from '../../utils/clipboardUtils';

const STATUS_FILTER_ALL = 'all';
const STATUS_FILTER_RUNNING = 'running';

const Proxmox = () => {
  const [vms, setVms] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_RUNNING); // default: running only
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vmToDelete, setVmToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createConfig, setCreateConfig] = useState({
    template: '',
    name: '',
  });
  const [vmTemplates, setVmTemplates] = useState([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Fetch VMs
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

  // Fetch nodes
  const fetchNodes = async () => {
    try {
      const response = await api.get('/api/proxmox/nodes');
      setNodes(response.data.nodes || []);
    } catch (err) {
      console.error('Error fetching nodes:', err);
    }
  };

  // Fetch QEMU VM templates (tmpl-Kali, tmpl-Win11, etc.) for Create VM dialog
  const fetchTemplates = async () => {
    try {
      const tplRes = await api.get('/api/proxmox/templates');
      setVmTemplates(tplRes.data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setVmTemplates([]);
    }
  };

  // Initial load
  useEffect(() => {
    fetchVMs(true);
    fetchNodes();
  }, []);

  // Auto-refresh every 10 seconds
  useInterval(() => {
    fetchVMs();
  }, 10000);

  // When Create VM dialog opens, fetch templates
  useEffect(() => {
    if (createDialogOpen) {
      fetchTemplates();
    }
  }, [createDialogOpen]);

  // Filter VMs by status then group by node
  const filteredVms = statusFilter === STATUS_FILTER_RUNNING
    ? vms.filter((vm) => vm.status === 'running')
    : vms;

  const searchLower = searchQuery.trim().toLowerCase();
  const searchFilteredVms = searchLower
    ? filteredVms.filter(
        (vm) =>
          (vm.name && vm.name.toLowerCase().includes(searchLower)) ||
          String(vm.vmid).includes(searchQuery.trim()) ||
          (vm.node && vm.node.toLowerCase().includes(searchLower)) ||
          (vm.ip && vm.ip.includes(searchQuery.trim()))
      )
    : filteredVms;

  const vmsByNode = () => {
    const byNode = {};
    searchFilteredVms.forEach((vm) => {
      const n = vm.node || 'unknown';
      if (!byNode[n]) byNode[n] = [];
      byNode[n].push(vm);
    });
    return byNode;
  };

  const vmType = (vm) => (vm?.type === 'lxc' ? 'lxc' : 'qemu');

  // VM Actions
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

  const handleDelete = async () => {
    if (!vmToDelete) return;
    try {
      await api.delete(`/api/proxmox/vms/${vmToDelete.node}/${vmToDelete.vmid}?type=${vmType(vmToDelete)}`);
      setSnackbar({ open: true, message: `VM ${vmToDelete.name} deleted`, severity: 'success' });
      setDeleteDialogOpen(false);
      setVmToDelete(null);
      setTimeout(() => fetchVMs(), 1000);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete VM', severity: 'error' });
    }
  };

  const handleVNC = async (vm) => {
    try {
      const response = await api.get(`/api/proxmox/vms/${vm.node}/${vm.vmid}/vnc?type=${vmType(vm)}`);
      if (response.data.url) {
        window.open(response.data.url, '_blank');
        setSnackbar({ open: true, message: 'Opening VNC console...', severity: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to get VNC console', severity: 'error' });
    }
  };

  // VM name for clone: use base name only (Proxmox requires valid DNS-style name; date suffix was rejected)
  const getVmName = (baseName) => (baseName || '').trim() || 'VM';

  // Create VM from template (clone on pve-node0; task runs on backend)
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

  // Render VM table for a single node
  const renderVMTable = (vmList, nodeName) => (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
        {nodeName} ({vmList.length} VMs)
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>VMID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>CPU</TableCell>
            <TableCell>Memory</TableCell>
            <TableCell>Uptime</TableCell>
            <TableCell>IP</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vmList.map((vm) => (
            <TableRow key={`${vm.node}-${vm.vmid}`} hover>
              <TableCell>{vm.vmid}</TableCell>
              <TableCell>{vm.name || `VM-${vm.vmid}`}</TableCell>
              <TableCell>
                <Chip
                  label={vm.status || 'unknown'}
                  color={vm.status === 'running' ? 'success' : vm.status === 'stopped' ? 'default' : 'warning'}
                  size="small"
                />
              </TableCell>
              <TableCell>{(vm.cpu * 100).toFixed(1)}%</TableCell>
              <TableCell>
                {formatBytes(vm.mem || 0)} / {formatBytes(vm.maxmem || 0)}
              </TableCell>
              <TableCell>{formatUptime(vm.uptime)}</TableCell>
              <TableCell sx={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
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
              <TableCell align="right">
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
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setVmToDelete(vm);
                      setDeleteDialogOpen(true);
                    }}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const byNode = vmsByNode();
  const nodeNames = Object.keys(byNode).sort();

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

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, VMID, node, or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2, maxWidth: 400 }}
            InputProps={{
              sx: { backgroundColor: 'background.paper' },
            }}
          />

          {/* Status filter: All vs Running */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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

          {/* VMs grouped by node */}
          {nodeNames.map((nodeName) => renderVMTable(byNode[nodeName], nodeName))}

          {searchFilteredVms.length === 0 && !loading && (
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

      {/* Create VM from template dialog — node is chosen by load balancing */}
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
              The VM will be placed on the node with the most free resources (load-balanced).
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete VM</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{vmToDelete?.name || `VM-${vmToDelete?.vmid}`}</strong>? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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
