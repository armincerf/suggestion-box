import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
	connectionString: process.env.ZERO_UPSTREAM_DB,
});

export const db = drizzle(pool, { schema });

export * from "./schema";