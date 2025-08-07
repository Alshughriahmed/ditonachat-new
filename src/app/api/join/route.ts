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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JoinRequest;

    // 1️⃣ إعداد المستخدم مع أولوية
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

    // 2️⃣ جلب الطابور
    const rawQueue = await redis.lrange(QUEUE_KEY, 0, -1);
    const queue: QueueUser[] = rawQueue.map((item) => JSON.parse(item));

    // 3️⃣ البحث عن تطابق مناسب
    const matchIndex = queue.findIndex((partner) => {
      if (partner.userId === currentUser.userId) return false;

      const genderMatch =
        (partner.lookingFor === 'ALL' ||
          partner.lookingFor === currentUser.ge
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JoinRequest;

    // 1️⃣ إعداد المستخدم مع أولوية
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

    // 2️⃣ جلب الطابور
    const rawQueue = await redis.lrange(QUEUE_KEY, 0, -1);
    const queue: QueueUser[] = rawQueue.map((item) => JSON.parse(item));

    // 3️⃣ البحث عن تطابق مناسب
    const matchIndex = queue.findIndex((partner) => {
      if (partner.userId === currentUser.userId) return false;

      const genderMatch =
        (partner.lookingFor === 'ALL' ||
          partner.lookingFor === currentUser.ge
