import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { initializeSocket, disconnectSocket } from '../utils/socket';

export function useSocket(auctionId: string, token?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!auctionId) return;
    const s = initializeSocket(auctionId, token);
    setSocket(s);

    return () => {
      disconnectSocket();
      setSocket(null);
    };
  }, [auctionId, token]);

  return socket;
}

export function useSocketEvent(
  socket: Socket | null,
  event: string,
  handler: (...args: any[]) => void
) {
  // Keep a stable ref to the latest handler so we never need to re-subscribe
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!socket) return;
    const stable = (...args: any[]) => handlerRef.current(...args);
    socket.on(event, stable);
    return () => {
      socket.off(event, stable);
    };
  }, [socket, event]);
}

export function useSocketEmit(socket: Socket | null) {
  return useCallback(
    (event: string, data: any) => {
      if (socket) {
        socket.emit(event, data, (response: any) => {
          if (response?.error) {
            console.error(`Error from ${event}:`, response.error);
          }
        });
      }
    },
    [socket]
  );
}

export function useHeartbeat(socket: Socket | null, interval: number = 10000) {
  useEffect(() => {
    if (!socket) return;

    const heartbeatInterval = setInterval(() => {
      socket.emit('client:heartbeat', {}, (response: any) => {
        if (response?.error) {
          console.error('Heartbeat failed:', response.error);
        }
      });
    }, interval);

    return () => clearInterval(heartbeatInterval);
  }, [socket, interval]);
}