import {
	type Accessor,
	ErrorBoundary,
	Suspense,
	createEffect,
	createMemo,
	For,
} from "solid-js";
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
	readOnly?: boolean;
}) {
	const handleClick = () => {
		if (!props.readOnly) {
			props.onToggle(props.emoji);
		}
	};

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
			disabled={props.readOnly}
		>
			<span aria-hidden="true" class="mr-1">
				{props.emoji}
			</span>
			<span>{props.count}</span>
		</button>
	);
}

export function ReactionButtons(props: {
	entity: Accessor<Suggestion | Comment>;
	readOnly?: boolean;
}) {
	const z = useZero();
	const entity = () => props.entity();

	const reactionSummary = createMemo(() => {
		const summary: Record<string, { count: number; isReacted: boolean }> = {};
		const reactions = entity().reactions || [];
		const currentUserId = z.userID;

		for (const emoji of COMMON_EMOJIS) {
			summary[emoji] = { count: 0, isReacted: false };
		}

		for (const reaction of reactions) {
			if (summary[reaction.emoji]) {
				summary[reaction.emoji].count++;
				if (reaction.userId === currentUserId) {
					summary[reaction.emoji].isReacted = true;
				}
			}
		}

		return summary;
	});

	const emojiData = createMemo(() => {
		const summary = reactionSummary();
		return COMMON_EMOJIS.map(emoji => ({
			emoji,
			count: summary[emoji].count,
			isReacted: summary[emoji].isReacted
		}));
	});
	
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
					<For each={emojiData()}>
						{(item) => (
							<ReactionButton
								emoji={item.emoji}
								count={item.count}
								isReacted={item.isReacted}
								onToggle={toggleReaction}
								readOnly={props.readOnly ?? false}
							/>
						)}
					</For>
				</div>
			</Suspense>
		</ErrorBoundary>
	);
}
