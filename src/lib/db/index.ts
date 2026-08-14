import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const poolMax = Number(process.env.DB_POOL_SIZE ?? 10);

const client = postgres(connectionString, {
  prepare: false,
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
