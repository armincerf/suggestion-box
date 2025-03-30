import { Show } from "solid-js";

interface SuggestionBodyProps {
	suggestionId: string;
	initialBody: string;
	isEditing: boolean;
	editedBody: string;
	onEditInput: (value: string) => void;
	onSubmitEdit: (e?: Event) => Promise<void>;
	onCancelEdit: () => void;
	isSubmittingEdit: boolean;
	editError: string | null;
	onTextSelection: (start: number, end: number) => void;
	clearTextSelection: () => void;
	authorDisplayName: string; // For screen reader title
}

export function SuggestionBody(props: SuggestionBodyProps) {
	const handleTextSelection = () => {
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const container = document.getElementById(props.suggestionId);
			if (
				container?.contains(range.startContainer) &&
				container.contains(range.endContainer) &&
				!range.collapsed
			) {
				const preSelectionRange = document.createRange();
				preSelectionRange.selectNodeContents(container);
				preSelectionRange.setEnd(range.startContainer, range.startOffset);
				const start = preSelectionRange.toString().length;
				const end = start + range.toString().length;
				props.onTextSelection(start, end);
			} else {
				props.clearTextSelection();
			}
		} else {
			props.clearTextSelection();
		}
	};

	return (
		<>
			<div class="sr-only" id={`${props.suggestionId}-title`}>
				Suggestion by {props.authorDisplayName}
			</div>

			<Show
				when={!props.isEditing}
				fallback={
					<form onSubmit={props.onSubmitEdit} class="mt-1">
						<textarea
							value={props.editedBody}
							onInput={(e) => props.onEditInput(e.currentTarget.value)}
							class="textarea textarea-bordered w-full text-sm"
							rows={3}
							required
							aria-labelledby={`${props.suggestionId}-title`}
							aria-label="Edit suggestion content"
						/>
						<Show when={props.editError}>
							<p class="text-error text-xs mt-1">{props.editError}</p>
						</Show>
						<div class="mt-2 flex gap-2 justify-end">
							<button
								type="button"
								class="btn btn-xs btn-ghost"
								onClick={props.onCancelEdit}
							>
								Cancel
							</button>
							<button
								type="submit"
								class="btn btn-xs btn-primary"
								disabled={props.isSubmittingEdit}
							>
								{props.isSubmittingEdit ? "Saving..." : "Save"}
							</button>
						</div>
					</form>
				}
			>
				<section
					id={props.suggestionId}
					class="suggestion-body mt-1 text-sm prose prose-sm max-w-none"
					onMouseUp={handleTextSelection}
					aria-label="Suggestion content"
				>
					{/* Use innerHTML or equivalent if markdown/rich text is needed, otherwise direct text is safer */}
					{props.initialBody}
				</section>
			</Show>
		</>
	);
}
