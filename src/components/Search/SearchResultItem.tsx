// src/components/Search/SearchResultItem.tsx (new file)

import type { SearchResultHit } from "../../typesense/useSearch";
import { type Accessor, createMemo, Show } from "solid-js";
import { UserAvatar } from "../UserAvatar";
import { useRelativeTime } from "../../hooks/ui/useRelativeTime";
import MessageSquareIcon from "lucide-solid/icons/message-square";
import LightbulbIcon from "lucide-solid/icons/lightbulb";
import { cn } from "../../utils/cn";

interface SearchResultItemProps {
	hit: SearchResultHit;
	isActive: Accessor<boolean>; // Receive active state from parent
}

// Helper to safely render highlighted HTML
function HighlightedText(props: { text?: string }) {
	// Use innerHTML carefully. Assume Typesense <mark> tags are safe.
	return <span innerHTML={props.text || ""} />;
}

export function SearchResultItem(props: SearchResultItemProps) {
	const hit = () => props.hit;
	const timestamp = createMemo(() => hit().timestamp);
	const relativeTime = useRelativeTime(timestamp);
	const bodyHighlight = () => hit()._highlight?.body?.snippet || hit().body;
	const nameHighlight = () =>
		hit()._highlight?.displayName?.snippet || hit().displayName;

	// Component is now just responsible for rendering the item's content
	return (
		<div class="w-full">
			{/* Icon based on type */}
			<div
				class={cn(
					"flex-shrink-0 mt-1 float-left mr-2",
					"text-gray-500 dark:text-gray-400",
				)}
			>
				{hit().type === "suggestion" ? (
					<LightbulbIcon class="w-4 h-4" />
				) : (
					<MessageSquareIcon class="w-4 h-4" />
				)}
			</div>

			{/* Main Content */}
			<div class="flex-1 min-w-0">
				<div class="text-sm font-medium truncate">
					<HighlightedText text={bodyHighlight()} />
				</div>
				<div
					class={cn(
						"text-xs flex items-center flex-wrap gap-x-2 gap-y-1 mt-1",
						"text-gray-500 dark:text-gray-400",
					)}
				>
					<Show when={hit().userId && hit().displayName}>
						<span tabIndex={-1} class="flex items-center gap-1 flex-shrink-0">
							<UserAvatar
								userId={hit().userId!}
								displayName={hit().displayName!}
								size="sm"
							/>
							<HighlightedText text={nameHighlight()!} />
						</span>
						<span class="hidden sm:inline mx-1">·</span>
					</Show>
					<Show when={relativeTime()}>
						<span class="flex-shrink-0">{relativeTime()}</span>
					</Show>
					<Show when={hit().type === "comment" && hit().suggestionId}>
						<span class="hidden sm:inline mx-1">·</span>
						<span class="text-xs truncate italic">in suggestion</span>
					</Show>
				</div>
			</div>
		</div>
	);
}
