import { ErrorBoundary } from "solid-js";
import { ErrorFallback } from "../ErrorFallback";
import { useZero } from "../../zero/ZeroContext";
import { BaseForm } from "../BaseForm";
import { useIsScreenSmallerThan } from "../../hooks/ui/useScreenSize";

interface CommentFormProps {
	onSubmit: (text: string) => Promise<void>;
	placeholder?: string;
	id: string;
	inReplyTo?: string;
	displayName: string;
	autoFocus?: boolean;
}

/**
 * Component for submitting a comment or reply
 */
export function CommentForm(props: CommentFormProps) {
	const z = useZero();
	// Get the reply name, ensuring it's a string or undefined
	const getReplyName = () => {
		const name = props.inReplyTo;
		return name ? String(name) : undefined;
	};

	const isSmallScreen = useIsScreenSmallerThan({
		sizeBreakpoint: 768,
	});

	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="Failed to submit comment. Please try again."
				/>
			)}
		>
			<BaseForm
				userId={z?.userID || ""}
				displayName={props.displayName}
				placeholder={props.placeholder || "Add your comment..."}
				onSubmit={props.onSubmit}
				inReplyTo={getReplyName()}
				label="Comment"
				submitText={isSmallScreen() ? ">" : "Post Comment"}
				submittingText="Posting..."
				id={props.id}
				autoFocus={!!props.autoFocus}
			/>
		</ErrorBoundary>
	);
}

// Export the default
export default CommentForm;
