import { ErrorBoundary, Suspense } from "solid-js";
import { ErrorFallback } from "./ErrorFallback";
import { COMMON_EMOJIS } from "../utils/constants";
import { Index } from "solid-js";
import type { Suggestion, Comment } from "../schema";
import { randID } from "../rand";
import { useZero } from "../context/ZeroContext";

function ReactionButton(props: {
	emoji: string;
	count: number;
	isReacted: boolean;
	onToggle: (emoji: string) => Promise<void>;
}) {
	const handleClick = () => props.onToggle(props.emoji);

	return (
		<button
			type="button"
			class={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
				props.isReacted
					? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100"
					: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
			}`}
			onClick={handleClick}
			aria-label={`${props.emoji} reaction (${props.count})`}
			aria-pressed={props.isReacted}
		>
			<span aria-hidden="true" class="mr-1">
				{props.emoji}
			</span>
			<span>{props.count}</span>
		</button>
	);
}

export function ReactionButtons(props: {
	entity: Suggestion | Comment;
}) {
	const z = useZero();
	const entity = () => props.entity;
	const toggleReaction = async (emoji: string) => {
		const existingReactionId = entity().reactions?.find(
			(r) => r.emoji === emoji && r.userId === z.userID,
		)?.id;

		try {
			if (existingReactionId) {
				await z.mutate.reaction.delete({ id: existingReactionId });
			} else {
				// Type guard to check if entity is a Comment
				const isComment = (obj: Suggestion | Comment): obj is Comment =>
					"suggestionID" in obj;

				if (isComment(entity())) {
					// It's a comment
					await z.mutate.reaction.insert({
						id: randID(),
						emoji,
						userId: z.userID,
						timestamp: Date.now(),
						commentID: entity().id,
					});
				} else {
					// It's a suggestion
					await z.mutate.reaction.insert({
						id: randID(),
						emoji,
						userId: z.userID,
						timestamp: Date.now(),
						suggestionID: entity().id,
					});
				}
			}
		} catch (error) {
			console.error("Error toggling reaction:", error);
			throw error; // Re-throw to be caught by ErrorBoundary
		}
	};

	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="Failed to load reactions."
				/>
			)}
		>
			<Suspense
				fallback={
					<div class="flex gap-2 animate-pulse" aria-busy="true">
						<div class="h-6 w-10 bg-gray-200 rounded-full" />
						<div class="h-6 w-10 bg-gray-200 rounded-full" />
					</div>
				}
			>
				<div class="flex flex-wrap gap-2">
					<Index each={COMMON_EMOJIS}>
						{(emoji) => (
							<ReactionButton
								emoji={emoji()}
								count={
									entity().reactions?.filter((r) => r.emoji === emoji())
										.length || 0
								}
								isReacted={
									entity().reactions?.find(
										(r) => r.emoji === emoji() && r.userId === z.userID,
									) !== undefined
								}
								onToggle={toggleReaction}
							/>
						)}
					</Index>
				</div>
			</Suspense>
		</ErrorBoundary>
	);
}
