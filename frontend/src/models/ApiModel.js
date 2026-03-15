import axios from 'axios';

// Create an axios instance with default configuration
const api = axios.create({
  // Use empty string for relative URLs (Vite will proxy /api/* in dev, nginx in prod)
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 45000, // 45 seconds
});

// Add a request interceptor
api.interceptors.request.use(
  config => {
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    } else if (error.request) {
      console.error('API No Response:', error.request);
    } else {
      console.error('API Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

