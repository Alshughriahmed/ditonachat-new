// src/utils/matching.ts
import redis from '@/lib/redis';
import { randomUUID } from 'crypto';

export type Gender = 'male' | 'female' | 'couple' | 'lgbt' | 'any';
export type LookingFor =
  | 'any'
  | 'male'
  | 'female'
  | 'couple'
  | 'lgbt'
  | 'same-gender'
  | 'opposite-gender';

export interface QueuePayload {
  userId: string;
  gender: Gender;          // جنس المستخدم
  lookingFor: LookingFor;  // ماذا يبحث عنه (من بارام chat?type=)
  isVip?: boolean;         // مشترك
  boosted?: boolean;       // Boost نشط
  country?: string;
  avatar?: string;
  username?: string;
}

export interface MatchResult {
  roomId: string;
  a: string; // userId
  b: string; // partnerId
}

const Q_KEY = 'queue:waiting';                  // قائمة IDs
const META_PREFIX = 'user:meta:';               // Hash ميتاداتا
const SCORE_ZSET = 'queue:score';               // ZSET للأولوية (VIP/Boost/زمن)
const ROOM_PREFIX = 'room:';                    // تتبع الغرف
const IN_QUEUE = 'queue:in';                    // Set لمنع التكرار

const now = () => Date.now();

function metaKey(id: string) {
  return `${META_PREFIX}${id}`;
}
function roomKey(id: string) {
  return `${ROOM_PREFIX}${id}`;
}

/** تفضيل الطرف */
function prefers(user: QueuePayload, partnerGender: Gender): boolean {
  const p = user.lookingFor || 'any';
  if (p === 'any') return true;
  if (p === 'same-gender') return user.gender !== 'any' && user.gender === partnerGender;
  if (p === 'opposite-gender') return user.gender !== 'any' && user.gender !== partnerGender;
  return partnerGender === p;
}

/** توافق متبادل */
function compatible(a: QueuePayload, b: QueuePayload): boolean {
  if (a.userId === b.userId) return false;
  return prefers(a, b.gender) && prefers(b, a.gender);
}

/** حفظ/تحديث بيانات المستخدم في الذاكرة مع TTL */
export async function upsertMeta(p: QueuePayload) {
  await redis.hset(metaKey(p.userId), {
    gender: p.gender,
    lookingFor: p.lookingFor,
    isVip: p.isVip ? '1' : '0',
    boosted: p.boosted ? '1' : '0',
    country: p.country || '',
    avatar: p.avatar || '',
    username: p.username || '',
    ts: String(now()),
  });
  await redis.expire(metaKey(p.userId), 60 * 60); // 1 ساعة
}

/** جلب ميتاداتا */
export async function getMeta(userId: string): Promise<QueuePayload | null> {
  const d = await redis.hgetall(metaKey(userId));
  if (!d || !d.gender) return null;
  return {
    userId,
    gender: d.gender as Gender,
    lookingFor: (d.lookingFor as LookingFor) || 'any',
    isVip: d.isVip === '1',
    boosted: d.boosted === '1',
    country: d.country,
    avatar: d.avatar,
    username: d.username,
  };
}

/** ادخال الطابور مع تسجيل أولوية */
export async function enqueue(p: QueuePayload) {
  // score أعلى = أولوية أعلى: VIP + Boost + عامل الزمن
  // نستخدم صيغة: base = time, ثم إضافات VIP/Boost
  const base = now() / 1e5; // يزود تدريجيًا
  const vipBonus = p.isVip ? 100 : 0;
  const boostBonus = p.boosted ? 200 : 0;
  const score = base + vipBonus + boostBonus;

  const added = await redis.sadd(IN_QUEUE, p.userId);
  if (added === 1) {
    await redis.rpush(Q_KEY, p.userId);
  }
  await redis.zadd(SCORE_ZSET, score, p.userId);
}

/** إزالة من الطابور */
export async function dequeue(userId: string) {
  await redis.multi()
    .lrem(Q_KEY, 0, userId)
    .srem(IN_QUEUE, userId)
    .zrem(SCORE_ZSET, userId)
    .exec();
}

/** محاولة المطابقة: نأخذ مرشحين مرتبين بالأولوية ونفحص التوافق */
export async function tryMatch(userId: string): Promise<MatchResult | null> {
  const seeker = await getMeta(userId);
  if (!seeker) return null;

  // احصل على 200 مرشح بالأولوية (يمكن ضبطها لاحقًا)
  const candidates = await redis.zrevrange(SCORE_ZSET, 0, 199);

  for (const candidateId of candidates) {
    if (candidateId === userId) continue;

    const candidate = await getMeta(candidateId);
    if (!candidate) {
      await dequeue(candidateId);
      continue;
    }

    if (compatible(seeker, candidate)) {
      // أخرج الاثنين
      await redis.multi()
        .lrem(Q_KEY, 0, userId)
        .lrem(Q_KEY, 0, candidateId)
        .srem(IN_QUEUE, userId)
        .srem(IN_QUEUE, candidateId)
        .zrem(SCORE_ZSET, userId)
        .zrem(SCORE_ZSET, candidateId)
        .exec();

      const roomId = randomUUID();
      await redis.hset(roomKey(roomId), { a: userId, b: candidateId, t: String(now()) });
      await redis.expire(roomKey(roomId), 60 * 60);

      return { roomId, a: userId, b: candidateId };
    }
  }
  return null;
}

/** واجهة عليا كما يتوقعها السيرفر */
export async function enqueueAndMatch(payload: QueuePayload):
  Promise<{ status: 'matched'; data: MatchResult } | { status: 'waiting' } | { status: 'error'; reason: string }> {
  try {
    await upsertMeta(payload);
    await enqueue(payload);
    const m = await tryMatch(payload.userId);
    if (m) return { status: 'matched', data: m };
    return { status: 'waiting' };
  } catch (e: any) {
    return { status: 'error', reason: e?.message || 'unknown' };
  }
}
