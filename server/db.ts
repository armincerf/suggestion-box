import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" }); // Load .env from parent directory

const connectionString = process.env.PROD_DB_URL || process.env.ZERO_UPSTREAM_DB;

if (!connectionString) {
	console.error(
		"[Server] FATAL: ZERO_UPSTREAM_DB environment variable is not set.",
	);
	process.exit(1);
}

console.log("[Server] Initializing PostgreSQL client...");
const sql = postgres(connectionString, {
	// Add any specific options if needed
});

console.log("[Server] PostgreSQL client initialized.");

// Optional: Test connection on startup
async function checkDbConnection() {
	try {
		await sql`SELECT 1`;
		console.log("[Server] Database connection successful.");
	} catch (error) {
		console.error(
			"[Server] FATAL: Database connection failed:",
			error,
		);
		process.exit(1);
	}
}

checkDbConnection();

export { sql };
