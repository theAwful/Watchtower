import { Box } from '@mui/material';

/**
 * Blue rook icon (tower / watchtower) for login.
 */
const WatchtowerLogo = ({ size = 80, ...boxProps }) => (
  <Box
    component="svg"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 64"
    width={size}
    height={size * (64 / 48)}
    sx={{ ...boxProps?.sx }}
    {...boxProps}
  >
    {/* Base */}
    <rect x="8" y="48" width="32" height="16" rx="2" fill="#1565c0" />
    {/* Tower body */}
    <rect x="14" y="20" width="20" height="28" fill="#1976d2" />
    {/* Top bar */}
    <rect x="14" y="8" width="20" height="12" fill="#1976d2" />
    {/* Battlements (rook top) */}
    <rect x="15" y="0" width="6" height="8" fill="#0d47a1" />
    <rect x="21" y="0" width="6" height="8" fill="#0d47a1" />
    <rect x="27" y="0" width="6" height="8" fill="#0d47a1" />
  </Box>
);

export default WatchtowerLogo;
