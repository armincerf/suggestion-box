import { createMemo } from "solid-js";
import type { Reaction } from "../schema";
import type { Schema } from "../schema";
import type { Zero } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";

export const reactionQuery = (z: Zero<Schema>) =>
	z.query.reaction.orderBy("timestamp", "desc");

export function useCommentReactions(props: {
	commentId: string;
	limit: number;
}) {
	const z = useZero();

	if (!z) {
		return { reactions: () => [] };
	}

	const [reactions] = useQuery(() =>
		reactionQuery(z).where("commentID", props.commentId).limit(props.limit),
	);

	return { reactions };
}

export function useSuggestionReactions(props: {
	suggestionId: string;
	limit: number;
}) {
	const z = useZero();

	const [reactions] = useQuery(() =>
		reactionQuery(z)
			.where("suggestionID", props.suggestionId)
			.limit(props.limit),
	);

	return { reactions };
}

/**
 * Custom hook for calculating reaction statistics from a list of reactions
 * @param reactions Function that returns a list of reactions
 * @param userIdentifier The current user's identifier
 * @returns Object containing reaction counts and user reactions
 */
export function useReactionStats(
	reactions: () => Reaction[],
	userIdentifier: string,
) {
	const reactionCounts = createMemo(() => {
		const counts: Record<string, number> = {};
		for (const r of reactions()) {
			counts[r.emoji] = (counts[r.emoji] || 0) + 1;
		}
		return counts;
	});

	const userReactions = createMemo(() => {
		const reacted: Record<string, boolean> = {};
		for (const r of reactions()) {
			if (r.userIdentifier === userIdentifier) {
				reacted[r.emoji] = true;
			}
		}
		return reacted;
	});

	return { reactionCounts, userReactions };
}
