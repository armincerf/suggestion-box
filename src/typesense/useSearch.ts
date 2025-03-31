// src/hooks/useSearch.ts

import { createSignal, createEffect, on } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
// Ensure path to client is correct relative to this hook file
// This client should be initialized with the SEARCH-ONLY API key from .env
import {
	getTypesenseClient,
	suggestionsCollection, // e.g., "suggestion" from .env VITE_TYPESENSE_SUGGESTIONS_COLLECTION
	commentsCollection, // e.g., "comment" from .env VITE_TYPESENSE_COMMENTS_COLLECTION
} from "../typesense/client"; // Adjust path if needed
import type {
	// Import specific types for clarity and type safety
	MultiSearchRequestsSchema,
} from "typesense/lib/Typesense/MultiSearch";
import type { SearchParams } from "typesense/lib/Typesense/Documents";

// Structure for displaying results in the UI
export interface SearchResultHit {
	id: string;
	type: "suggestion" | "comment";
	body: string;
	userId?: string | null;
	displayName?: string | null;
	timestamp?: number | null; // Expecting epoch ms number from Typesense (int64)
	// Suggestion specific
	categoryId?: string | null;
	// Comment specific
	suggestionId?: string | null;
	// Highlighting info from Typesense
	_highlight?: Partial<
		// Map highlight fields back to SearchResultHit fields
		Record<
			keyof Omit<SearchResultHit, "type" | "_highlight" | "timestamp">,
			{ snippet?: string; snippets?: string[] }
		>
	> | null;
}

// Structure for the hook's state
export interface SearchState {
	query: () => string;
	searchSuggestions: () => boolean;
	searchComments: () => boolean;
	useSemantic: () => boolean; // True = Hybrid (Text + Vector), False = Text Only
	isLoading: () => boolean;
	results: () => SearchResultHit[];
	error: () => string | null;
}

// Define the return type of the hook explicitly for component usage
export interface UseSearchResult extends SearchState {
	setQuery: (q: string) => void;
	setSearchSuggestions: (s: boolean) => void;
	setSearchComments: (c: boolean) => void;
	setUseSemantic: (u: boolean) => void;
	performSearch: () => void; // Remove Promise<void> since debounce doesn't return a Promise
	forceSearch: () => Promise<void>; // This is an async function that returns a Promise
}

