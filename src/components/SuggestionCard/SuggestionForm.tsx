import { useZero } from "../../zero/ZeroContext";
import { BaseForm } from "../BaseForm";
import { createSignal, For } from "solid-js";
import { useCategories } from "../../hooks/data/useCategories";
import { useCreateSuggestion } from "../../hooks/mutations/suggestionMutations";
import { createLogger } from "../../hyperdx-logger";

const logger = createLogger("suggestion-box:SuggestionForm");

interface SuggestionFormProps {
	displayName: string;
	onSubmitError?: (error: Error) => void;
	compact?: boolean;
	categoryID?: string;
	autoFocus?: boolean;
}

export function SuggestionForm(props: SuggestionFormProps) {
	const displayName = () => props.displayName;
	const onSubmitError = () => props.onSubmitError;
	const compact = () => props.compact;
	const z = useZero();
	const [submitError, setSubmitError] = createSignal<string | null>(null);

	const createSuggestion = useCreateSuggestion();

	const selectedCategory = () => props.categoryID ?? "continue";

	const handleSubmit = async (text: string) => {
		if (!text.trim() || !z) return;

		setSubmitError(null);

		try {
			const result = await createSuggestion(text.trim(), selectedCategory());
			logger.info(
				`Suggestion submitted for category ${selectedCategory()}. Result success: ${result?.success}, New Suggestion ID (if success): ${result?.data}`,
			);

			if (!result?.success) {
				setSubmitError("Failed to submit suggestion. Please try again.");
				onSubmitError();
			}
		} catch (error) {
			logger.error("Error submitting suggestion:", error);
			setSubmitError("An unexpected error occurred. Please try again.");
			onSubmitError()?.(
				error instanceof Error ? error : new Error(String(error)),
			);
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
