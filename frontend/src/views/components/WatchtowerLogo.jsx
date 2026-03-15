import { Box } from '@mui/material';

/**
 * Watchtower icon: tower with dome lookout, sized for login header.
 */
const WatchtowerLogo = ({ size = 80, color = 'primary.main', ...boxProps }) => (
  <Box
    component="svg"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 88"
    width={size}
    height={size * (88 / 64)}
    sx={{ color, ...boxProps?.sx }}
    {...boxProps}
  >
    {/* Base */}
    <path fill="currentColor" d="M18 64h28v24H18z" opacity={0.85} />
    {/* Tower body */}
    <path fill="currentColor" d="M24 36h16v28H24z" />
    {/* Dome / lookout */}
    <path fill="currentColor" d="M32 4L20 20h24L32 4z" />
    <path fill="currentColor" d="M26 20h12v16H26z" opacity={0.9} />
    {/* Window */}
    <path fill="currentColor" d="M30 44h4v6h-4z" opacity={0.5} />
  </Box>
);

export default WatchtowerLogo;
