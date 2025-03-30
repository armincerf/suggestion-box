import { Show } from "solid-js";
import type { Suggestion } from "../../zero/schema";
import { ReactionButtons } from "../ReactionButtons";

interface SuggestionActionsProps {
	suggestion: Suggestion;
	isOwnSuggestion: boolean;
	isEditing: boolean;
	onCommentClick: () => void;
	onEditClick: () => void;
	commentFormId: string; // For aria-controls
	commentFormVisible: boolean; // For aria-expanded
}

export function SuggestionActions(props: SuggestionActionsProps) {
	const handleReportClick = () => {
        // april fools joke
		window.location.href =
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=ygUjcmljayBhc3RsZXkgbmV2ZXIgZ29ubmEgZ2l2ZSB5b3UgdXA%3D";
	};

	return (
		<div class="mt-3 flex flex-wrap gap-2 items-center suggestion-actions">
			<ReactionButtons entity={props.suggestion} />
			<div class="flex-grow" />
			<Show when={!props.isEditing}>
				<button
					type="button"
					class="btn btn-xs btn-ghost"
					onClick={props.onCommentClick}
					aria-controls={props.commentFormId}
					aria-expanded={props.commentFormVisible}
				>
					Comment
				</button>
				<Show when={props.isOwnSuggestion}>
					<button
						type="button"
						class="btn btn-xs btn-ghost"
						onClick={props.onEditClick}
					>
						Edit
					</button>
				</Show>
			</Show>
			<button
				type="button"
				onClick={handleReportClick}
				class="btn btn-xs btn-error"
				aria-label="Report suggestion"
			>
				Report
			</button>
		</div>
	);
} 