export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';

interface JoinRequest {
  userId: string;
  gender: string;
  lookingFor: string;
  country?: string;
  subscriptionStatus: 'FREE' | 'TRIAL' | 'PAID';
  boostActive?: boolean;
}

interface QueueUser extends JoinRequest {
  joinedAt: number;
  priorityScore: number;
}

const QUEUE_KEY = 'matching:queue';

const handler = async (req: NextRequest) => {
  try {
    const body = (await req.json()) as JoinRequest;

    const priorityScore =
      body.subscriptionStatus === 'PAID'
        ? 3
        : body.boostActive
        ? 2
        : body.subscriptionStatus === 'TRIAL'
        ? 1
        : 0;

    const currentUser: QueueUser = {
      ...body,
      joinedAt: Date.now(),
      priorityScore,
    };

    const rawQueue = await redis.lrange(QUEUE_KEY, 0, -1);
    const queue: QueueUser[] = rawQueue.map((item) => JSON.parse(item));

    const matchIndex = queue.findIndex((partner) => {
      if (partner.userId === currentUser.userId) return false;

      const genderMatch =
        (partner.lookingFor === 'ALL' ||
          partner.lookingFor === currentUser.gender) &&
        (currentUser.lookingFor === 'ALL' ||
          currentUser.lookingFor === partner.gender);

      return genderMatch;
    });

    if (matchIndex !== -1) {
      const matchedUser = queue[matchIndex];

      await redis.lrem(QUEUE_KEY, 1, JSON.stringify(matchedUser));
      const roomId = uuidv4();

      return NextResponse.json({
        matchFound: true,
        partnerId: matchedUser.userId,
        roomId,
      });
    }

    await redis.rpush(QUEUE_KEY, JSON.stringify(currentUser));
    return NextResponse.json({ matchFound: false });
  } catch (err) {
    console.error('Join route error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
};

export { handler as POST };
