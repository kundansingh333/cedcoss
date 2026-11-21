/**
 * api.js - Axios client for backend API calls
 *
 * Why a centralized API service?
 * - Single place to configure base URL, headers, interceptors
 * - All components import from here instead of repeating fetch/axios setup
 * - Easy to add auth headers, error handling, or logging later
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxy forwards /api/* to localhost:5000
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor: unwrap data or handle errors globally
api.interceptors.response.use(
  (response) => response.data, // Return just the data, not the full Axios response
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export default api;
