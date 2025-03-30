// src/utils/typesenseClient.ts

import Typesense from "typesense";

const host = import.meta.env.VITE_TYPESENSE_HOST;
const port = Number.parseInt(import.meta.env.VITE_TYPESENSE_PORT || "443", 10);
const protocol = import.meta.env.VITE_TYPESENSE_PROTOCOL || "https";
const apiKey = import.meta.env.VITE_TYPESENSE_SEARCH_ONLY_API_KEY;

let typesenseClient: Typesense.Client | null = null;

if (host && apiKey) {
	try {
		typesenseClient = new Typesense.Client({
			nodes: [{ host, port, protocol }],
			apiKey: apiKey,
			connectionTimeoutSeconds: 2, // Client-side search should be fast
			numRetries: 3,
			retryIntervalSeconds: 0.1,
		});
		console.log("[Typesense Client] Initialized for search.");
	} catch (error) {
		console.error("[Typesense Client] Failed to initialize:", error);
	}
} else {
	console.warn(
		"[Typesense Client] Configuration missing (VITE_TYPESENSE_HOST, VITE_TYPESENSE_SEARCH_ONLY_API_KEY). Search disabled.",
	);
}

// Export the potentially null client
export { typesenseClient };

// Export collection names for consistency
export const suggestionsCollection =
	import.meta.env.VITE_TYPESENSE_SUGGESTIONS_COLLECTION || "suggestions";
export const commentsCollection =
	import.meta.env.VITE_TYPESENSE_COMMENTS_COLLECTION || "comments";
