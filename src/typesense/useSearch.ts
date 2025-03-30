// src/hooks/useSearch.ts

import { createSignal, createEffect, on } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import {
	typesenseClient,
	suggestionsCollection,
	commentsCollection,
} from "./client";
import type {
	SearchResponse,
	SearchParams,
} from "typesense/lib/Typesense/Documents";

// Define the structure of a search result item (adapt as needed)
export interface SearchResultHit {
	id: string;
	type: "suggestion" | "comment"; // To distinguish results
	body: string;
	userId?: string;
	displayName?: string;
	timestamp?: number;
	// Suggestion specific
	categoryId?: string;
	// Comment specific
	suggestionId?: string;
	// Highlighting info (Typesense adds this)
	_highlight?: Partial<
		Record<keyof SearchResultHit, { snippet?: string; snippets?: string[] }>
	>;
	// Add other fields you include in search results
}

export interface SearchState {
	query: string;
	searchSuggestions: boolean;
	searchComments: boolean;
	useSemantic: boolean; // True = Hybrid, False = Keyword Only
	isLoading: boolean;
	results: SearchResultHit[];
	error: string | null;
}

export function useSearch() {
	const [query, setQuery] = createSignal("");
	const [searchSuggestions, setSearchSuggestions] = createSignal(true);
	const [searchComments, setSearchComments] = createSignal(false);
	const [useSemantic, setUseSemantic] = createSignal(true); // Default to Hybrid search
	const [isLoading, setIsLoading] = createSignal(false);
	const [results, setResults] = createSignal<SearchResultHit[]>([]);
	const [error, setError] = createSignal<string | null>(null);

	const performSearch = async () => {
		if (!typesenseClient) {
			setError("Typesense client not configured.");
			return;
		}

		const currentQuery = query().trim();
		// Don't search on empty query unless specifically desired
		if (!currentQuery) {
			setResults([]);
			setIsLoading(false);
			setError(null);
			return;
		}

		setIsLoading(true);
		setError(null);
		setResults([]); // Clear previous results

		const collectionsToSearch: { collection: string; params: SearchParams }[] =
			[];

		// --- Build Base Search Params ---
		const baseSearchParams: SearchParams = {
			q: currentQuery,
			query_by: useSemantic()
				? "body,embedding,displayName" // Hybrid: Search body, embedding, and displayName
				: "body,displayName", // Keyword only: Search body and displayName
			// Adjust query_by_weights if needed, e.g., query_by_weights: '10,1,5'
			include_fields:
				"id,body,userId,displayName,timestamp,categoryId,suggestionId", // Fields to return
			highlight_full_fields: "body,displayName", // Fields to get highlights for
			highlight_start_tag: "<mark>", // Default highlight tags
			highlight_end_tag: "</mark>",
			num_typos: 2, // Allow typos (adjust as needed)
			limit: 10, // Max results per collection type
			// vector_query: useSemantic() ? 'embedding:([], k: 50)' : undefined, // Optional: Ground vector search if needed for pagination stability
		};

		// --- Add Collections to Multi-Search ---
		if (searchSuggestions()) {
			collectionsToSearch.push({
				collection: suggestionsCollection,
				params: { ...baseSearchParams },
			});
		}
		if (searchComments()) {
			collectionsToSearch.push({
				collection: commentsCollection,
				// You might want slightly different params for comments, e.g., different query_by
				params: { ...baseSearchParams },
			});
		}

		if (collectionsToSearch.length === 0) {
			setIsLoading(false);
			return; // Nothing to search
		}

		// --- Execute Search ---
		try {
			console.log(
				"[useSearch] Performing search:",
				JSON.stringify(collectionsToSearch),
			);
			const multiSearchResult = await typesenseClient.multiSearch.perform(
				{ searches: collectionsToSearch },
				{},
			);
			console.log("[useSearch] Received results:", multiSearchResult);

			const combinedHits: SearchResultHit[] = [];
			multiSearchResult.results?.forEach((resultSet, index) => {
				const collectionName = collectionsToSearch[index]?.collection;
				resultSet.hits?.forEach((hit) => {
					const doc = hit.document as any; // Cast as any initially
					combinedHits.push({
						id: doc.id,
						type:
							collectionName === suggestionsCollection
								? "suggestion"
								: "comment",
						body: doc.body,
						userId: doc.userId,
						displayName: doc.displayName,
						timestamp: doc.timestamp,
						categoryId: doc.categoryId,
						suggestionId: doc.suggestionId,
						_highlight: hit.highlights?.reduce(
							(acc, h) => {
								// Process highlights properly
								acc[h.field as keyof SearchResultHit] = {
									snippet: h.snippet || h.snippets?.join("..."),
								};
								return acc;
							},
							{} as SearchResultHit["_highlight"],
						),
					});
				});
			});

			// TODO: Consider sorting/ranking combined hits if needed,
			// though multi-search doesn't provide a single unified score easily.
			// Simple concatenation is often sufficient for command palettes.
			setResults(combinedHits);
		} catch (err) {
			console.error("[useSearch] Search failed:", err);
			setError(
				err instanceof Error
					? err.message
					: "An unknown search error occurred.",
			);
			setResults([]);
		} finally {
			setIsLoading(false);
		}
	};

	// Debounce the search function
	const debouncedSearch = debounce(performSearch, 300); // Adjust debounce time (ms)

	// Trigger search when query or config changes
	createEffect(
		on([query, searchSuggestions, searchComments, useSemantic], () => {
			// Don't trigger on initial load if query is empty
			if (query() !== "" || results().length > 0) {
				debouncedSearch();
			} else {
				// Clear results if query becomes empty
				setResults([]);
				setIsLoading(false);
				setError(null);
			}
		}),
	);

	// Expose state and setters
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
		performSearch: debouncedSearch, // Expose debounced version
		forceSearch: performSearch, // Expose immediate version if needed
	};
}
