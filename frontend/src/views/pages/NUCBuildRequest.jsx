import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Alert,
} from '@mui/material';

const NUCBuildRequest = () => {
  const [formData, setFormData] = useState({
    clientName: '',
    engagementCode: '',
    ipType: 'dhcp',
    staticIp: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add backend API integration
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        clientName: '',
        engagementCode: '',
        ipType: 'dhcp',
        staticIp: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
      });
    }, 3000);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', p: { xs: 1, sm: 2, md: 3 }, boxSizing: 'border-box' }}>
      <Typography variant="h4" gutterBottom>
        NUC Build Request
      </Typography>

      <Paper elevation={2} sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        {submitted && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Request submitted successfully! (Frontend-only for now)
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
            Client Information
          </Typography>
          <TextField
            fullWidth
            label="Client Name"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Engagement Code"
            name="engagementCode"
            value={formData.engagementCode}
            onChange={handleChange}
            required
            margin="normal"
          />

          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
            IP Address Configuration
          </Typography>
          <FormControl component="fieldset" margin="normal">
            <FormLabel component="legend">IP Address Type</FormLabel>
            <RadioGroup
              row
              name="ipType"
              value={formData.ipType}
              onChange={handleChange}
            >
              <FormControlLabel value="dhcp" control={<Radio />} label="DHCP" />
              <FormControlLabel value="static" control={<Radio />} label="Static" />
            </RadioGroup>
          </FormControl>
          {formData.ipType === 'static' && (
            <TextField
              fullWidth
              label="Static IP Address"
              name="staticIp"
              value={formData.staticIp}
              onChange={handleChange}
              required
              margin="normal"
            />
          )}

          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
            Client Contact Information
          </Typography>
          <TextField
            fullWidth
            label="Contact Name"
            name="contactName"
            value={formData.contactName}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Contact Email"
            name="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Contact Phone"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleChange}
            required
            margin="normal"
          />

          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
            Shipping Information
          </Typography>
          <TextField
            fullWidth
            label="Street Address"
            name="streetAddress"
            value={formData.streetAddress}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="State/Province"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="ZIP/Postal Code"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            required
            margin="normal"
          />

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" color="primary" size="large">
              Submit Request
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default NUCBuildRequest;

