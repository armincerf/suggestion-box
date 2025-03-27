import { createSignal, Show } from "solid-js";
import { TextField } from "./TextField";
import { FormToolbar } from "./FormToolbar";
import { EditableDisplayName } from "./EditableDisplayName";
import { UserAvatar } from "./UserAvatar";
import { useIsScreenSmallerThan } from "../hooks/useScreenSize";

export interface BaseFormProps {
	userId: string;
	displayName: string;
	placeholder?: string;
	onSubmit: (text: string) => Promise<void>;
	compact?: boolean;
	label?: string;
	inReplyTo?: string | undefined;
	submitText?: string;
	submittingText?: string;
	id?: string;
	autoFocus?: boolean;
}

export function BaseForm(props: BaseFormProps) {
	const [text, setText] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const isSmallScreen = useIsScreenSmallerThan({ sizeBreakpoint: 768 });

	const handleInput = (
		e: InputEvent & { currentTarget: HTMLTextAreaElement },
	) => {
		setText(e.currentTarget.value);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!text().trim()) return;

		setIsSubmitting(true);
		try {
			await props.onSubmit(text().trim());
			setText(""); // Clear the input after successful submission
		} catch (error) {
			console.error("Failed to submit:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle keydown events in the textarea
	const handleKeyDown = (
		e: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
	) => {
		// If Enter is pressed without Shift key
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault(); // Prevent default behavior (new line)

			// Only submit if there's content and not already submitting
			if (text().trim() && !isSubmitting()) {
				handleSubmit(e);
			}
		}
		// If Shift+Enter is pressed, let the default behavior happen (new line)
	};

	return (
		<div
			class={`flex items-start ${props.compact ? "space-x-2" : "space-x-4"}`}
		>
			<div class="min-w-0 flex-1">
				<form onSubmit={handleSubmit} class="relative" id={props.id}>
					<Show when={props.inReplyTo}>
						<div class="mb-2 text-sm text-gray-500 dark:text-gray-400">
							Replying to{" "}
							<span class="font-medium text-gray-900 dark:text-white">
								{props.inReplyTo}
							</span>
						</div>
					</Show>

					<TextField
						id={`${props.id || "form"}-text`}
						name="text"
						value={text()}
						onInput={handleInput}
						onKeyDown={handleKeyDown}
						placeholder={
							props.placeholder ||
							(isSmallScreen()
								? "Add your text..."
								: "Add your text... (Press Enter to submit, Shift+Enter for new line)")
						}
						rows={props.compact ? 2 : 3}
						disabled={isSubmitting()}
						required
						label={props.label || "Enter your text"}
						autoFocus={!!props.autoFocus}
					/>

					<FormToolbar
						isSubmitting={isSubmitting()}
						isDisabled={isSubmitting() || !text().trim()}
						submitText={props.submitText || "Post"}
						submittingText={props.submittingText || "Posting..."}
					/>
				</form>

				<div class="form-control mt-2 flex items-center gap-2">
					<UserAvatar
						userId={props.userId}
						displayName={props.displayName}
						size={isSmallScreen() ? "sm" : "md"}
						editable={true}
					/>
					<EditableDisplayName displayName={props.displayName} />
				</div>
			</div>
		</div>
	);
}
