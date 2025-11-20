import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Computer as ComputerIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { timeAgo } from '../../utils/dateUtils';
import { copyToClipboard } from '../../utils/clipboardUtils';

// Editable device row component
const DeviceRow = ({
  device,
  getClientName,
  getNotes,
  handleClientNameChange,
  handleNotesChange,
  handleRDP,
  handleCopyToClipboard,
  formatBytes,
}) => {
  const [editingClient, setEditingClient] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [clientNameValue, setClientNameValue] = useState(getClientName(device));
  const [notesValue, setNotesValue] = useState(getNotes(device));
  
  // Update local state when device changes
  useEffect(() => {
    setClientNameValue(getClientName(device));
    setNotesValue(getNotes(device));
  }, [device.id]);
  
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2">{device.hostname}</Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" color={device.online ? 'inherit' : 'text.secondary'}>
            {device.virtualAddress || '-'}
          </Typography>
          {device.virtualAddress && (
            <Tooltip title={`Copy ${device.virtualAddress}`}>
              <IconButton 
                size="small" 
                onClick={() => handleCopyToClipboard(device.virtualAddress, 'IP Address')}
                sx={{ ml: 1 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell>
        {editingClient ? (
          <TextField
            size="small"
            value={clientNameValue}
            onChange={(e) => setClientNameValue(e.target.value)}
            onBlur={() => {
              handleClientNameChange(device, clientNameValue);
              setEditingClient(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleClientNameChange(device, clientNameValue);
                setEditingClient(false);
              } else if (e.key === 'Escape') {
                setClientNameValue(getClientName(device));
                setEditingClient(false);
              }
            }}
            autoFocus
            sx={{ width: '150px' }}
            variant="outlined"
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" sx={{ minWidth: '100px' }}>
              {getClientName(device)}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setEditingClient(true)}
              sx={{ p: 0.5 }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </TableCell>
      <TableCell>
        {device.online ? (
          timeAgo(device.connectedSince)
        ) : (
          <Typography variant="body2" color="text.secondary">
            Disconnected {timeAgo(device.lastSeen)}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body2" color={device.online ? 'inherit' : 'text.secondary'}>
          {device.online ? formatBytes(device.bytesReceived) : formatBytes(device.bytesReceived || '0')}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color={device.online ? 'inherit' : 'text.secondary'}>
          {device.online ? formatBytes(device.bytesSent) : formatBytes(device.bytesSent || '0')}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip 
          color={device.online ? "success" : "error"} 
          size="small" 
          label={device.online ? "Online" : "Offline"} 
        />
      </TableCell>
      <TableCell>
        {editingNotes ? (
          <TextField
            size="small"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={() => {
              handleNotesChange(device, notesValue);
              setEditingNotes(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleNotesChange(device, notesValue);
                setEditingNotes(false);
              } else if (e.key === 'Escape') {
                setNotesValue(getNotes(device));
                setEditingNotes(false);
              }
            }}
            autoFocus
            multiline
            rows={2}
            sx={{ width: '200px' }}
            variant="outlined"
            placeholder="Add notes..."
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: '200px' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: notesValue ? 'inherit' : 'text.secondary'
              }}
            >
              {getNotes(device) || 'Click to add notes...'}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setEditingNotes(true)}
              sx={{ p: 0.5 }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {device.online && device.virtualAddress && (
            <Tooltip title="Connect via RDP">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleRDP(device)}
              >
                <ComputerIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
};

const DeviceTable = ({ 
  devices,
  onRefresh = async () => {}
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [copySnackbar, setCopySnackbar] = useState({
    open: false,
    message: ''
  });
  
  // Store client names and notes in state (persisted to localStorage)
  const [deviceMetadata, setDeviceMetadata] = useState(new Map());
  
  // Load metadata from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('device-metadata');
      if (stored) {
        const parsed = JSON.parse(stored);
        setDeviceMetadata(new Map(Object.entries(parsed)));
      }
    } catch (err) {
      console.error('Error loading device metadata:', err);
    }
  }, []);
  
  // Save metadata to localStorage whenever it changes
  const saveMetadata = (deviceId, clientName, notes) => {
    const newMetadata = new Map(deviceMetadata);
    newMetadata.set(deviceId, { clientName, notes });
    setDeviceMetadata(newMetadata);
    
    // Persist to localStorage
    try {
      const obj = Object.fromEntries(newMetadata);
      localStorage.setItem('device-metadata', JSON.stringify(obj));
    } catch (err) {
      console.error('Error saving device metadata:', err);
    }
  };
  
  // Get client name for a device (from metadata or default to hostname)
  const getClientName = (device) => {
    const metadata = deviceMetadata.get(device.id);
    return metadata?.clientName || device.hostname || device.name || '';
  };
  
  // Get notes for a device
  const getNotes = (device) => {
    const metadata = deviceMetadata.get(device.id);
    return metadata?.notes || '';
  };
  
  // Handle client name change
  const handleClientNameChange = (device, newName) => {
    const currentNotes = getNotes(device);
    saveMetadata(device.id, newName, currentNotes);
  };
  
  // Handle notes change
  const handleNotesChange = (device, newNotes) => {
    const currentClientName = getClientName(device);
    saveMetadata(device.id, currentClientName, newNotes);
  };
  
  // Handle RDP connection
  const handleRDP = (device) => {
    if (!device.virtualAddress || !device.online) {
      setCopySnackbar({
        open: true,
        message: 'Cannot connect via RDP: Device is offline or has no IP address'
      });
      return;
    }
    
    // Create RDP connection string
    const rdpUrl = `rdp://full%20address=s:${device.virtualAddress}:3389`;
    
    // Try to open RDP connection
    window.location.href = rdpUrl;
    
    // Fallback: Copy RDP connection info to clipboard
    const rdpInfo = `mstsc /v:${device.virtualAddress}`;
    copyToClipboard(rdpInfo);
    setCopySnackbar({
      open: true,
      message: `RDP connection info copied. IP: ${device.virtualAddress}`
    });
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleCopyToClipboard = async (text, label) => {
    const success = await copyToClipboard(text);
    setCopySnackbar({
      open: success,
      message: success ? `${label} copied to clipboard` : 'Failed to copy to clipboard'
    });
  };

  const formatBytes = (bytes) => {
    const numBytes = parseInt(bytes) || 0;
    if (numBytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return Math.round(numBytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredDevices = devices.filter(device => {
    const clientName = getClientName(device).toLowerCase();
    const notes = getNotes(device).toLowerCase();
    return (
      device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.virtualAddress && device.virtualAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
      clientName.includes(searchTerm.toLowerCase()) ||
      notes.includes(searchTerm.toLowerCase())
    );
  });

  // Apply pagination
  const paginatedDevices = filteredDevices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <Paper sx={{ width: '100%', maxWidth: '100%', mb: 2, overflow: 'hidden', boxSizing: 'border-box' }}>
        <Box sx={{ p: 2, width: '100%', boxSizing: 'border-box' }}>
          <TextField
            fullWidth
            label="Search devices"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            sx={{ mb: 2, width: '100%' }}
          />
        </Box>
        <TableContainer sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
          <Table 
            sx={{ width: '100%', tableLayout: 'auto', minWidth: 500 }} 
            aria-label="device table" 
            size="small"
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>IP Address</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Connected Since</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Data Received</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Data Sent</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDevices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  getClientName={getClientName}
                  getNotes={getNotes}
                  handleClientNameChange={handleClientNameChange}
                  handleNotesChange={handleNotesChange}
                  handleRDP={handleRDP}
                  handleCopyToClipboard={handleCopyToClipboard}
                  formatBytes={formatBytes}
                />
              ))}
              {paginatedDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {devices.length === 0 
                        ? 'No devices currently connected' 
                        : 'No devices match your search'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredDevices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <Snackbar
        open={copySnackbar.open}
        autoHideDuration={3000}
        onClose={() => setCopySnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopySnackbar({ open: false, message: '' })} severity="success" sx={{ width: '100%' }}>
          {copySnackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DeviceTable;

