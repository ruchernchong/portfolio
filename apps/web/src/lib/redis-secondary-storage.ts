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
    // Atomic INCR + EXPIRE-via-Lua so a crashed invocation between the two
    // can never leave a fixed-window counter without a TTL (which would
    // rate-limit the key permanently). The TTL is still applied only on
    // creation, preserving the fixed-window contract.
    const value = (await redis.eval(
      `local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current`,
      [namespaced],
      [ttl],
    )) as number;
    return typeof value === "number" ? value : Number(value);
  },
};
