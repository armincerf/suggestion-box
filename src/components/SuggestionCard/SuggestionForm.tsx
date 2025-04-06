import { useZero } from "../../zero/ZeroContext";
import { BaseForm } from "../BaseForm";
import { createSignal, For, type Component } from "solid-js";
import { useCategories } from "../../hooks/data/useCategories";
import { useCreateSuggestion } from "../../hooks/mutations/suggestionMutations";
import { createLogger } from "../../hyperdx-logger";

const logger = createLogger("suggestion-box:SuggestionForm");

export interface SuggestionFormProps {
	displayName: string;
	onSubmitError?: ((error: Error) => void) | undefined;
	onSubmit?: () => void;
	compact?: boolean | undefined;
	categoryID?: string | null | undefined;
	autoFocus?: boolean | undefined;
	categoryOptional?: boolean | undefined;
}

const CategoryPicker: Component<{
	onCategoryChange: (categoryId: string | null) => void;
	selectedCategoryId?: string | null;
	optional?: boolean | undefined;
}> = (props) => {
	const [categories] = useCategories();

	return (
		<div class="mb-4">
			<h2 class="text-lg font-semibold mb-2">
				Choose a category
				{props.optional && <span class="text-gray-500 ml-1">(optional)</span>}
			</h2>
			<div class="join sm:join-horizontal w-auto">
				{props.optional && (
					<div class="flex-1">
						<input
							type="radio"
							name="category-options"
							class="join-item btn"
							aria-label="None"
							checked={props.selectedCategoryId === null}
							value=""
							onChange={() => props.onCategoryChange(null)}
							style={{
								"background-color":
									props.selectedCategoryId === null ? "#f0f0f0" : "transparent",
								"border-color": "#ccc",
								color: props.selectedCategoryId === null ? "#333" : "inherit",
							}}
						/>
					</div>
				)}
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
};

export const SuggestionForm: Component<SuggestionFormProps> = (props) => {
	const z = useZero();
	const [submitError, setSubmitError] = createSignal<string | null>(null);
	const createSuggestion = useCreateSuggestion();

	const handleSubmit = async (text: string) => {
		if (!text.trim() || !z) return;

		setSubmitError(null);

		try {
			await createSuggestion(text.trim(), props.categoryID ?? null);
			logger.info(
				`Suggestion submitted for category ${props.categoryID ?? "none"}`,
			);

			props.onSubmit?.();
		} catch (error) {
			logger.error("Error submitting suggestion:", error);
			setSubmitError("An unexpected error occurred. Please try again.");
			props.onSubmitError?.(
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
				displayName={props.displayName}
				onSubmit={handleSubmit}
				compact={props.compact || false}
				label="Enter your suggestion"
				submitText="Post"
				submittingText="Posting..."
				id={`suggestion-form-${props.categoryID ?? "none"}`}
				autoFocus={!!props.autoFocus}
			/>
		</>
	);
};

export const SuggestionFormWithCategoryPicker: Component<
	SuggestionFormProps
> = (props) => {
	const [selectedCategory, setSelectedCategory] = createSignal(
		props.categoryID ?? null,
	);

	const handleCategoryChange = (categoryId: string | null) => {
		setSelectedCategory(categoryId);
	};

	return (
		<>
			<CategoryPicker
				onCategoryChange={handleCategoryChange}
				selectedCategoryId={selectedCategory()}
				optional={props.categoryOptional}
			/>
			<SuggestionForm
				displayName={props.displayName}
				onSubmitError={props.onSubmitError}
				onSubmit={props.onSubmit ?? (() => {})}
				compact={props.compact}
				categoryID={selectedCategory()}
				autoFocus={props.autoFocus}
				categoryOptional={props.categoryOptional}
			/>
		</>
	);
};
