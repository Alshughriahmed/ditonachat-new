import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';
import type { NextApiResponseServerIO } from '@/types/next';
import { joinAndMatch, leaveQueue } from '@/utils/matching';

let io: Server | null = null;

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('🚀 Starting Socket.io server...');

    io = new Server(res.socket.server as any, {
      path: '/api/socket',
      cors: {
        origin: '*', // غيّرها لاحقًا إلى نطاق موقعك
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log('✅ User connected:', socket.id);

      socket.on('join-queue', async (data) => {
        const { userId, gender, preference } = data;

        const result = await joinAndMatch({ userId, gender, preference });

        if (result.status === 'matched') {
          socket.emit('matched', {
            roomId: result.data.roomId,
            partnerId: result.data.b
          });

          // إرسال للطرف الآخر
          socket.to(result.data.b).emit('matched', {
            roomId: result.data.roomId,
            partnerId: result.data.a
          });
        } else if (result.status === 'waiting') {
          socket.emit('waiting');
        }
      });

      socket.on('leave-queue', async (data) => {
        const { userId } = data;
        await leaveQueue(userId);
        socket.emit('left');
      });

      socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
