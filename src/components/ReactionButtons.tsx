import { ErrorBoundary, Suspense } from "solid-js";
import { ErrorFallback } from "./ErrorFallback";
import { COMMON_EMOJIS } from "../utils/constants";
import { Index } from "solid-js";
import type { Suggestion, Comment } from "../../shared/zero/schema";
import { useZero } from "../zero/ZeroContext";
import { createLogger } from "../hyperdx-logger";

const logger = createLogger("suggestion-box:ReactionButtons");

export function generateReactionId(entityId: string, userId: string) {
	return `${entityId}-${userId}`;
}

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
			(r) =>
				r.id === generateReactionId(entity().id, z.userID) && r.emoji === emoji,
		)?.id;

		try {
			if (existingReactionId) {
				await z.mutate.reactions.delete({ id: existingReactionId });
			} else {
				const baseReaction = {
					id: generateReactionId(entity().id, z.userID),
					emoji,
					userId: z.userID,
					timestamp: Date.now(),
				} as const;
				if ("isRootComment" in entity()) {
					await z.mutate.reactions.upsert({
						...baseReaction,
						commentId: entity().id,
					});
				} else {
					await z.mutate.reactions.upsert({
						...baseReaction,
						suggestionId: entity().id,
					});
				}
			}
		} catch (error) {
			logger.error("Error toggling reaction:", error);
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
