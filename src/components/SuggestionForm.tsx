import { useZero } from "../zero/ZeroContext";
import { BaseForm } from "./BaseForm";
import { createSignal, For } from "solid-js";
import { useCategories } from "../hooks/data/useCategories";
import { useCreateSuggestion } from "../hooks/mutations/suggestionMutations";

interface SuggestionFormProps {
	displayName: string;
	onSubmitSuccess?: (suggestionId: string) => void;
	onSubmitError?: (error: Error) => void;
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
	const onSubmitError = () => props.onSubmitError;
	const compact = () => props.compact;
	const z = useZero();
	const [submitError, setSubmitError] = createSignal<string | null>(null);
	
	// Use the callback from the mutation hook to handle success
	const createSuggestion = useCreateSuggestion((suggestionId) => {
		onSubmitSuccess()?.(suggestionId);
	});

	// Use the provided category if available; otherwise default to "continue"
	const selectedCategory = () => props.categoryID ?? "continue";

	const handleSubmit = async (text: string) => {
		if (!text.trim() || !z) return;
		
		setSubmitError(null);

		try {
			const result = await createSuggestion(
				text.trim(),
				z.userID,
				displayName(),
				selectedCategory()
			);
			
			if (!result.success) {
				// Handle error case
				setSubmitError("Failed to submit suggestion. Please try again.");
				onSubmitError()?.(result.error);
			}
		} catch (error) {
			console.error("Error submitting suggestion:", error);
			setSubmitError("An unexpected error occurred. Please try again.");
			onSubmitError()?.(error instanceof Error ? error : new Error(String(error)));
		}
	};

	return (
		<>
			{submitError() && (
				<div class="text-red-500 mb-2 text-sm">{submitError()}</div>
			)}
			<BaseForm
				userId={z?.userID || ""}
				displayName={displayName()}
				onSubmit={handleSubmit}
				compact={compact() || false}
				label="Enter your suggestion"
				submitText="Post"
				submittingText="Posting..."
				id={`suggestion-form-${selectedCategory()}`}
				autoFocus={!!props.autoFocus}
			/>
		</>
	);
}

interface CategoryPickerProps {
	onCategoryChange: (categoryId: string) => void;
	selectedCategoryId?: string;
}

/**
 * Component for selecting a category using DaisyUI radio buttons
 */
function CategoryPicker(props: CategoryPickerProps) {
	const [categories] = useCategories();

	return (
		<div class="mb-4">
			<h2 class="text-lg font-semibold mb-2">Choose a category</h2>
			<div class="join join-vertical sm:join-horizontal w-full sm:w-auto">
				<For each={categories()}>
					{(category) => (
						<div class="flex-1 tooltip" data-tip={category.description}>
							<input
								type="radio"
								name="category-options"
								class="join-item btn"
								aria-label={category.name}
								checked={props.selectedCategoryId === category.id}
								value={category.id}
								onChange={() => props.onCategoryChange(category.id)}
								style={{
									"background-color":
										props.selectedCategoryId === category.id
											? category.backgroundColor
											: "transparent",
									"border-color": category.backgroundColor,
									color:
										props.selectedCategoryId === category.id
											? "#333"
											: "inherit",
								}}
							/>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}

export function SuggestionFormWithCategoryPicker(props: SuggestionFormProps) {
	const [selectedCategory, setSelectedCategory] = createSignal(
		props.categoryID ?? "continue",
	);

	const handleCategoryChange = (categoryId: string) => {
		setSelectedCategory(categoryId);
	};

	return (
		<>
			<CategoryPicker
				onCategoryChange={handleCategoryChange}
				selectedCategoryId={selectedCategory()}
			/>
			<SuggestionForm {...props} categoryID={selectedCategory()} autoFocus />
		</>
	);
}
