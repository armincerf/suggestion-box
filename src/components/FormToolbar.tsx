import type { JSX } from "solid-js";
import { PaperClipIcon, MoodSelector } from "./MoodSelector";

interface FormToolbarProps {
	isSubmitting: boolean;
	isDisabled: boolean;
	submitText: string;
	submittingText?: string;
	onAttach?: () => void;
}

export function FormToolbar(props: FormToolbarProps) {
	return (
		<div class="absolute inset-x-0 bottom-0 flex justify-between py-2 pr-2 pl-3">
			<div class="flex items-center space-x-5">
				{/* <div class="flex items-center">
					<MoodSelector />
				</div> */}
			</div>
			<div class="shrink-0">
				<button
					type="submit"
					disabled={props.isDisabled}
					aria-busy={props.isSubmitting}
					class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{props.isSubmitting
						? props.submittingText || "Posting..."
						: props.submitText}
				</button>
			</div>
		</div>
	);
}
