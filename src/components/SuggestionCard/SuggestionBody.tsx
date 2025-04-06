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
	authorDisplayName: string;
	readOnly?: boolean;
}

export function SuggestionBody(props: SuggestionBodyProps) {
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
					aria-label="Suggestion content"
				>
					{props.initialBody}
				</section>
			</Show>
		</>
	);
}
