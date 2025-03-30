import {
	createForm,
	Form,
	useArrayField,
} from "@gapu/formix";
import { createSignal, Show } from "solid-js";
import { z } from "zod";
import { useCreatePoll } from "../../hooks/mutations/pollMutations";
import { useUser } from "../../hooks/data/useUser";
import { LoadingSpinner } from "../LoadingSpinner";
import type { CreatePollInput } from "../../hooks/mutations/pollMutations"; // Import input type
import { TextField, ArrayField, ErrorMessage, TrashIcon } from "../FormixHelpers"; // Import TrashIcon here
import { toaster } from "../../toast"; // Import the toaster

// Define Zod schema for validation
const optionSchema = z.object({
	text: z.string().min(1, "Option text cannot be empty"),
});

const questionSchema = z.object({
	text: z.string().min(1, "Question text cannot be empty"),
	options: z.array(optionSchema).min(2, "Add at least two options"),
});

const pollFormSchema = z.object({
	title: z.string().min(3, "Poll title must be at least 3 characters"),
	questions: z.array(questionSchema).min(1, "Add at least one question"),
});

// Type matching the Zod schema for Formix
type PollFormData = z.infer<typeof pollFormSchema>;
// Define explicit types for question and option based on schema
type QuestionFormData = z.infer<typeof questionSchema>;
type OptionFormData = z.infer<typeof optionSchema>;

interface CreatePollFormProps {
	sessionId: string;
	onPollCreated: (pollId: string) => void; // Callback after creation
	onCancel: () => void;
	isPollActive: boolean; // Add prop
}

export function CreatePollForm(props: CreatePollFormProps) {
	const { userId } = useUser();
	const createPollMutation = useCreatePoll();
	const [isSubmitting, setIsSubmitting] = createSignal(false);

	const formContext = createForm({
		schema: pollFormSchema,
		initialState: {
			title: "",
			questions: [{ text: "", options: [{ text: "" }, { text: "" }] }], // Start with one question, two options
		},
		// Add type annotation for state
		onSubmit: async (state: PollFormData) => {
			if (!userId) {
				toaster.create({
					title: "Error",
					description: "User not identified. Please log in again.",
					type: "error",
				});
				return;
			}
			setIsSubmitting(true);
			
			try {
				// Ensure the state matches the CreatePollInput structure expected by the mutation
				const inputData: CreatePollInput = {
					title: state.title,
					// Add type annotations for map parameters
					questions: state.questions.map((q: QuestionFormData) => ({
						text: q.text,
						options: q.options.map((o: OptionFormData) => ({ text: o.text })),
					})),
				};
				const result = await createPollMutation(
					props.sessionId,
					userId,
					inputData,
				);
				if (result.success) {
					// Show success toast
					toaster.create({
						title: "Success",
						description: "Poll created successfully!",
						type: "success",
					});
					
					// Call onPollCreated with the new poll ID
					props.onPollCreated(result.data);
					
					// Close the modal by calling onCancel which will remove the search param
					props.onCancel();
				} else {
					// Show error toast
					toaster.create({
						title: "Error",
						description: result.error.message || "Failed to create poll.",
						type: "error",
					});
					setIsSubmitting(false);
				}
			} catch (err) {
				// Show error toast
				toaster.create({
					title: "Error",
					description: err instanceof Error ? err.message : "An unexpected error occurred.",
					type: "error",
				});
				setIsSubmitting(false);
			}
			// No finally block needed since we only reset isSubmitting on error
			// Success case calls onCancel which unmounts the component
		},
	});

	return (
		<Form context={formContext}>
			<div class="space-y-4 bg-base-200 dark:bg-gray-700 p-4 rounded-lg shadow-md">
				<h2 class="text-xl font-bold mb-4 dark:text-white">Create a New Poll</h2>
				
				<TextField id="pollTitle" label="Poll Title/Topic" path="title" />

				<ArrayField
					label="Questions"
					path="questions"
					addButtonText="Add Question"
					// Default item needs to match the structure expected by the schema
					defaultItem={{ text: "", options: [{ text: "" }, { text: "" }] }}
					// Add type annotation for renderItem parameter
					renderItem={(questionPath: string) => (
						<QuestionField questionPath={questionPath} />
					)}
				/>

				{/* Show warning message if a poll is active */}
				<Show when={props.isPollActive}>
					<p class="text-warning text-xs px-1">Cannot create: A poll is already active.</p>
				</Show>

				<div class="flex justify-end space-x-2 pt-4 border-t dark:border-gray-600 mt-4">
					<button
						type="button"
						class="btn btn-ghost"
						onClick={props.onCancel} // Use passed onCancel directly
						disabled={isSubmitting()}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-primary"
						// Disable if submitting OR if there are validation errors OR if another poll is active
						disabled={isSubmitting() || formContext.errors().length > 0 || props.isPollActive}
						title={props.isPollActive ? "Cannot create poll while another is active" : ""}
					>
						{isSubmitting() ? <LoadingSpinner /> : "Create Poll"}
					</button>
				</div>
			</div>
		</Form>
	);
}

