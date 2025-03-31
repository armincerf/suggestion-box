// polling-service/index.ts
import dotenv from "dotenv";
// Assuming db connection is setup correctly, adjust path if necessary
// If db.ts is in the *sibling* 'server' folder as requested previously: import { sql } from '../server/db';
// If you moved db.ts *into* polling-service: import { sql } from './db';
import { sql } from "../server/db"; // Using ./db as defined in Step 2 previously
import {
	typesenseClient,
	ensureTypesenseCollections,
	suggestionsCollectionName,
	commentsCollectionName,
} from "./typesense";
import type { ImportResponse } from "typesense/lib/Typesense/Documents";

dotenv.config({ path: "../.env" });

const POLLING_INTERVAL = Number.parseInt(
	process.env.POLLING_INTERVAL_MS || "10000",
	10,
);

// --- Define Interfaces (Using snake_case matching DB columns) ---

interface DbSuggestion {
	id: string;
	body: string | null;
	user_id: string | null; // snake_case
	display_name: string | null; // snake_case
	category_id: string | null; // snake_case
	timestamp: Date | null; // Now expecting Date objects
	updated_at: Date | null; // Now expecting Date objects
	deleted_at: Date | null; // Now expecting Date objects
}

interface DbComment {
	id: string;
	body: string | null;
	suggestion_id: string | null; // snake_case
	user_id: string | null; // snake_case
	display_name: string | null; // snake_case
	timestamp: Date | null; // Now expecting Date objects
	is_root_comment: boolean | null; // snake_case
	parent_comment_id: string | null; // snake_case
	// deleted_at?: Date | null; // Add if comments have soft deletes
}

// --- Typesense Interfaces (Using camelCase, as defined by Typesense schema) ---
interface TypesenseSuggestion {
	id: string;
	body: string;
	userId: string; // camelCase for Typesense
	displayName?: string | null;
	categoryId: string;
	timestamp: number; // Expecting epoch ms
	updatedAt: number; // Expecting epoch ms
}

interface TypesenseComment {
	id: string;
	body: string;
	suggestionId: string; // camelCase for Typesense
	userId: string;
	displayName?: string | null;
	timestamp: number; // Expecting epoch ms
	isRootComment: boolean;
	parentCommentId?: string | null;
}

// --- State ---
let lastSyncTimestamp = 0;
let isSyncing = false;

