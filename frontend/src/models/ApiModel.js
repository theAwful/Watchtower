import axios from 'axios';

// Create an axios instance with default configuration
const api = axios.create({
  // Use empty string for relative URLs (Vite will proxy /api/* in dev, nginx in prod)
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 45000 // 45 seconds
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
    // Handle specific error responses
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      console.error('API Error Response:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

