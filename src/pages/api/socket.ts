// src/pages/api/socket.ts
// MVP: matching فوري + إشارات WebRTC عبر Socket.IO rooms

import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { Server as IOServer, type Socket } from 'socket.io';

export const config = { api: { bodyParser: false } };

type ServerWithIO = HTTPServer & { io?: IOServer };

type Gender = 'male' | 'female' | 'couple' | 'lgbt' | 'any';

interface QueueItem {
  socketId: string;
  userId: string;
  gender: Gender;
  lookingFor: Gender;
  isVip?: boolean;
  boosted?: boolean;
  ts: number;
}

const queue: QueueItem[] = [];
const userIdToSocket = new Map<string, string>();

function safeJoinUserRoom(socket: Socket, userId?: string) {
  if (!userId) return;
  try { socket.join(userId); userIdToSocket.set(userId, socket.id); } catch {}
}
function removeFromQueueBySocketId(socketId: string) {
  const i = queue.findIndex(q => q.socketId === socketId);
  if (i >= 0) queue.splice(i, 1);
}
function removeFromQueueByUserId(userId: string) {
  const i = queue.findIndex(q => q.userId === userId);
  if (i >= 0) queue.splice(i, 1);
  userIdToSocket.delete(userId);
}
function makeRoomId(a: string, b: string) {
  return `r_${Date.now()}_${a.slice(0,6)}_${b.slice(0,6)}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const server = (res.socket as any).server as ServerWithIO;

  if (!server.io) {
    const io = new IOServer(server, {
      path: '/api/socket',
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    server.io = io;
    console.log('✅ Socket.IO server started (MVP matching + RTC)');

    io.on('connection', (socket: Socket) => {
      const userId = (socket.handshake.query.userId as string) || '';
      if (userId) safeJoinUserRoom(socket, userId);

      // ====== Matching (MVP) ======
      socket.on('matching:enqueue', (payload: any) => {
        try {
          const item: QueueItem = {
            socketId: socket.id,
            userId: String(payload?.userId || userId || socket.id),
            gender: (payload?.gender as Gender) || 'any',
            lookingFor: (payload?.lookingFor as Gender) || 'any',
            isVip: !!payload?.isVip,
            boosted: !!payload?.boosted,
            ts: Date.now(),
          };
          removeFromQueueByUserId(item.userId);
          queue.push(item);

          if (queue.length >= 2) {
            const a = queue.shift()!;
            const b = queue.shift()!;
            const roomId = makeRoomId(a.userId, b.userId);
            io.to(a.userId).emit('matching:matchFound', roomId);
            io.to(b.userId).emit('matching:matchFound', roomId);
          } else {
            io.to(item.userId).emit('matching:noMatch');
          }
        } catch {
          io.to(userId || socket.id).emit('matching:noMatch');
        }
      });

      socket.on('matching:leave', (data: { userId: string }) => {
        const uid = data?.userId || userId;
        if (!uid) return;
        removeFromQueueByUserId(uid);
        io.to(uid).emit('left');
      });

      // ====== WebRTC signaling ======
      // peer ينضم لغرفة roomId: سيتم relay للإشارات داخل نفس الغرفة
      socket.on('rtc:join', (roomId: string) => {
        try {
          socket.join(roomId);
          socket.to(roomId).emit('rtc:peer-joined', { sid: socket.id });
        } catch {}
      });

      // relay أي رسالة إشارة (offer/answer/candidate/bye) لزملاء الغرفة
      socket.on('rtc:signal', (roomId: string, payload: any) => {
        socket.to(roomId).emit('rtc:signal', { from: socket.id, payload });
      });

      socket.on('rtc:leave', (roomId: string) => {
        try {
          socket.leave(roomId);
          socket.to(roomId).emit('rtc:peer-left', { sid: socket.id });
        } catch {}
      });

      socket.on('disconnect', () => {
        removeFromQueueBySocketId(socket.id);
        if (userId) userIdToSocket.delete(userId);
      });
    });
  }

  res.end();
}