const typesenseClient = getTypesenseClient();
export function useSearch(): UseSearchResult {
	const [query, setQuery] = createSignal("");
	const [searchSuggestions, setSearchSuggestions] = createSignal(true);
	const [searchComments, setSearchComments] = createSignal(true); // Default search both
	const [useSemantic, setUseSemantic] = createSignal(true); // Default hybrid
	const [isLoading, setIsLoading] = createSignal(false);
	const [results, setResults] = createSignal<SearchResultHit[]>([]);
	const [error, setError] = createSignal<string | null>(null);

	const performSearch = async () => {
		// Check if client was properly initialized (might be null if config was missing)
		if (!typesenseClient) {
			const errMsg =
				"Typesense client is not configured or available. Check environment variables (VITE_TYPESENSE_*) and client initialization.";
			setError(errMsg);
			console.error("[useSearch]", errMsg);
			setIsLoading(false); // Ensure loading state is reset
			return;
		}

		const currentQuery = query().trim();
		// Don't search on empty query
		if (!currentQuery) {
			setResults([]);
			setIsLoading(false);
			setError(null);
			return;
		}

		setIsLoading(true);
		setError(null); // Clear previous errors before new search
		// Clear previous results immediately for better UX
		// setResults([]); // Clearing results here might cause flickering, clear on success/error instead

		// --- Prepare multi-search request payload ---
		const searches: MultiSearchRequestsSchema["searches"] = [];
		const isSemantic = useSemantic();

		// Base parameters common to most searches
		// Specifics like query_by, include_fields, vector_query are set per-collection
		const baseSearchParams: Omit<
			SearchParams,
			"q" | "query_by" | "include_fields" | "vector_query"
		> = {
			highlight_full_fields: "body,displayName",
			highlight_start_tag: "<mark>",
			highlight_end_tag: "</mark>",
			num_typos: 2, // Allow typos
			limit: 10, // Max results per collection type
		};

		// --- Suggestion Search ---
		if (searchSuggestions()) {
			const suggestionQueryBy = isSemantic
				? "body,embedding,displayName"
				: "body,displayName";
			const suggestionVectorParam = isSemantic
				? { vector_query: "embedding:([], k: 10)" }
				: {}; // k=neighbours
			const suggestionIncludeFields =
				"id,body,userId,displayName,timestamp,categoryId"; // Fields existing in suggestion schema

			searches.push({
				collection: suggestionsCollection, // Use name from imported client config
				...baseSearchParams,
				q: currentQuery, // Query text
				query_by: suggestionQueryBy,
				include_fields: suggestionIncludeFields,
				...suggestionVectorParam, // Add vector params if semantic
			});
		}

		// --- Comment Search ---
		if (searchComments()) {
			// Assuming comments collection also has 'embedding' field if semantic enabled
			const commentQueryBy = isSemantic
				? "body,embedding,displayName"
				: "body,displayName";
			const commentVectorParam = isSemantic
				? { vector_query: "embedding:([], k: 10)" }
				: {};
			// Fields existing in comment schema (note: includes suggestionId)
			const commentIncludeFields =
				"id,body,userId,displayName,timestamp,suggestionId";

			searches.push({
				collection: commentsCollection, // Use name from imported client config
				...baseSearchParams,
				q: currentQuery, // Query text
				query_by: commentQueryBy,
				include_fields: commentIncludeFields,
				...commentVectorParam,
			});
		}

		// If no collections are selected to search, stop
		if (searches.length === 0) {
			setIsLoading(false);
			setResults([]); // Clear results if nothing was searched
			return;
		}

		// --- Execute Typesense API Call ---
		try {
			console.log(
				"[useSearch] Performing search with payload:",
				JSON.stringify({ searches }, null, 2),
			);

			// Use any type to bypass complex type issues with Typesense types
			// We're using any here because the Typesense types are complex and would require
			// extensive custom type definitions to work correctly with our multi-search implementation
			const multiSearchResult = await typesenseClient.multiSearch.perform(
				{ searches }, // The main payload
				{}, // Common search params - leave empty as we defined per search
			);

			console.log("[useSearch] Received results:", multiSearchResult);

			// --- Process Successful Results ---
			const combinedHits: SearchResultHit[] = [];
			let partialErrorOccurred = false;

			// Safely process the search results
			if (
				multiSearchResult?.results &&
				Array.isArray(multiSearchResult.results)
			) {
				multiSearchResult.results.forEach(
					(resultSet: unknown, index: number) => {
						const collectionName = searches[index]?.collection;

						const typedResultSet = resultSet;

						// Check for errors within this specific search result set
						if (
							typeof typedResultSet === "object" &&
							typedResultSet !== null &&
							"error" in typedResultSet &&
							typedResultSet.error
						) {
							console.error(
								`[useSearch] Error in search for ${collectionName}: ${typedResultSet.error}`,
							);
							setError(
								(prev) =>
									`${prev ? `${prev}\n` : ""}Error in ${collectionName}: ${typedResultSet.error}`,
							);
							partialErrorOccurred = true;
							return; // Skip processing hits for this failed part of the multi-search
						}

						// Process hits if they exist and are in an array
						if (
							typeof typedResultSet === "object" &&
							typedResultSet !== null &&
							"hits" in typedResultSet &&
							Array.isArray(typedResultSet.hits)
						) {
							typedResultSet.hits.forEach((hit: unknown) => {
								if (
									typeof hit === "object" &&
									hit !== null &&
									"document" in hit &&
									!hit?.document
								) {
									return; // Skip if document data is missing
								}

								// @ts-expect-error
								const doc = hit.document;
								// @ts-expect-error
								const highlights = hit.highlights || [];

								// Build highlight object
								const highlight: SearchResultHit["_highlight"] = {};
								highlights.forEach(
									(h: {
										field: string;
										snippet: string;
										snippets: string[];
									}) => {
										if (h?.field) {
											// Use string index access with type assertion
											// @ts-expect-error
											highlight[h.field] = {
												// Use optional chaining for accessing snippets
												snippet: h.snippet || h.snippets?.join("..."),
											};
										}
									},
								);

								combinedHits.push({
									id: String(doc.id || ""),
									type:
										collectionName === suggestionsCollection
											? "suggestion"
											: "comment",
									body: String(doc.body || ""),
									userId: doc.userId ? String(doc.userId) : null,
									displayName: doc.displayName ? String(doc.displayName) : null,
									timestamp:
										typeof doc.timestamp === "number" ? doc.timestamp : null,
									// Add collection-specific fields
									...(collectionName === suggestionsCollection && {
										categoryId: doc.categoryId ? String(doc.categoryId) : null,
									}),
									...(collectionName === commentsCollection && {
										suggestionId: doc.suggestionId
											? String(doc.suggestionId)
											: null,
									}),
									// Add highlight data if available
									_highlight:
										Object.keys(highlight).length > 0 ? highlight : null,
								});
							});
						}
					},
				);
			}

			setResults(combinedHits);
			// If the overall call succeeded but some individual searches failed, the error state will reflect that
			// If call succeeded and no partial errors, ensure error state is clear
			if (!partialErrorOccurred) {
				setError(null);
			}
		} catch (err) {
			// Catch errors from the overall multiSearch API call (e.g., network, auth)
			console.error("[useSearch] API call failed:", err);
			let errorMessage = "Search request failed.";
			if (typeof err === "object" && err !== null) {
				if ("message" in err) {
					errorMessage = String(err.message);
				}
				if ("httpStatus" in err) {
					errorMessage = `Typesense error (HTTP ${err.httpStatus}): ${errorMessage}`;
				}
				// Log the full error for detailed debugging in console
				console.error("Full API call error object:", err);
			}
			setError(errorMessage);
			setResults([]); // Clear results on major failure
		} finally {
			setIsLoading(false); // Ensure loading state is always turned off
		}
	};

	// Debounce the search function to limit API calls during typing
	const debouncedSearch = debounce(performSearch, 300); // 300ms delay

	// Effect to trigger search automatically when relevant state changes
	createEffect(
		on([query, searchSuggestions, searchComments, useSemantic], () => {
			// Only trigger search if query is non-empty
			if (query()) {
				debouncedSearch();
			} else {
				// Clear results instantly if query becomes empty
				setResults([]);
				setIsLoading(false);
				setError(null);
			}
		}),
	);

	// Return the state signals and control functions
	return {
		query,
		setQuery,
		searchSuggestions,
		setSearchSuggestions,
		searchComments,
		setSearchComments,
		useSemantic,
		setUseSemantic,
		isLoading,
		results,
		error,
		performSearch: debouncedSearch, // For manual trigger if needed (debounced)
		forceSearch: performSearch, // For manual trigger if needed (immediate)
	};
}
