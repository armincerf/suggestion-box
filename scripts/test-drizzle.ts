import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";
import { categories, suggestions } from "../src/db/schema";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const { Pool } = pg;

async function main() {
	console.log("Testing Drizzle ORM connection and schema...");

	// Connect to the database
	const pool = new Pool({
		connectionString: process.env.ZERO_UPSTREAM_DB,
	});
	const db = drizzle(pool, { schema });

	try {
		// Test 1: Query all categories
		console.log("Test 1: Fetching all categories...");
		const allCategories = await db.select().from(categories);
		console.log(`Found ${allCategories.length} categories:`);
		console.table(allCategories);

		// Test 2: Create a test suggestion
		console.log("\nTest 2: Creating a test suggestion...");
		const testSuggestionId = uuidv4();
		await db.insert(suggestions).values({
			id: testSuggestionId,
			body: "This is a test suggestion from Drizzle",
			timestamp: new Date(),
			userId: "test-user",
			displayName: "Test User",
			categoryId: "start", // Using the "start" category
		});
		console.log(`Created test suggestion with ID: ${testSuggestionId}`);

		// Test 3: Query the created suggestion
		console.log("\nTest 3: Fetching the test suggestion...");
		const testSuggestion = await db
			.select()
			.from(suggestions)
			.where(eq(suggestions.id, testSuggestionId));
		console.log("Test suggestion data:");
		console.table(testSuggestion);

		// Test 4: Query suggestions with related category
		console.log("\nTest 4: Fetching suggestions with related category...");
		const suggestionsWithCategory = await db.query.suggestions.findMany({
			with: {
				category: true,
			},
			orderBy: [desc(suggestions.timestamp)],
			limit: 5,
		});
		console.log("Recent suggestions with categories:");
		console.log(JSON.stringify(suggestionsWithCategory, null, 2));

		// Cleanup: Delete the test suggestion
		console.log("\nCleaning up: Deleting test suggestion...");
		await db.delete(suggestions).where(eq(suggestions.id, testSuggestionId));
		console.log("Test suggestion deleted.");

		console.log("\nAll tests completed successfully!");
	} catch (error) {
		console.error("Error during tests:", error);
	} finally {
		await pool.end();
	}
}

main();
