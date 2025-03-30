// server/server-mutators.ts
import type { CustomMutatorDefs, Transaction } from "@rocicorp/zero/pg";
import type { Schema } from "../shared/zero/schema"; // Import from shared
import type { AuthData } from "../shared/zero/auth"; // Import from shared
import { createMutators } from "../shared/zero/mutators"; // Import the SHARED mutator definitions
import type {
	CreateSuggestionArgs,
	UpdateSuggestionArgs,
	AddCommentArgs,
	UpdateCommentArgs,
	Mutators,
} from "../shared/zero/mutators";
// Import Typesense functions
import {
	indexSuggestion,
	deleteSuggestionFromIndex,
	indexComment,
	deleteCommentFromIndex,
} from "./typesense";

// This type will be used for tasks like Typesense indexing later
export type PostCommitTask = () => Promise<void>;

export function createServerMutators(
	authData: AuthData | undefined,
	postCommitTasks: PostCommitTask[],
): CustomMutatorDefs<Schema, Mutators> {
	console.log(
		"Creating server-side mutators for user:",
		authData?.sub ?? "anonymous",
	);

	// Get the base mutators defined in shared/ (these include auth checks etc.)
	const baseMutators = createMutators(authData);

	// --- Wrap base mutators (or specific ones) if needed ---
	// For now, we can often just return the base mutators directly if no server-specific
	// logic (like adding postCommitTasks) is needed *yet* for a particular mutation.
	// However, to prepare for Step 4 (Typesense), let's establish the wrapping pattern.

	const wrappedSuggestionMutators = {
		async create(
			tx: Transaction<Schema>,
			args: CreateSuggestionArgs,
		): Promise<void> {
			console.log("[Server Mutator] suggestion.create invoked");
			await baseMutators.suggestion.create(tx, args);

			// Query based on other fields - less reliable if duplicates possible
			console.warn(
				"Suggestion ID not returned from base mutator, querying based on args - less reliable.",
			);

			// Only proceed with indexing if we have authData
			if (!authData || !authData.sub) {
				console.error(
					"[Server Mutator] Cannot query for new suggestion: authData.sub is missing",
				);
				return;
			}

			const newSuggestion = await tx.query.suggestions
				.where("userId", "=", authData.sub)
				.where("body", "=", args.body)
				.where("categoryId", "=", args.categoryId)
				.orderBy("timestamp", "desc") // Get the latest one matching
				.limit(1)
				.one()
				.run(); // Be careful, might grab wrong one if user submits identical fast

			if (newSuggestion) {
				console.log(
					"[Server Mutator] Found potential new suggestion by query, ID:",
					newSuggestion.id,
				);
				postCommitTasks.push(() => indexSuggestion(newSuggestion));
			} else {
				console.error(
					"[Server Mutator] Could not find newly created suggestion by query for indexing.",
				);
			}

			console.log("[Server Mutator] suggestion.create finished");
		},
		async customUpdate(
			tx: Transaction<Schema>,
			args: UpdateSuggestionArgs,
		): Promise<void> {
			console.log(
				"[Server Mutator] suggestion.update invoked for ID:",
				args.id,
			);
			await baseMutators.suggestion.customUpdate(tx, args);

			// Fetch the updated record
			const updatedSuggestion = await tx.query.suggestions
				.where("id", "=", args.id)
				.one()
				.run();
			// It might be null if the update somehow failed or ID was wrong, though baseMutator should throw
			if (updatedSuggestion) {
				postCommitTasks.push(() => indexSuggestion(updatedSuggestion));
				console.log(
					"[Server Mutator] Added index task for updated suggestion",
					args.id,
				);
			} else {
				console.error(
					"[Server Mutator] Could not find suggestion",
					args.id,
					"after update for indexing.",
				);
			}

			console.log("[Server Mutator] suggestion.update finished");
		},
		async remove(tx: Transaction<Schema>, suggestionId: string): Promise<void> {
			console.log(
				"[Server Mutator] suggestion.delete invoked for ID:",
				suggestionId,
			);
			await baseMutators.suggestion.remove(tx, suggestionId);

			// Delete from Typesense index
			postCommitTasks.push(() => deleteSuggestionFromIndex(suggestionId));
			console.log(
				"[Server Mutator] Added delete task for suggestion",
				suggestionId,
			);

			console.log("[Server Mutator] suggestion.delete finished");
		},
	};

	const wrappedCommentMutators = {
		async add(tx: Transaction<Schema>, args: AddCommentArgs): Promise<void> {
			console.log("[Server Mutator] comment.add invoked");
			await baseMutators.comment.add(tx, args);

			// Query for the new comment - again, assuming ID isn't returned
			console.warn(
				"Comment ID not returned from base mutator, querying based on args - less reliable.",
			);

			// Only proceed with indexing if we have authData
			if (!authData || !authData.sub) {
				console.error(
					"[Server Mutator] Cannot query for new comment: authData.sub is missing",
				);
				return;
			}

			const newComment = await tx.query.comments
				.where("userId", "=", authData.sub)
				.where("suggestionId", "=", args.suggestionId)
				.where("body", "=", args.body)
				.orderBy("timestamp", "desc")
				.limit(1)
				.one()
				.run();

			if (newComment) {
				console.log(
					"[Server Mutator] Found potential new comment by query, ID:",
					newComment.id,
				);
				postCommitTasks.push(() => indexComment(newComment));
			} else {
				console.error(
					"[Server Mutator] Could not find newly created comment by query for indexing.",
				);
			}

			console.log("[Server Mutator] comment.add finished");
		},
		async customUpdate(
			tx: Transaction<Schema>,
			args: UpdateCommentArgs,
		): Promise<void> {
			console.log("[Server Mutator] comment.update invoked for ID:", args.id);
			await baseMutators.comment.customUpdate(tx, args);

			const updatedComment = await tx.query.comments
				.where("id", "=", args.id)
				.one()
				.run();
			if (updatedComment) {
				postCommitTasks.push(() => indexComment(updatedComment));
				console.log(
					"[Server Mutator] Added index task for updated comment",
					args.id,
				);
			} else {
				console.error(
					"[Server Mutator] Could not find comment",
					args.id,
					"after update for indexing.",
				);
			}
			console.log("[Server Mutator] comment.update finished");
		},
		async remove(tx: Transaction<Schema>, commentId: string): Promise<void> {
			console.log("[Server Mutator] comment.delete invoked for ID:", commentId);
			await baseMutators.comment.remove(tx, commentId);

			// Delete from Typesense index
			postCommitTasks.push(() => deleteCommentFromIndex(commentId));
			console.log("[Server Mutator] Added delete task for comment", commentId);

			console.log("[Server Mutator] comment.delete finished");
		},
	};

	// Return the structure expected by PushProcessor, merging wrapped and base mutators
	return {
		...baseMutators, // Include all base mutators by default
		// Explicitly override the ones we wrapped
		suggestion: wrappedSuggestionMutators,
		comment: wrappedCommentMutators,
		// If you wrapped 'reactions', override it here too
		// reactions: wrappedReactionMutators,
	} as const satisfies CustomMutatorDefs<Schema, Mutators>; // Ensure type safety
}
