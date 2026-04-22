import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://disaster-system-l3zu.onrender.com/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export default api;
