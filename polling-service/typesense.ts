// polling-service/typesense.ts
import Typesense from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" }); // Load .env from parent directory

console.log("TYPESENSE_HOST", process.env.TYPESENSE_HOST);

// --- Configuration ---
const host = process.env.TYPESENSE_HOST;
const port = Number.parseInt(process.env.TYPESENSE_PORT || "443", 10);
const protocol = process.env.TYPESENSE_PROTOCOL || "https";
const apiKey = process.env.TYPESENSE_API_KEY; // Use ADMIN key

export const suggestionsCollectionName =
	process.env.VITE_TYPESENSE_SUGGESTIONS_COLLECTION;
export const commentsCollectionName =
	process.env.VITE_TYPESENSE_COMMENTS_COLLECTION;

if (!suggestionsCollectionName || !commentsCollectionName) {
	throw new Error(
		"[Polling Service] Typesense environment variables (TYPESENSE_SUGGESTIONS_COLLECTION, TYPESENSE_COMMENTS_COLLECTION) are not fully configured. Indexing will be disabled.",
	);
}

if (!host || !apiKey) {
	console.warn(
		"[Polling Service] Typesense environment variables (TYPESENSE_HOST, TYPESENSE_ADMIN_API_KEY) are not fully configured. Indexing will be disabled.",
	);
}

// --- Initialize Client ---
export const typesenseClient =
	host && apiKey
		? new Typesense.Client({
				nodes: [{ host, port, protocol }],
				apiKey: apiKey, // Use ADMIN key
				connectionTimeoutSeconds: 10, // Longer timeout for indexing operations
				numRetries: 3,
				retryIntervalSeconds: 2,
			})
		: null;

if (typesenseClient) {
	console.log(
		`[Polling Service] Typesense client initialized for host: ${host}`,
	);
} else {
	console.error(
		"[Polling Service] Failed to initialize Typesense client. Check config.",
	);
	// Optionally exit if Typesense is critical
	// process.exit(1);
}

// --- Define Typesense Schemas (Copy/Adapt from server/typesense.ts) ---
// Make sure these match the schemas used by your server-mutators or expected structure
const suggestionCollectionSchema: CollectionCreateSchema = {
	name: suggestionsCollectionName, // Use variable
	fields: [
		// --- Fields needed for searching/filtering/sorting ---
		{ name: "id", type: "string", index: true },
		{ name: "body", type: "string", index: true }, // Keyword search
		{ name: "userId", type: "string", facet: true, index: true },
		{ name: "displayName", type: "string", optional: true, index: true },
		{ name: "categoryId", type: "string", facet: true, index: true },
		{ name: "timestamp", type: "int64", sort: true },
		{ name: "updatedAt", type: "int64", sort: true, optional: true }, // Important for polling

		// --- Embedding Field (if using semantic search) ---
		// Ensure the model matches what you intend to use
		{
			name: "embedding",
			type: "float[]",
			embed: {
				from: ["body", "displayName"], // Fields to embed
				model_config: { model_name: "ts/all-MiniLM-L12-v2" },
			},
			optional: true, // Make optional if not all docs need embedding immediately
		},
	],
	default_sorting_field: "timestamp",
};

const commentCollectionSchema: CollectionCreateSchema = {
	name: commentsCollectionName, // Use variable
	fields: [
		{ name: "id", type: "string", index: true },
		{ name: "body", type: "string", index: true }, // Keyword search
		{ name: "suggestionId", type: "string", facet: true, index: true },
		{ name: "userId", type: "string", facet: true, index: true },
		{ name: "displayName", type: "string", optional: true, index: true },
		{ name: "timestamp", type: "int64", sort: true },
		{ name: "isRootComment", type: "bool", facet: true, index: true },
		{ name: "parentCommentId", type: "string", optional: true, index: true },
		// { name: 'updatedAt', type: 'int64', sort: true }, // Add if comments have updatedAt

		// --- Embedding Field (if using semantic search) ---
		{
			name: "embedding",
			type: "float[]",
			embed: {
				from: ["body", "displayName"], // Fields to embed
				model_config: { model_name: "ts/all-MiniLM-L12-v2" },
			},
			optional: true,
		},
	],
	default_sorting_field: "timestamp",
};

export async function ensureTypesenseCollections(): Promise<void> {
	if (!typesenseClient) return;

	const schemasToEnsure = [suggestionCollectionSchema, commentCollectionSchema];
	console.log("[Polling Service] Ensuring Typesense collections exist...");

	for (const schema of schemasToEnsure) {
		try {
			await typesenseClient.collections(schema.name).retrieve();
			console.log(
				`[Polling Service] Collection "${schema.name}" already exists.`,
			);
		} catch (error: unknown) {
			let isNotFoundError = false;
			let statusCode: number | undefined;

			if (typeof error === "object" && error !== null) {
				// Standard typesense-js error structure
				if ("httpStatus" in error && typeof error.httpStatus === "number") {
					statusCode = error.httpStatus;
				}
				// Fallback for other potential HTTP error structures
				else if ("status" in error && typeof error.status === "number") {
					statusCode = error.status;
				}
				// Check message if status code isn't found directly
				else if (error instanceof Error && error.message.includes("404")) {
					// Less reliable, but a fallback
					statusCode = 404;
				}

				if (statusCode === 404) {
					isNotFoundError = true;
				}
			}
			if (isNotFoundError) {
				console.log(
					`[Polling Service] Collection "${schema.name}" not found, creating...`,
				);
				try {
					await typesenseClient.collections().create(schema);
					console.log(
						`[Polling Service] Collection "${schema.name}" created successfully.`,
					);
				} catch (createError: unknown) {
					console.error(
						`[Polling Service] Failed to create collection "${schema.name}":`,
						createError,
					);
					// Depending on severity, you might want to exit
					// process.exit(1);
				}
			} else {
				console.error(
					`[Polling Service] Error retrieving collection "${schema.name}":`,
					error,
				);
				// Depending on severity, you might want to exit
				// process.exit(1);
			}
		}
	}
}
