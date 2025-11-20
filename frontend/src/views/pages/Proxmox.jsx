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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Snackbar,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Computer as VNCIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import api from '../../models/ApiModel';
import { useInterval } from '../../controllers/useInterval';

const Proxmox = () => {
  const [vms, setVms] = useState([]);
  const [pools, setPools] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vmToDelete, setVmToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deployConfig, setDeployConfig] = useState({
    node: '',
    vmid: '',
    name: '',
    pool: '',
    installType: 'none',
    iso: '',
    template: '',
    cloneFrom: '',
    cloneType: 'linked',
  });
  const [isos, setIsos] = useState([]);
  const [templates, setTemplates] = useState([]);

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

  // Fetch pools
  const fetchPools = async () => {
    try {
      const response = await api.get('/api/proxmox/pools');
      setPools(response.data.pools || []);
    } catch (err) {
      console.error('Error fetching pools:', err);
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

  // Fetch ISOs and templates for a node
  const fetchISOsAndTemplates = async (node) => {
    if (!node) {
      setIsos([]);
      setTemplates([]);
      return;
    }
    try {
      const response = await api.get(`/api/proxmox/nodes/${node}/isos-templates`);
      setIsos(response.data.isos || []);
      setTemplates(response.data.templates || []);
    } catch (err) {
      console.error('Error fetching ISOs and templates:', err);
      setIsos([]);
      setTemplates([]);
    }
  };

  // Initial load
  useEffect(() => {
    fetchVMs(true);
    fetchPools();
    fetchNodes();
  }, []);

  // Auto-refresh every 10 seconds
  useInterval(() => {
    fetchVMs();
  }, 10000);

  // When deploy dialog opens, fetch ISOs/templates if node is selected
  useEffect(() => {
    if (deployDialogOpen && deployConfig.node) {
      fetchISOsAndTemplates(deployConfig.node);
      // Also fetch VMs for cloning
      if (deployConfig.installType === 'clone') {
        fetchVMs();
      }
    }
  }, [deployDialogOpen, deployConfig.node, deployConfig.installType]);

  // Group VMs by pool
  const groupedVMs = () => {
    const grouped = {};
    const unassigned = [];

    vms.forEach((vm) => {
      const poolId = vm.pool || 'unassigned';
      if (poolId === 'unassigned' || !poolId) {
        unassigned.push(vm);
      } else {
        if (!grouped[poolId]) {
          grouped[poolId] = [];
        }
        grouped[poolId].push(vm);
      }
    });

    return { grouped, unassigned };
  };

  // VM Actions
  const handleStart = async (vm) => {
    try {
      await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/start?type=${vm.type}`);
      setSnackbar({ open: true, message: `Starting VM ${vm.name}...`, severity: 'success' });
      setTimeout(() => fetchVMs(), 1000);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to start VM', severity: 'error' });
    }
  };

  const handleStop = async (vm) => {
    try {
      await api.post(`/api/proxmox/vms/${vm.node}/${vm.vmid}/stop?type=${vm.type}`);
      setSnackbar({ open: true, message: `Stopping VM ${vm.name}...`, severity: 'success' });
      setTimeout(() => fetchVMs(), 1000);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to stop VM', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!vmToDelete) return;
    try {
      await api.delete(`/api/proxmox/vms/${vmToDelete.node}/${vmToDelete.vmid}?type=${vmToDelete.type}`);
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
      const response = await api.get(`/api/proxmox/vms/${vm.node}/${vm.vmid}/vnc?type=${vm.type}`);
      if (response.data.url) {
        window.open(response.data.url, '_blank');
        setSnackbar({ open: true, message: 'Opening VNC console...', severity: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to get VNC console', severity: 'error' });
    }
  };

  const handlePoolChange = async (vm, newPoolId) => {
    try {
      await api.put(`/api/proxmox/vms/${vm.node}/${vm.vmid}/pool`, {
        type: vm.type,
        poolid: newPoolId === 'unassigned' ? null : newPoolId,
      });
      setSnackbar({ open: true, message: `VM moved to ${newPoolId === 'unassigned' ? 'Unassigned' : newPoolId}`, severity: 'success' });
      setTimeout(() => {
        fetchVMs();
        fetchPools();
      }, 1000);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to change pool', severity: 'error' });
    }
  };

  // Deploy VM
  const handleDeploy = async () => {
    try {
      const config = {
        name: deployConfig.name,
        pool: deployConfig.pool === 'unassigned' ? null : deployConfig.pool,
        type: 'qemu',
      };

      if (deployConfig.installType === 'iso' && deployConfig.iso) {
        config.iso = deployConfig.iso;
      } else if (deployConfig.installType === 'clone' && deployConfig.cloneFrom) {
        const sourceVM = vms.find(v => `${v.node}/${v.vmid}` === deployConfig.cloneFrom);
        if (sourceVM) {
          config.cloneFrom = deployConfig.cloneFrom.split('/')[1];
          config.full = deployConfig.cloneType === 'full';
        }
      }

      await api.post('/api/proxmox/vms/deploy', {
        node: deployConfig.node,
        vmid: parseInt(deployConfig.vmid),
        config,
      });

      setSnackbar({ open: true, message: 'VM deployment started', severity: 'success' });
      setDeployDialogOpen(false);
      setDeployConfig({
        node: '',
        vmid: '',
        name: '',
        pool: '',
        installType: 'none',
        iso: '',
        template: '',
        cloneFrom: '',
        cloneType: 'linked',
      });
      setTimeout(() => fetchVMs(), 2000);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to deploy VM', severity: 'error' });
    }
  };

  // Render VM table
  const renderVMTable = (vmList, poolName) => (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
        {poolName} ({vmList.length} VMs)
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>VMID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Node</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>CPU</TableCell>
            <TableCell>Memory</TableCell>
            <TableCell>Uptime</TableCell>
            <TableCell>Pool</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vmList.map((vm) => (
            <TableRow key={`${vm.node}-${vm.vmid}`} hover>
              <TableCell>{vm.vmid}</TableCell>
              <TableCell>{vm.name || `VM-${vm.vmid}`}</TableCell>
              <TableCell>{vm.node}</TableCell>
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
              <TableCell>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={vm.pool || 'unassigned'}
                    onChange={(e) => handlePoolChange(vm, e.target.value)}
                  >
                    <MenuItem value="unassigned">Unassigned</MenuItem>
                    {pools.map((pool) => (
                      <MenuItem key={pool.poolid} value={pool.poolid}>
                        {pool.poolid}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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

  const { grouped, unassigned } = groupedVMs();

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
              setDeployDialogOpen(true);
              fetchNodes();
              fetchPools();
            }}
            sx={{ ml: 2 }}
          >
            Deploy New VM
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

          {/* Render VMs grouped by pool */}
          {Object.keys(grouped).map((poolId) => {
            const pool = pools.find((p) => p.poolid === poolId);
            return renderVMTable(grouped[poolId], pool ? pool.poolid : poolId);
          })}

          {/* Unassigned VMs */}
          {unassigned.length > 0 && renderVMTable(unassigned, 'Unassigned VMs')}

          {vms.length === 0 && !loading && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No VMs found
              </Typography>
            </Paper>
          )}
        </>
      )}

      {/* Deploy VM Dialog */}
      <Dialog open={deployDialogOpen} onClose={() => setDeployDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Deploy New VM</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Node</InputLabel>
              <Select
                value={deployConfig.node}
                onChange={(e) => {
                  setDeployConfig({ ...deployConfig, node: e.target.value });
                  fetchISOsAndTemplates(e.target.value);
                }}
                label="Node"
              >
                {nodes.map((node) => (
                  <MenuItem key={node.node} value={node.node}>
                    {node.node}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="VMID"
              value={deployConfig.vmid}
              onChange={(e) => setDeployConfig({ ...deployConfig, vmid: e.target.value })}
              type="number"
              required
            />

            <TextField
              fullWidth
              label="Name"
              value={deployConfig.name}
              onChange={(e) => setDeployConfig({ ...deployConfig, name: e.target.value })}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Pool (Optional)</InputLabel>
              <Select
                value={deployConfig.pool}
                onChange={(e) => setDeployConfig({ ...deployConfig, pool: e.target.value })}
                label="Pool (Optional)"
              >
                <MenuItem value="unassigned">Unassigned</MenuItem>
                {pools.map((pool) => (
                  <MenuItem key={pool.poolid} value={pool.poolid}>
                    {pool.poolid}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl component="fieldset">
              <FormLabel component="legend">Installation Type</FormLabel>
              <RadioGroup
                value={deployConfig.installType}
                onChange={(e) => setDeployConfig({ ...deployConfig, installType: e.target.value })}
              >
                <FormControlLabel value="none" control={<Radio />} label="None" />
                <FormControlLabel value="iso" control={<Radio />} label="ISO Image" />
                <FormControlLabel value="clone" control={<Radio />} label="Clone Existing VM" />
              </RadioGroup>
            </FormControl>

            {deployConfig.installType === 'iso' && (
              <FormControl fullWidth>
                <InputLabel>ISO Image</InputLabel>
                <Select
                  value={deployConfig.iso}
                  onChange={(e) => setDeployConfig({ ...deployConfig, iso: e.target.value })}
                  label="ISO Image"
                >
                  {isos.map((iso) => (
                    <MenuItem key={iso.volid} value={iso.volid}>
                      {iso.volid}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {deployConfig.installType === 'clone' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Source VM</InputLabel>
                  <Select
                    value={deployConfig.cloneFrom}
                    onChange={(e) => setDeployConfig({ ...deployConfig, cloneFrom: e.target.value })}
                    label="Source VM"
                  >
                    {vms
                      .filter((vm) => vm.node === deployConfig.node)
                      .map((vm) => (
                        <MenuItem key={`${vm.node}/${vm.vmid}`} value={`${vm.node}/${vm.vmid}`}>
                          {vm.name || `VM-${vm.vmid}`} ({vm.vmid})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <FormControl component="fieldset">
                  <FormLabel component="legend">Clone Type</FormLabel>
                  <RadioGroup
                    value={deployConfig.cloneType}
                    onChange={(e) => setDeployConfig({ ...deployConfig, cloneType: e.target.value })}
                  >
                    <FormControlLabel value="linked" control={<Radio />} label="Linked Clone (Faster)" />
                    <FormControlLabel value="full" control={<Radio />} label="Full Clone (Independent)" />
                  </RadioGroup>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeployDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeploy}
            variant="contained"
            disabled={!deployConfig.node || !deployConfig.vmid || !deployConfig.name}
          >
            Deploy
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
