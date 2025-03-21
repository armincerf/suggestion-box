import { randID } from "../rand";
import { useZero } from "../context/ZeroContext";
import { BaseForm } from "./BaseForm";

interface SuggestionFormProps {
	displayName: string;
	onSubmitSuccess?: () => void;
	compact?: boolean;
	categoryID?: string;
	autoFocus?: boolean;
}

/**
 * Component for submitting a new suggestion
 */
export function SuggestionForm(props: SuggestionFormProps) {
	const displayName = () => props.displayName;
	const onSubmitSuccess = () => props.onSubmitSuccess;
	const compact = () => props.compact;
	const z = useZero();

	// Use the provided category if available; otherwise default to "continue"
	const selectedCategory = () => props.categoryID ?? "continue";

	const handleSubmit = async (text: string) => {
		if (!text.trim() || !z) return;

		try {
			await z.mutate.suggestion.insert({
				id: randID(),
				body: text.trim(),
				timestamp: Date.now(),
				userIdentifier: z.userID,
				displayName: displayName(),
				categoryID: selectedCategory(),
				updatedAt: Date.now(),
			});

			if (onSubmitSuccess()) {
				onSubmitSuccess();
			}
		} catch (error) {
			console.error("Error submitting suggestion:", error);
			throw error;
		}
	};

	return (
		<BaseForm
			userIdentifier={z?.userID || ""}
			displayName={displayName()}
			onSubmit={handleSubmit}
			compact={compact() || false}
			label="Enter your suggestion"
			submitText="Post"
			submittingText="Posting..."
			id={`suggestion-form-${selectedCategory()}`}
			autoFocus={!!props.autoFocus}
		/>
	);
}

// Export default
export default SuggestionForm;
