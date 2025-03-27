import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzleprod",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.PROD_DB_URL || "",
	},
	verbose: true,
	strict: true,
});
