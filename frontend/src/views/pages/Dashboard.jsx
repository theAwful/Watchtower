import { useState, useEffect, useRef } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  CircularProgress,
  Alert 
} from '@mui/material';
import DeviceTable from '../components/DeviceTable';
import api from '../../models/ApiModel';
import { useInterval } from '../../controllers/useInterval';

const Dashboard = () => {
  // State for devices (includes both online and recently offline)
  const [devices, setDevices] = useState([]);
  // Track previously seen devices to detect disconnections (use ref to persist across renders)
  const previousDevicesRef = useRef(new Map());
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch devices from OpenVPN
  const fetchDevices = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await api.get('/api/devices');
      
      // The API returns an object with a devices property
      // OpenVPN status only shows currently connected devices
      const currentDevicesData = response.data.devices || [];
      
      // Create a map of current device IDs (use hostname as primary identifier since it's most stable)
      const currentDeviceMap = new Map();
      currentDevicesData.forEach((device) => {
        // Use hostname as the key since it's the most stable identifier
        const deviceKey = device.hostname || device.id;
        currentDeviceMap.set(deviceKey, { 
          ...device, 
          online: true,
          id: deviceKey, // Ensure ID is consistent
        });
      });
      
      // Get previous devices from ref
      const previousDevices = previousDevicesRef.current;
      
      // Merge with previous devices - mark missing ones as offline
      const allDevices = new Map();
      
      // First, add all current (online) devices
      currentDeviceMap.forEach((device, key) => {
        allDevices.set(key, device);
      });
      
      // Then, check previous devices - if not in current list, mark as offline
      previousDevices.forEach((device, key) => {
        if (!currentDeviceMap.has(key)) {
          // Device was previously connected but is now offline
          // Keep it in the list but mark as offline, update lastSeen
          allDevices.set(key, {
            ...device,
            online: false,
            lastSeen: new Date().toISOString(),
          });
        }
      });
      
      // Convert map to array and sort: online first, then by name
      const devicesArray = Array.from(allDevices.values()).sort((a, b) => {
        if (a.online !== b.online) {
          return a.online ? -1 : 1; // Online devices first
        }
        return a.hostname.localeCompare(b.hostname);
      });
      
      setDevices(devicesArray);
      // Update the ref with all devices (both online and offline)
      previousDevicesRef.current = allDevices;
      setError(false);
    } catch (err) {
      console.error('Error fetching devices:', err);
      // Set error but keep showing previous devices (don't clear them)
      setError(true);
      // Don't clear devices on error - keep showing what we have
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchDevices(true);
  }, []);

  // Set up automatic refresh every 5 seconds
  useInterval(() => {
    fetchDevices();
  }, 5000);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', p: { xs: 1, sm: 2, md: 3 }, boxSizing: 'border-box' }}>
      <Typography variant="h4" gutterBottom>
        Connected Devices
      </Typography>

      <Box sx={{ width: '100%' }}>
        <Paper elevation={2} sx={{ p: 2, mb: 3, width: '100%', boxSizing: 'border-box' }}>
            <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #eee', pb: 1 }}>
              Devices ({devices.filter(d => d.online).length} online, {devices.filter(d => !d.online).length} offline)
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {error && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Unable to connect to backend server. Make sure the backend is running on port 8080.
                  </Alert>
                )}
                <DeviceTable 
                  devices={devices}
                  onRefresh={() => fetchDevices(true)}
                />
              </>
            )}
          </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;

