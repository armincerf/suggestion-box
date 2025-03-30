import { type TZero, useZero } from "../../zero/ZeroContext";
import { v4 as uuidv4 } from "uuid";

/**
 * Type for mutation results with error handling
 */
export type MutationResult<T> =
	| { success: true; data: T }
	| { success: false; error: Error };

/**
 * Hook to perform a soft delete on a suggestion by setting the deletedAt timestamp
 * @param onSuccess Optional callback function when the soft delete is successful
 * @returns A function to soft delete a suggestion with improved error reporting
 */
export function useDeleteSuggestion(onSuccess?: (suggestionId: string) => void) {
	const z = useZero();

	return async (suggestionId: string): Promise<MutationResult<boolean>> => {
		try {
			// Use UPDATE (not delete) to set deletedAt for soft delete
			await z.mutate.suggestions.update({
				id: suggestionId,
				deletedAt: Date.now(), // Set the deletedAt timestamp
			});
			
			onSuccess?.(suggestionId);
			return { success: true, data: true }; // Indicate success
		} catch (error) {
			console.error("Failed to soft delete suggestion:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error))
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

	return async (
		suggestionId: string,
		body: string,
		categoryId: string,
	): Promise<MutationResult<string>> => {
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
			console.error("Failed to update suggestion:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	};
}

/**
 * Hook to create a new suggestion
 * @param onSuccess Optional callback function when creation is successful
 * @returns A function to create a suggestion with improved error reporting
 */
export function useCreateSuggestion(
	onSuccess?: (suggestionId: string) => void,
) {
	const z = useZero();

	return async (
		body: string,
		userId: string,
		displayName: string,
		categoryId: string,
	): Promise<MutationResult<string>> => {
		try {
			const suggestionId = uuidv4();
			await z.mutate.suggestions.insert({
				id: suggestionId,
				body,
				userId,
				displayName,
				categoryId,
				timestamp: Date.now(),
				updatedAt: Date.now(),
			});

			onSuccess?.(suggestionId);
			return { success: true, data: suggestionId };
		} catch (error) {
			console.error("Failed to create suggestion:", error);
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

	return async (
		body: string,
		suggestionId: string,
		userId: string,
		displayName: string,
		parentCommentId: string | null = null,
		selectionStart: number | null = null,
		selectionEnd: number | null = null,
	): Promise<MutationResult<string>> => {
		try {
			const commentId = uuidv4();
			await z.mutate.comments.insert({
				id: commentId,
				body,
				suggestionId,
				selectionStart,
				selectionEnd,
				timestamp: Date.now(),
				userId,
				displayName,
				parentCommentId,
				isRootComment: !parentCommentId, // Root comments have no parent
			});
			
			onSuccess?.(commentId);
			return { success: true, data: commentId };
		} catch (error) {
			console.error("Failed to add comment:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error))
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

	return async (commentId: string): Promise<MutationResult<boolean>> => {
		try {
			await z.mutate.comments.update({
				id: commentId,
				deletedAt: Date.now(),
			});
			
			onSuccess?.();
			return { success: true, data: true };
		} catch (error) {
			console.error("Failed to delete comment:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error))
			};
		}
	};
}
