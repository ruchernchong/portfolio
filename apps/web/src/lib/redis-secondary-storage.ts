import type { SecondaryStorage } from "better-auth";
import redis from "@/config/redis";

const KEY_PREFIX = "better-auth:";

export const redisSecondaryStorage: SecondaryStorage = {
  get: (key) => redis.get<string>(`${KEY_PREFIX}${key}`),
  getAndDelete: (key) => redis.getdel<string>(`${KEY_PREFIX}${key}`),
  set: (key, value, ttl) =>
    ttl
      ? redis.set(`${KEY_PREFIX}${key}`, value, { ex: ttl })
      : redis.set(`${KEY_PREFIX}${key}`, value),
  delete: async (key) => {
    await redis.del(`${KEY_PREFIX}${key}`);
  },
  increment: async (key, ttl) => {
    const namespaced = `${KEY_PREFIX}${key}`;
    const value = await redis.incr(namespaced);
    // Apply the TTL only on creation so the counter expires a fixed window
    // after it was first created (per the SecondaryStorage contract).
    if (value === 1) {
      await redis.expire(namespaced, ttl);
    }
    return value;
  },
};
