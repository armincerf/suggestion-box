import { useZero } from "../../zero/ZeroContext";
import { createLogger } from "../../hyperdx-logger";
import { useUser } from "../data/useUser";
import type { ReactionEntityType } from "../../../shared/zero/schema";
import { v4 as uuidv4 } from "uuid";

const logger = createLogger("suggestion-box:reactionMutations");

/**
 * Hook to add a reaction to an entity
 * @returns A function to add a reaction with improved error reporting
 */
export function useAddReaction() {
	const z = useZero();
	const { userId } = useUser();

	return async (entityId: string, entityType: ReactionEntityType, emoji: string) => {
		if (!userId) {
			logger.warn("Attempted to add reaction without a user ID");
			return {
				success: false,
				error: new Error("User ID not available"),
			};
		}

		try {
			const reactionId = uuidv4();
			const baseReaction = {
				id: reactionId,
				userId,
				emoji,
				timestamp: Date.now(),
			} as const;

			if (entityType === 'suggestion') {
				await z.mutate.reactions.insert({
					...baseReaction,
					suggestionId: entityId,
					commentId: null,
				});
			} else {
				await z.mutate.reactions.insert({
					...baseReaction,
					suggestionId: null,
					commentId: entityId,
				});
			}

			logger.info("Reaction added", {
				reactionId,
				userId,
				entityId,
				emoji,
			});
			return { success: true, data: reactionId };
		} catch (error) {
			logger.error("Failed to add reaction", { error, userId, entityId, emoji });
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};
} 