// --- Main Sync Function ---
async function syncChanges() {
	if (!suggestionsCollectionName || !commentsCollectionName) {
		throw new Error(
			"[Polling Service] Typesense environment variables (TYPESENSE_SUGGESTIONS_COLLECTION, TYPESENSE_COMMENTS_COLLECTION) are not fully configured. Indexing will be disabled.",
		);
	}
	if (isSyncing) {
		console.log("[Polling Service] Sync already in progress. Skipping.");
		return;
	}
	if (!typesenseClient) {
		console.error(
			"[Polling Service] Typesense client not available. Skipping sync.",
		);
		return;
	}

	isSyncing = true;
	const currentSyncStartTime = Date.now();

	// Create a Date object from the lastSyncTimestamp
	const lastSyncDate =
		lastSyncTimestamp > 0 ? new Date(lastSyncTimestamp) : new Date(0); // Use Epoch if 0

	try {
		// Query 1: Get suggestions updated since last sync
		const updatedSuggestions = await sql<DbSuggestion[]>`
            SELECT
                id, body, user_id, display_name, category_id, timestamp, updated_at, deleted_at
            FROM suggestion
            WHERE updated_at > ${lastSyncDate} AND deleted_at IS NULL
        `;

		// Query 2: Get suggestions deleted since last sync
		const deletedSuggestions = await sql<DbSuggestion[]>`
            SELECT
                id, body, user_id, display_name, category_id, timestamp, updated_at, deleted_at
            FROM suggestion
            WHERE deleted_at IS NOT NULL 
              AND deleted_at > ${lastSyncDate}
        `;

		// Combine results (Map ensures unique IDs, preferring deleted if present)
		const changedSuggestionsMap = new Map<string, DbSuggestion>();
		updatedSuggestions.forEach((s) => changedSuggestionsMap.set(s.id, s));
		deletedSuggestions.forEach((s) => changedSuggestionsMap.set(s.id, s)); // Will overwrite updated if deleted later
		const changedSuggestions = Array.from(changedSuggestionsMap.values());

		// --- Fetch Changed Comments (Use Date object for comparison) ---
		const changedComments = await sql<DbComment[]>`
            SELECT
                id, body, suggestion_id, user_id, display_name, timestamp, is_root_comment, parent_comment_id
            FROM comment
            WHERE timestamp > ${lastSyncDate}
            -- Add logic for updated/deleted comments here if needed
        `;

		// Add temporary debugging to check timestamp types
		if (changedSuggestions.length > 0) {
			console.log("Sample Suggestion Timestamps:", {
				ts: changedSuggestions[0].timestamp,
				upd: changedSuggestions[0].updated_at,
				del: changedSuggestions[0].deleted_at,
				type_ts: typeof changedSuggestions[0].timestamp,
				type_upd: typeof changedSuggestions[0].updated_at,
				type_del: typeof changedSuggestions[0].deleted_at,
			});
			// Check if it's a Date object without using instanceof
			if (
				changedSuggestions[0].updated_at &&
				typeof changedSuggestions[0].updated_at === "object" &&
				"getTime" in changedSuggestions[0].updated_at
			) {
				console.log("updated_at is likely a Date object!");
			}
		}

		if (
			changedSuggestions.length > 0 ||
			deletedSuggestions.length > 0 ||
			changedComments.length > 0
		) {
			console.log(
				`[Polling Service] Found ${changedSuggestions.length} changed suggestions (${deletedSuggestions.length} deleted), ${changedComments.length} changed comments.`,
			);
		}

		// --- Prepare Data for Typesense ---
		const suggestionsToUpsert: TypesenseSuggestion[] = [];
		const suggestionIdsToDelete: string[] = [];
		const commentsToUpsert: TypesenseComment[] = [];
		const commentIdsToDelete: string[] = [];

		changedSuggestions.forEach((s: DbSuggestion) => {
			// Check deleted_at first using the Date object
			if (s.deleted_at) {
				suggestionIdsToDelete.push(s.id);
			}
			// If not deleted, prepare for upsert
			else {
				// Convert Date objects to epoch milliseconds for Typesense
				if (
					s.id &&
					s.body &&
					s.user_id &&
					s.category_id &&
					s.timestamp instanceof Date &&
					s.updated_at instanceof Date
				) {
					suggestionsToUpsert.push({
						id: s.id,
						body: s.body,
						userId: s.user_id, // Map snake_case to camelCase
						displayName: s.display_name,
						categoryId: s.category_id,
						timestamp: s.timestamp.getTime(), // Convert Date to ms
						updatedAt: s.updated_at.getTime(), // Convert Date to ms
					});
				} else {
					console.warn(
						`[Polling Service] Skipping suggestion ${s.id} due to missing/invalid fields or non-Date timestamps.`,
					);
					// Log the problematic object for debugging
					console.warn(
						"[Polling Service] Problematic suggestion data:",
						JSON.stringify(s),
					);
				}
			}
		});

		changedComments.forEach((c: DbComment) => {
			// Convert Date objects to epoch milliseconds for Typesense
			if (
				c.id &&
				c.body &&
				c.suggestion_id &&
				c.user_id &&
				c.timestamp instanceof Date &&
				c.is_root_comment !== null
			) {
				commentsToUpsert.push({
					id: c.id,
					body: c.body,
					suggestionId: c.suggestion_id, // Map snake_case to camelCase
					userId: c.user_id,
					displayName: c.display_name,
					timestamp: c.timestamp.getTime(), // Convert Date to ms
					isRootComment: c.is_root_comment,
					parentCommentId: c.parent_comment_id,
				});
			} else {
				console.warn(
					`[Polling Service] Skipping comment ${c.id} due to missing/invalid fields or non-Date timestamp.`,
				);
				// Log the problematic object for debugging
				console.warn(
					"[Polling Service] Problematic comment data:",
					JSON.stringify(c),
				);
			}
		});

		// --- Perform Typesense Operations ---
		let success = true;

		// Upsert Suggestions
		if (suggestionsToUpsert.length > 0) {
			console.log(
				`[Polling Service] Upserting ${suggestionsToUpsert.length} suggestions...`,
			);
			try {
				const results: ImportResponse[] = await typesenseClient
					.collections<TypesenseSuggestion>(suggestionsCollectionName)
					.documents()
					.import(suggestionsToUpsert, { action: "upsert", batch_size: 100 });

				const failedItems = results.filter((r) => !r.success);
				if (failedItems.length > 0) {
					console.error(
						`[Polling Service] Failed to upsert ${failedItems.length} suggestions. Errors:`,
					);
					failedItems.forEach((item) =>
						console.error(
							` - Doc ID (approx based on order): ${item.document?.id ?? "unknown"}, Error: ${item.error}`,
						),
					);
					success = false;
				} else {
					console.log(
						`[Polling Service] Successfully upserted ${suggestionsToUpsert.length} suggestions.`,
					);
				}
			} catch (error) {
				// Log the specific Typesense error object
				console.error(
					"[Polling Service] Error during suggestion import API call:",
					error,
				);
				success = false;
			}
		}

		// Delete Suggestions
		if (suggestionIdsToDelete.length > 0) {
			console.log(
				`[Polling Service] Deleting ${suggestionIdsToDelete.length} suggestions...`,
			);
			try {
				// Ensure IDs are valid strings before joining
				const validIds = suggestionIdsToDelete.filter(
					(id) => typeof id === "string" && id.length > 0,
				);
				if (validIds.length > 0) {
					await typesenseClient
						.collections(suggestionsCollectionName)
						.documents()
						.delete({ filter_by: `id:=[${validIds.join(",")}]` });
					console.log(
						`[Polling Service] Successfully issued delete for ${validIds.length} suggestions.`,
					);
				} else if (suggestionIdsToDelete.length > 0) {
					console.warn(
						`[Polling Service] Found ${suggestionIdsToDelete.length} invalid IDs for deletion, skipping delete operation.`,
					);
				}
			} catch (error) {
				console.error("[Polling Service] Error deleting suggestions:", error);
				success = false;
			}
		}

		// Upsert Comments
		if (commentsToUpsert.length > 0) {
			console.log(
				`[Polling Service] Upserting ${commentsToUpsert.length} comments...`,
			);
			try {
				const results: ImportResponse[] = await typesenseClient
					.collections<TypesenseComment>(commentsCollectionName)
					.documents()
					.import(commentsToUpsert, { action: "upsert", batch_size: 100 });

				const failedItems = results.filter((r) => !r.success);
				if (failedItems.length > 0) {
					console.error(
						`[Polling Service] Failed to upsert ${failedItems.length} comments. Errors:`,
					);
					failedItems.forEach((item) =>
						console.error(
							` - Doc ID (approx based on order): ${item.document?.id ?? "unknown"}, Error: ${item.error}`,
						),
					);
					success = false;
				} else {
					console.log(
						`[Polling Service] Successfully upserted ${commentsToUpsert.length} comments.`,
					);
				}
			} catch (error) {
				// Log the specific Typesense error object
				console.error(
					"[Polling Service] Error during comment import API call:",
					error,
				);
				success = false;
			}
		}

		// Delete Comments (if applicable)
		// if (commentIdsToDelete.length > 0) { ... delete logic ... }

		// --- Update Last Sync Timestamp ---
		if (success) {
			lastSyncTimestamp = currentSyncStartTime; // Use the JS ms timestamp
		} else {
			console.warn(
				`[Polling Service] Sync cycle finished with errors. Last sync time NOT updated (${lastSyncTimestamp}). Will retry changes in next cycle.`,
			);
		}
	} catch (error) {
		console.error(
			"[Polling Service] Unhandled error during sync cycle:",
			error,
		);
	} finally {
		isSyncing = false;
	}
}

// --- Start Polling ---
async function start() {
	console.log("[Polling Service] Starting...");
	if (!typesenseClient) {
		console.error(
			"[Polling Service] Cannot start polling, Typesense client failed to initialize.",
		);
		return;
	}

	await ensureTypesenseCollections();
	await syncChanges();
	setInterval(syncChanges, POLLING_INTERVAL);

	console.log(
		`[Polling Service] Service started. Polling interval: ${POLLING_INTERVAL}ms`,
	);
}

start();
