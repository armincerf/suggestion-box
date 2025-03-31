// src/utils/typesenseClient.ts

import Typesense from "typesense";

const host = import.meta.env.VITE_TYPESENSE_HOST;
const port = Number.parseInt(import.meta.env.VITE_TYPESENSE_PORT || "443", 10);
const protocol = import.meta.env.VITE_TYPESENSE_PROTOCOL || "https";
const apiKey = import.meta.env.VITE_TYPESENSE_SEARCH_ONLY_API_KEY;

export function getTypesenseClient() {
	if (host && apiKey) {
		try {
			const typesenseClient = new Typesense.Client({
				nodes: [{ host, port, protocol }],
				apiKey: apiKey,
				connectionTimeoutSeconds: 2, // Client-side search should be fast
				numRetries: 3,
				retryIntervalSeconds: 0.1,
			});
			console.log("[Typesense Client] Initialized for search.");
			return typesenseClient;
		} catch (error) {
			console.error("[Typesense Client] Failed to initialize:", error);
		}
	} else {
		console.warn(
			"[Typesense Client] Configuration missing (VITE_TYPESENSE_HOST, VITE_TYPESENSE_SEARCH_ONLY_API_KEY). Search disabled.",
		);
	}
}

// Export collection names for consistency
export const suggestionsCollection = import.meta.env
	.VITE_TYPESENSE_SUGGESTIONS_COLLECTION;
export const commentsCollection = import.meta.env
	.VITE_TYPESENSE_COMMENTS_COLLECTION;

if (!suggestionsCollection || !commentsCollection) {
	throw new Error(
		"[Typesense Client] Collection names not found in environment variables.",
	);
}
