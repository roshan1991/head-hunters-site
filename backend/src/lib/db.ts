import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../db/schema";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Find and load .env file from multiple possible paths
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Fallback to default dotenv config if none of specific paths matched
dotenv.config();

// Determine database connection URL from .env
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.DATABASE_MIGRATION_URL) {
    return process.env.DATABASE_MIGRATION_URL;
  }
  if (process.env.MYSQL_URL) {
    return process.env.MYSQL_URL;
  }

  // Construct from individual environment variables if available
  const host = process.env.DB_HOST || process.env.MYSQL_HOST;
  const user = process.env.DB_USER || process.env.MYSQL_USER;
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "";
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE;
  const port = process.env.DB_PORT || process.env.MYSQL_PORT || "3306";

  if (host && user && database) {
    const encodedPassword = encodeURIComponent(password);
    return `mysql://${user}:${encodedPassword}@${host}:${port}/${database}`;
  }

  throw new Error(
    "Missing database connection settings in .env! Please set DATABASE_URL (e.g. mysql://user:password@localhost:3306/dbname) or individual DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env"
  );
}

const databaseUrl = getDatabaseUrl();
const sslEnabled = process.env.DATABASE_SSL === "true" || process.env.MYSQL_SSL === "true";

// Create one shared MySQL pool for the process
const pool = mysql.createPool({
  uri: databaseUrl,
  waitForConnections: true,
  connectionLimit: Number(process.env.DATABASE_POOL_LIMIT || 10),
  timezone: "Z",
  charset: "utf8mb4",
  ssl: sslEnabled
    ? {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
      }
    : undefined,
});

export const db = drizzle(pool, { schema, mode: "planetscale" });
export { pool, databaseUrl };
