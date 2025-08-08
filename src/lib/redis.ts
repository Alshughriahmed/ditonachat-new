// src/lib/redis.ts
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
// مثال لكلمة مرور: redis://:PASSWORD@HOST:PORT
// على Vercel: أضف REDIS_URL في Environment Variables.

let redis: Redis;

// منع إنشاء أكثر من اتصال في بيئات التطوير (Hot Reload)
declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

if (!global.__redis) {
  const client = new Redis(REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true,
  });

  client.on('error', (err) => {
    console.error('[Redis] Connection Error:', err?.message || err);
  });
  client.on('connect', () => {
    console.log('[Redis] Connected');
  });

  global.__redis = client;
}

redis = global.__redis!;
export default redis;
