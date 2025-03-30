import { useQuery } from "@rocicorp/zero/solid";
import { type TZero, useZero } from "../../zero/ZeroContext";
import { createMemo, type Accessor } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import type { Reaction } from "../../zero/schema";
import { QUERY_TTL_FOREVER } from "../../utils/constants";

export type SortOption = "thumbsUp" | "thumbsDown" | "newest" | "oldest";

function calculateRating(reactions: Readonly<Reaction[]> | undefined): number {
	if (!reactions || reactions.length === 0) return 0;

	return reactions.reduce((score, r) => {
		if (r.emoji === "👍") return score + 1;
		if (r.emoji === "👎") return score - 1;
		return score;
	}, 0);
}

export const suggestionsWithRelationsQuery = (z: TZero) =>
	z.query.suggestions
		.where("deletedAt", "IS", null)
		.related("comments", (comments) => comments.related("reactions"))
		.related("reactions");

export function useSuggestions(skipFilters?: boolean) {
	const z = useZero();
	const [searchParams] = useSearchParams();

	const userIds = createMemo(() => {
		const ids = searchParams.userId;
		if (!ids) return [];
		return Array.isArray(ids) ? ids : [ids];
	});

	const sort = createMemo(() => searchParams.sort as SortOption | undefined);

	const filteredQuery = createMemo(() => {
		let q = suggestionsWithRelationsQuery(z);
		const selectedUserIds = userIds();

		if (!skipFilters && selectedUserIds.length > 0) {
			q = q.where(({ cmp, or }) => {
				return or(...selectedUserIds.map((id) => cmp("userId", "=", id)));
			});
		}

		if (sort() === "newest" || sort() === "oldest") {
			q = q.orderBy("timestamp", sort() === "oldest" ? "asc" : "desc");
		} else {
			q = q.orderBy("timestamp", "desc");
		}

		return q;
	});

	const [suggestionsData, details] = useQuery(filteredQuery, {
		ttl: QUERY_TTL_FOREVER,
	});

	const sortedSuggestions = createMemo(() => {
		const currentSort = sort();
		const currentSuggestions = suggestionsData();

		if (!currentSuggestions) return [];

		if (currentSort === "thumbsUp" || currentSort === "thumbsDown") {
			const suggestionsCopy = [...currentSuggestions];
			return suggestionsCopy.sort((a, b) => {
				const aRating = calculateRating(a.reactions);
				const bRating = calculateRating(b.reactions);

				return currentSort === "thumbsUp"
					? bRating - aRating
					: aRating - bRating;
			});
		}

		return currentSuggestions;
	});

	return [sortedSuggestions, details] as const;
}

export const suggestionByIdQuery = (z: TZero, suggestionId: string) =>
	z.query.suggestions.where("id", "=", suggestionId).one();

export function useSuggestionById(suggestionId: string) {
	const z = useZero();
	return useQuery(() => suggestionByIdQuery(z, suggestionId), {
		ttl: QUERY_TTL_FOREVER,
	});
}

export function useSuggestionRating(
	reactions: Accessor<Readonly<Reaction[]> | undefined>,
) {
	return createMemo(() => calculateRating(reactions()));
}
