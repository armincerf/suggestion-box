import { createMemo, createSignal, Show } from "solid-js";
import { randID } from "../rand";
import { useZero } from "../context/ZeroContext";
import { Pencil, X, Check } from "lucide-solid";

interface SuggestionFormProps {
	displayName: string;
	onSubmitSuccess?: () => void;
	compact?: boolean;
	categoryID?: string;
}

/**
 * Component for submitting a new suggestion
 */
export function SuggestionForm(props: SuggestionFormProps) {
	const displayName = () => props.displayName;
	const onSubmitSuccess = () => props.onSubmitSuccess;
	const compact = () => props.compact;

	const z = useZero();

	const [suggestion, setSuggestion] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [isEditingName, setIsEditingName] = createSignal(false);
	let nameInputRef: HTMLInputElement | undefined;
	// Use the provided category if available; otherwise default to "continue"
	const selectedCategory = () => props.categoryID ?? "continue";

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!suggestion().trim() || !z) return;

		setIsSubmitting(true);
		try {
			await z.mutate.suggestion.insert({
				id: randID(),
				body: suggestion().trim(),
				timestamp: Date.now(),
				userIdentifier: z.userID,
				displayName: displayName(),
				categoryID: selectedCategory(),
			});

			setSuggestion("");
			setIsEditingName(false);

			if (onSubmitSuccess()) {
				onSubmitSuccess();
			}
		} catch (error) {
			console.error("Error submitting suggestion:", error);
			throw error;
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle keydown events in the textarea
	const handleKeyDown = (e: KeyboardEvent) => {
		// If Enter is pressed without Shift key
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault(); // Prevent default behavior (new line)

			// Only submit if there's content and not already submitting
			if (suggestion().trim() && !isSubmitting() && z) {
				handleSubmit(e);
			}
		}
		// If Shift+Enter is pressed, let the default behavior happen (new line)
	};
	
	// Save the user name
	const saveUserName = async () => {
		if (!z || !nameInputRef) return;
		const newName = nameInputRef.value.trim();
		if (newName && newName !== displayName()) {
			await z.mutate.user.update({
				id: z.userID,
				displayName: newName,
			});
			console.log("User name saved:", newName);
		}
		setIsEditingName(false);
	};

	// Handle Enter key in name input
	const handleNameKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			saveUserName();
		} else if (e.key === "Escape") {
			setIsEditingName(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			aria-label="New suggestion form"
			class={`space-y-4 p-4 border-t mt-4 ${compact() ? "p-2" : ""}`}
		>
			<div>
				<label for="suggestion-textarea" class="sr-only">
					Enter your suggestion
				</label>
				<textarea
					id="suggestion-textarea"
					tabIndex={0}
					value={suggestion()}
					onInput={(e) => setSuggestion(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Enter your suggestion... (Press Enter to submit, Shift+Enter for new line)"
					rows={compact() ? 2 : 4}
					disabled={isSubmitting() || !z}
					class="textarea textarea-bordered w-full"
					aria-describedby="suggestion-description"
				/>
			</div>

			<div class="form-control">
				<div class="flex items-center">
					<span class="mr-2">Posting as:</span>
					<Show
						when={!isEditingName()}
						fallback={
							<>
								<input
									type="text"
									ref={nameInputRef}
									placeholder="Enter your name"
									class="input input-sm input-bordered"
									disabled={isSubmitting() || !z}
									onKeyDown={handleNameKeyDown}
									autofocus
								/>
								<button
									type="button"
									onClick={saveUserName}
									class="btn btn-ghost btn-xs"
									aria-label="Save name"
								>
									<Check size={16} />
								</button>
								<button
									type="button"
									onClick={() => setIsEditingName(false)}
									class="btn btn-ghost btn-xs"
									aria-label="Cancel editing"
								>
									<X size={16} />
								</button>
							</>
						}
					>
						<strong class="mr-2">{displayName()}</strong>
						<button
							type="button"
							onClick={() => {
								setIsEditingName(true);
							}}
							class="btn btn-ghost btn-xs"
							disabled={isSubmitting() || !z}
							aria-label="Edit display name"
						>
							<Pencil size={16} />
						</button>
					</Show>
				</div>
			</div>

			<button
				type="submit"
				disabled={isSubmitting() || !suggestion().trim() || !z}
				aria-busy={isSubmitting()}
				class="btn btn-primary w-full"
			>
				{isSubmitting() ? "Submitting..." : "Submit Suggestion"}
			</button>
		</form>
	);
}
