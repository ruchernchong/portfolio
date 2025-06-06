"use server";

import db from "@/db";
import { sessions } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export const getPages = async () =>
  db
    .select({
      path: sessions.path,
      count: sql<number>`CAST(COUNT(${sessions.path}) AS INTEGER)`,
      percent: sql<number>`ROUND(CAST(COUNT(${sessions.path}) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL), 1)`,
    })
    .from(sessions)
    .groupBy(sessions.path)
    .orderBy(desc(sql`COUNT(${sessions.path})`));
