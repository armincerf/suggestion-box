import { useField, useArrayField, type FormixError } from "@gapu/formix";
import { Show, For, Index, type JSX } from "solid-js";
import { cn } from "../utils/cn"; // Your classname utility

// Basic TextField
export const TextField = <T extends string | number>(props: {
	id: string;
	label: string;
	type?: string;
	path: string;
	placeholder?: string;
	class?: string;
}) => {
	const field = useField<T>(props.path);

	return (
		<div class="form-control w-full">
			<label class="label" for={props.id}>
				<span class="label-text dark:text-gray-200">
					{props.label}
					{field.isRequired() && <span class="text-error">*</span>}
				</span>
			</label>
			<input
				id={props.id}
				type={props.type || "text"}
				value={(field.value() as string) ?? ""} // Handle null/undefined value
				onInput={(e) => field.setValue(e.currentTarget.value as T)}
				onFocus={() => field.setMeta((prev) => ({ ...prev, touched: true }))}
				placeholder={props.placeholder}
				class={cn(
					"input input-bordered w-full",
					field.errors().length > 0 && "input-error",
					"dark:bg-gray-700 dark:border-gray-600 dark:text-white",
					props.class,
				)}
				disabled={field.meta().disabled}
			/>
			<Show when={field.meta().touched && field.errors().length > 0}>
				<div class="label">
					<span class="label-text-alt text-error">
						<ErrorMessage errors={field.errors()} />
					</span>
				</div>
			</Show>
		</div>
	);
};

// Basic ErrorMessage display
export const ErrorMessage = (props: {
	path?: string;
	errors?: FormixError[];
}) => {
	// If errors are directly provided, display them
	if (props.errors) {
		return (
			<For each={props.errors}>
				{(error) => (
					<p class="text-error text-xs mt-1 first:mt-0">{error.message}</p>
				)}
			</For>
		);
	}

	// Otherwise, use the field hook to get errors for a specific path
	if (props.path) {
		const field = useField(props.path);
		return (
			<For each={field.errors()}>
				{(error) => (
					<p class="text-error text-xs mt-1 first:mt-0">{error.message}</p>
				)}
			</For>
		);
	}

	return null;
};

// ArrayField wrapper
export const ArrayField = (props: {
	label: string;
	path: string;
	addButtonText: string;
	defaultItem?: unknown; // Default value to add when pushing a new item
	renderItem: (itemPath: string, index: number) => JSX.Element;
}) => {
	const arrayField = useArrayField(props.path);

	const handleAddItem = () => {
		// Use defaultItem if provided, otherwise empty string
		arrayField.push(props.defaultItem ?? "");
	};

	return (
		<fieldset class="space-y-2">
			<legend class="text-base font-medium mb-2 dark:text-gray-200">
				{props.label}
			</legend>
			<Index each={arrayField.value()}>
				{(_, index) => props.renderItem(`${props.path}.${index}`, index)}
			</Index>
			<button
				type="button"
				onClick={handleAddItem}
				class="btn btn-sm btn-outline btn-accent"
			>
				{props.addButtonText}
			</button>
			{/* Show array-level errors (like min length) */}
			<Show when={arrayField.errors().some((e) => e.path === props.path)}>
				<div class="mt-1">
					<ErrorMessage
						errors={arrayField.errors().filter((e) => e.path === props.path)}
					/>
				</div>
			</Show>
		</fieldset>
	);
};

// Trash icon for delete buttons
export const TrashIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="h-4 w-4"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		stroke-width="2"
	>
		<title>Remove</title>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
		/>
	</svg>
);
