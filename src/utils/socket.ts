// src/utils/socket.ts
import io, { Socket } from 'socket.io-client';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string;

if (!BACKEND_URL) {
  throw new Error('❌ NEXT_PUBLIC_BACKEND_URL not set in .env.local');
}

export const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});

export type SocketType = ReturnType<typeof io>;
