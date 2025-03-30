// server/db.ts
import postgres from 'postgres';

const connectionString = process.env.ZERO_UPSTREAM_DB;

if (!connectionString) {
    console.error("FATAL: ZERO_UPSTREAM_DB environment variable is not set.");
    process.exit(1); // Exit if DB connection string is missing
}

console.log("Initializing PostgreSQL client...");
// Configure options as needed (e.g., ssl, max connections)
// See https://github.com/porsager/postgres for options
const sql = postgres(connectionString, {
    // Example options:
    // ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined, // Adjust based on your DB setup
    // max: 10, // Max number of connections
    // idle_timeout: 30, // Seconds
});

console.log("PostgreSQL client initialized.");

// Perform a simple query to test the connection on startup
async function checkDbConnection() {
    try {
        await sql`SELECT 1`;
        console.log("Database connection successful.");
    } catch (error) {
        console.error("FATAL: Database connection failed:", error);
        process.exit(1);
    }
}

// Run the check when the module loads
checkDbConnection();


export { sql }; // Export the initialized client instance