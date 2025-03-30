import { createMemo } from "solid-js";
import type { Suggestion } from "../../zero/schema";
import { getNameFromUserId } from "../../nameGenerator";
import { useRelativeTime } from "../../hooks/ui/useRelativeTime";
import { UserAvatar } from "../UserAvatar";

interface SuggestionHeaderProps {
	userId: Suggestion["userId"];
	displayName: Suggestion["displayName"];
	timestamp: Suggestion["timestamp"];
}

export function SuggestionHeader(props: SuggestionHeaderProps) {
	const suggestionAuthor = createMemo(() => {
		return props.displayName || getNameFromUserId(props.userId);
	});
	const relativeDate = useRelativeTime(() => props.timestamp);

	return (
		<div class="flex items-center justify-between suggestion-meta mb-2">
			<div class="flex items-center gap-2">
				<UserAvatar
					userId={props.userId}
					displayName={suggestionAuthor()}
					size="sm"
				/>
				<div class="suggestion-author font-semibold text-sm truncate max-w-[200px]">
					{suggestionAuthor()}
				</div>
			</div>
			<span class="suggestion-date text-xs opacity-70">{relativeDate()}</span>
		</div>
	);
} 