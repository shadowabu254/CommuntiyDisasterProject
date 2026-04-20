import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

export const socket = io(SOCKET_URL, {
  autoConnect: false
});

export const connectSocket = (userId) => {
  socket.connect();
  socket.emit('join', userId);
};

export const disconnectSocket = () => {
  socket.disconnect();
};