import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const poolMax = Number(process.env.DB_POOL_SIZE ?? 10);

const client = postgres(connectionString, {
  // Prepared statements are safe against the direct Postgres connection this
  // app uses. Set DB_DISABLE_PREPARE=true if a transaction-mode pooler
  // (pgBouncer, Supabase's 6543 port) is ever put in front of it.
  prepare: process.env.DB_DISABLE_PREPARE !== "true",
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
