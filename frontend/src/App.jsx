import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import Proxmox from './views/pages/Proxmox';
import VncViewer from './views/pages/VncViewer';
import AppLayout from './views/components/AppLayout';
import Login from './views/pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Cookies from 'js-cookie';

// Create theme options
const getThemeOptions = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
          background: {
            default: '#f5f5f5',
            paper: '#ffffff',
          },
        }
      : {
          // Dark mode - OLED friendly with red highlights
          primary: {
            main: '#ff1744', // Red highlight color
            dark: '#d50000',
            light: '#ff4569',
          },
          secondary: {
            main: '#f50057',
          },
          error: {
            main: '#f44336',
          },
          warning: {
            main: '#ff9800',
          },
          info: {
            main: '#29b6f6',
          },
          success: {
            main: '#4caf50',
          },
          background: {
            default: '#000000', // True black for OLED
            paper: '#121212', // Nearly black for cards/containers
          },
          text: {
            primary: '#ffffff',
            secondary: '#b0b0b0',
          },
        }),
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          ...(mode === 'dark' && {
            backgroundImage: 'none',
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
          }),
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          ...(mode === 'dark' && {
            backgroundColor: '#121212',
          }),
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': {
            backgroundColor: mode === 'dark' ? 'rgba(255, 23, 68, 0.08)' : undefined,
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          ...(mode === 'dark' && {
            backgroundColor: '#1e1e1e',
          }),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorSuccess: {
          ...(mode === 'dark' && {
            backgroundColor: '#4caf50', // Bright green in dark mode for online status
            color: '#ffffff', // Ensure text is white for contrast
          }),
        },
        colorError: {
          ...(mode === 'dark' && {
            backgroundColor: 'rgba(244, 67, 54, 0.9)', // Make error more visible too
          }),
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          ...(mode === 'dark' && {
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: '#ff1744',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: '#ff1744',
            },
          }),
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          ...(mode === 'dark' && {
            '&:hover': {
              backgroundColor: '#d50000',
            },
          }),
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          ...(mode === 'dark' && {
            '&.Mui-selected': {
              backgroundColor: 'rgba(255, 23, 68, 0.15)',
            },
            '&.Mui-selected:hover': {
              backgroundColor: 'rgba(255, 23, 68, 0.25)',
            },
          }),
        },
      },
    },
  },
});

// Theme cookie name
const THEME_COOKIE_NAME = 'watchtower-theme-mode';

function App() {
  // Get theme from cookies or default to dark mode
  let savedTheme;
  try {
    savedTheme = Cookies.get(THEME_COOKIE_NAME);
  } catch (e) {
    console.warn('Error reading theme cookie:', e);
  }
  const [mode, setMode] = useState(savedTheme || 'dark');

  // Create theme
  const theme = createTheme(getThemeOptions(mode));

  // Save theme preference to cookie when it changes
  useEffect(() => {
    try {
      Cookies.set(THEME_COOKIE_NAME, mode, { expires: 365 }); // Cookie lasts for a year
    } catch (e) {
      console.warn('Error setting theme cookie:', e);
    }
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  function AppRoutes() {
    const { user, loading, login } = useAuth();
    const location = useLocation();

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      );
    }
    if (!user) {
      return <Login onLogin={login} />;
    }
    return (
      <Routes>
        <Route path="/vnc-viewer" element={<VncViewer />} />
        <Route path="/" element={<AppLayout toggleTheme={toggleTheme} currentTheme={mode} />}>
          <Route index element={<Proxmox />} />
          <Route path="proxmox" element={<Proxmox />} />
        </Route>
        <Route path="/login" element={<Navigate to="/" state={{ from: location }} replace />} />
      </Routes>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;

