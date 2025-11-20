import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Add as AddIcon,
  Cloud as CloudIcon,
  Article as ArticleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

const AppLayout = ({ toggleTheme, currentTheme }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Watchtower
          </Typography>
          
          {/* NUC Build Request Button */}
          <Button 
            color="inherit" 
            component={Link} 
            to="/nuc-build-request"
            variant={isActive('/nuc-build-request') ? 'outlined' : 'text'}
            startIcon={<AddIcon />}
            sx={{ mr: 2 }}
          >
            NUC Build Request
          </Button>
          
          {/* Proxmox Button */}
          <Button 
            color="inherit" 
            component={Link} 
            to="/proxmox"
            variant={isActive('/proxmox') ? 'outlined' : 'text'}
            startIcon={<CloudIcon />}
            sx={{ mr: 2 }}
          >
            Proxmox
          </Button>
          
          {/* Theme Toggle Button */}
          <Tooltip title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}>
            <IconButton 
              color="inherit" 
              onClick={toggleTheme} 
              sx={{ mr: 2 }}
            >
              {currentTheme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
        >
          <List>
            <ListItem disablePadding>
              <ListItemButton
                component={Link} 
                to="/" 
                selected={isActive('/')}
              >
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link} 
                to="/nuc-build-request" 
                selected={isActive('/nuc-build-request')}
              >
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="NUC Build Request" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link} 
                to="/proxmox" 
                selected={isActive('/proxmox')}
              >
                <ListItemIcon>
                  <CloudIcon />
                </ListItemIcon>
                <ListItemText primary="Proxmox" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link} 
                to="/wiki" 
                selected={isActive('/wiki')}
              >
                <ListItemIcon>
                  <ArticleIcon />
                </ListItemIcon>
                <ListItemText primary="Knowledge Base" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link} 
                to="/tasks" 
                selected={isActive('/tasks')}
              >
                <ListItemIcon>
                  <AssignmentIcon />
                </ListItemIcon>
                <ListItemText primary="Task Board" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          maxWidth: '100%',
          marginTop: '64px', // AppBar height
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;

