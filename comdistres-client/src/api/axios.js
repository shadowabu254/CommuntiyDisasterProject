import axios from 'axios';

const api = axios.create({
  baseURL:'https://disaster-system-l3zu.onrender.com/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export default api;
