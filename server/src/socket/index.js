import { Server } from 'socket.io';
import { registerHandlers } from './handlers.js';

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    registerHandlers(io, socket);
  });

  console.log('[Socket] Socket.IO server attached');
  return io;
}
