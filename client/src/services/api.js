/**
 * api.js - Centralized API Service for ReviewLens
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const uploadCSV = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

export const fetchAnalytics = (params = {}) => {
  return api.get('/analytics', { params });
};

export const fetchReviews = (params = {}) => {
  return api.get('/reviews', { params });
};

export const fetchProductAnalytics = (productName) => {
  return api.get(`/analytics/products/${encodeURIComponent(productName)}`);
};

export const generateSuggestedReply = (reviewId) => {
  return api.post(`/reply/${reviewId}/reply`);
};

export default api;