// --- Sub-Components for the Form ---

interface QuestionFieldProps {
	questionPath: string; // e.g., "questions.0"
}

function QuestionField(props: QuestionFieldProps) {
	const questionsArray = useArrayField<QuestionFormData>("questions");
	// Use Number.parseInt
	const index = Number.parseInt(props.questionPath.split(".").pop() || "0", 10);

	return (
		<fieldset class="border border-base-300 p-3 rounded-md mb-3 space-y-2 relative bg-base-100">
			<legend class="text-sm font-medium px-1">Question {index + 1}</legend>
			<div class="flex items-start gap-2">
				<TextField
					id={`${props.questionPath}.text`}
					label="Question Text"
					path={`${props.questionPath}.text`}
					class="flex-grow" // Make text field take available space
				/>
				{/* Show remove button only if more than one question exists */}
				<Show when={questionsArray.value().length > 1}>
					<button
						type="button"
						onClick={() => questionsArray.remove(index)}
						class="btn btn-ghost btn-sm mt-7 text-error hover:bg-error/10" // Use DaisyUI error color
						aria-label="Remove Question"
						title={`Remove Question ${index + 1}`}
					>
						<TrashIcon />
					</button>
				</Show>
			</div>
			{/* Display errors related to the whole question object (e.g., options array length) */}
			<ErrorMessage path={props.questionPath} />

			<ArrayField
				label="Options"
				path={`${props.questionPath}.options`}
				addButtonText="Add Option"
				defaultItem={{ text: "" }} // Default item for options array
				// Add type annotation for renderItem parameter
				renderItem={(optionPath: string) => (
					<OptionField optionPath={optionPath} />
				)}
			/>
		</fieldset>
	);
}

interface OptionFieldProps {
	optionPath: string; // e.g., "questions.0.options.0"
}

function OptionField(props: OptionFieldProps) {
	// Extract parent path (e.g., "questions.0.options") and index
	const pathParts = props.optionPath.split(".");
	// Use Number.parseInt
	const index = Number.parseInt(pathParts.pop() || "0", 10);
	const parentPath = pathParts.join(".");

	// Type needs to match the item type in the array
	const optionsArray = useArrayField<OptionFormData>(parentPath);
    
    // The path for the TextField should point to the 'text' property
    const textPath = `${props.optionPath}.text`;

	return (
		<div class="flex items-start gap-2 mb-1">
			<TextField
				id={textPath} // Use textPath for ID as well
				label={`Option ${index + 1}`}
				path={textPath} // Use the path to the 'text' property
				placeholder={`Option ${index + 1} text`}
				class="flex-grow"
			/>
			<button
				type="button"
				onClick={() => optionsArray.remove(index)}
				class="btn btn-ghost btn-xs mt-7 text-error hover:bg-error/10"
				aria-label={`Remove Option ${index + 1}`}
				title={`Remove Option ${index + 1}`}
				disabled={optionsArray.value().length <= 2} // Prevent removing below 2 options
			>
				<TrashIcon />
			</button>
		</div>
	);
}

// NOTE: You will need to create or ensure you have the following components
// compatible with @gapu/formix in `../FormixHelpers`:
// - TextField: Renders a label, input, and error message for a form field.
// - ArrayField: Manages rendering a list of fields, adding/removing items.
// - ErrorMessage: Displays validation errors for a specific path.
// - TrashIcon: SVG icon for delete buttons
// Ensure `../LoadingSpinner` and `../hooks/data/useUser` exist and work as expected.
