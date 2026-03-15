import { Box } from '@mui/material';

/**
 * Blue watchtower silhouette (observation tower style) for login.
 */
const WatchtowerLogo = ({ size = 80, ...boxProps }) => (
  <Box
    component="svg"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 96"
    width={size}
    height={size * (96 / 64)}
    sx={{ display: 'block', ...boxProps?.sx }}
    {...boxProps}
  >
    {/* Tower base - wider */}
    <path fill="#0d47a1" d="M14 72h36v24H14z" />
    {/* Tower leg / pillar - narrow */}
    <path fill="#1565c0" d="M24 24h16v48H24z" />
    {/* Observation cabin on top */}
    <path fill="#1976d2" d="M18 8h28v16H18z" />
    {/* Cabin roof / cap */}
    <path fill="#0d47a1" d="M22 0h20l-4 8H26L22 0z" />
  </Box>
);

export default WatchtowerLogo;
