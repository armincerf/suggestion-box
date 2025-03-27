import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";
import { createMemo } from "solid-js";
import { useSearchParams } from "@solidjs/router";

export type SortOption = "thumbsUp" | "thumbsDown" | "newest" | "oldest";

// Helper function to calculate suggestion rating
function calculateRating(emojis: string[]) {
	const thumbsUp = emojis.filter((e) => e === "👍").length;
	const thumbsDown = emojis.filter((e) => e === "👎").length;
	return thumbsUp - thumbsDown;
}

export function useSuggestions(skipFilters?: boolean) {
	const z = useZero();
	const [searchParams] = useSearchParams();
	
	const userIds = () => {
		const ids = searchParams.userId;
		
		
		if (!ids) return [];
		
		const result = Array.isArray(ids) ? ids : [ids];
		return result;
	};
	
	const sort = () => searchParams.sort as SortOption | undefined;

	// Create a reactive query based on search params
	const query = createMemo(() => {
		let q = z.query.suggestions
			.orderBy("timestamp", "desc")
			.where("deletedAt", "IS", null)
			.related("comments", (comments) => comments.related("reactions"))
			.related("reactions");

		console.log("Building query, skipFilters =", skipFilters);
		
		// Filter by multiple userIds if provided, unless skipFilters is true
		if (!skipFilters) {
			const selectedUserIds = userIds();
			console.log("Selected user IDs for filtering:", selectedUserIds);
			
			if (selectedUserIds.length === 1) {
				// Simple case: just one user
				console.log("Applying single-user filter for:", selectedUserIds[0]);
				q = q.where("userId", selectedUserIds[0]);
			} else if (selectedUserIds.length > 1) {
				// Multiple users: use a compound filter with OR
				console.log("Applying multi-user filter for:", selectedUserIds);
				q = q.where(({ cmp, or }) => {
					return or(...selectedUserIds.map(id => cmp("userId", id)));
				});
			} else {
				console.log("No user filters applied");
			}
		} else {
			console.log("Skipping user filters entirely");
		}

		if (sort() === "newest" || sort() === "oldest") {
			q = q.orderBy("timestamp", sort() === "oldest" ? "asc" : "desc");
		}

		return q;
	});

	const [suggestions, details] = useQuery(query, { ttl: "forever" });

	const sortedSuggestions = createMemo(() => {
		const currentSort = sort();
		const currentSuggestions = suggestions();

		if (!currentSuggestions) return [];

		if (currentSort === "thumbsUp" || currentSort === "thumbsDown") {
			return [...currentSuggestions].sort((a, b) => {
				const aRating = calculateRating(a.reactions?.map((r) => r.emoji) || []);
				const bRating = calculateRating(b.reactions?.map((r) => r.emoji) || []);

				return currentSort === "thumbsUp"
					? bRating - aRating
					: aRating - bRating;
			});
		}

		return currentSuggestions;
	});

	return [sortedSuggestions, details] as const;
}

// Reactive hook for getting a suggestion's rating
export function useSuggestionRating(emojis: string[]) {
	return createMemo(() => calculateRating(emojis));
}
