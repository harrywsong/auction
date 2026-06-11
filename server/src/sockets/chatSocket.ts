import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

export function setupChatSocket(io: Server, socket: Socket) {
  socket.on('chat:send', (data) => {
    const { auctionId, senderName, role, text } = data;

    if (!auctionId || !senderName || !text?.trim()) return;

    const message = {
      id: uuidv4(),
      senderName: String(senderName).slice(0, 32),
      role: role || 'spectator',
      text: String(text).slice(0, 200),
      timestamp: new Date(),
    };

    // Broadcast to everyone in the auction room including sender
    io.to(`auction:${auctionId}`).emit('chat:message', message);
  });
}
