"use server";

import db from "@/db";
import { sessions } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export const getOS = async () =>
  db
    .select({
      os: sessions.os,
      count: sql<number>`CAST(COUNT(${sessions.os}) AS INTEGER)`,
      percent: sql<number>`ROUND(CAST(COUNT(${sessions.os}) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL), 1)`,
    })
    .from(sessions)
    .groupBy(sessions.os)
    .orderBy(desc(sql`COUNT(${sessions.os})`));
