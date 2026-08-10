import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

if (process.env.DB_RESET_CONFIRM !== "yes") {
  console.error(
    "Refusing to reset database. Set DB_RESET_CONFIRM=yes to proceed.",
  );
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  console.log("Dropping and recreating public schema...");
  await sql.unsafe(`
    DROP SCHEMA IF EXISTS drizzle CASCADE;
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
  `);
  console.log("Database schema reset complete.");
} finally {
  await sql.end();
}
