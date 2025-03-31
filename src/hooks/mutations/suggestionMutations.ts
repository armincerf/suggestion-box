import { useZero } from "../../zero/ZeroContext";
import { createLogger } from "../../hyperdx-logger";
import { useUser } from "../data/useUser";

const logger = createLogger("suggestion-box:suggestionMutations");

/**
 * Hook to perform a soft delete on a suggestion by setting the deletedAt timestamp
 * @param onSuccess Optional callback function when the soft delete is successful
 * @returns A function to soft delete a suggestion with improved error reporting
 */
export function useDeleteSuggestion(
	onSuccess?: (suggestionId: string) => void,
) {
	const z = useZero();

	return async (suggestionId: string) => {
		try {
			await z.mutate.suggestions.delete({ id: suggestionId });

			onSuccess?.(suggestionId);
			return { success: true, data: true }; // Indicate success
		} catch (error) {
			logger.error("Failed to soft delete suggestion:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};
}

/**
 * Hook to edit an existing suggestion
 * @param onSuccess Optional callback function when update is successful
 * @returns A function to update a suggestion with improved error reporting
 */
export function useEditSuggestion(onSuccess?: (suggestionId: string) => void) {
	const z = useZero();

	return async (suggestionId: string, body: string, categoryId: string) => {
		try {
			await z.mutate.suggestions.update({
				id: suggestionId,
				body,
				categoryId,
				updatedAt: Date.now(),
			});

			onSuccess?.(suggestionId);
			return { success: true, data: suggestionId };
		} catch (error) {
			logger.error("Failed to update suggestion:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};
}

/**
 * Hook to create a new suggestion
 * @returns A function to create a suggestion with improved error reporting
 */
export function useCreateSuggestion() {
	const z = useZero();
	const { user } = useUser();

	return async (body: string, categoryId: string) => {
		try {
			const u = user();
			if (!u) return;
			const suggestionId = await z.mutate.suggestions.insert({
				id: crypto.randomUUID(),
				body,
				categoryId,
				userId: u.id,
				displayName: u.displayName,
				timestamp: Date.now(),
				updatedAt: Date.now(),
			});

			return { success: true, data: suggestionId };
		} catch (error) {
			logger.error("Failed to create suggestion:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};
}

/**
 * Hook to add a comment to a suggestion
 * @param onSuccess Optional callback function when comment creation is successful
 * @returns A function to create a comment with improved error reporting
 */
export function useAddComment(onSuccess?: (commentId: string) => void) {
	const z = useZero();
	const { user } = useUser();
	return async (
		body: string,
		suggestionId: string,
		parentCommentId: string | null = null,
		selectionStart: number | null = null,
		selectionEnd: number | null = null,
	) => {
		try {
			// Use custom comment add mutator
			// Note: userId and displayName are now handled by the mutator using authData
			const u = user();
			if (!u) return;
			await z.mutate.comments.insert({
				id: crypto.randomUUID(),
				body,
				suggestionId,
				parentCommentId,
				selectionStart,
				selectionEnd,
				userId: u.id,
				displayName: u.displayName,
				timestamp: Date.now(),
				updatedAt: Date.now(),
			});

			// Same issue as with suggestions - no ID returned
			const placeholderId = "created";
			onSuccess?.(placeholderId);
			return { success: true, data: placeholderId };
		} catch (error) {
			logger.error("Failed to add comment:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};
}

/**
 * Hook to delete a comment (soft delete by setting deletedAt)
 * @param onSuccess Optional callback function when deletion is successful
 * @returns A function to delete a comment with improved error reporting
 */
export function useDeleteComment(onSuccess?: () => void) {
	const z = useZero();

	return async (commentId: string) => {
		try {
			// Use custom comment delete mutator
			await z.mutate.comments.delete({ id: commentId });

			onSuccess?.();
			return { success: true, data: true };
		} catch (error) {
			logger.error("Failed to delete comment:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};
}
