import { randID } from "../rand";
import { useZero } from "../context/ZeroContext";
import { BaseForm } from "./BaseForm";
import { createSignal, For, Index } from "solid-js";
import { useCategories } from "../hooks/useCategories";
import type { Category } from "../schema";

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
				userId: z.userID,
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
