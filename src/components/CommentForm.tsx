import { ErrorBoundary } from "solid-js";
import { ErrorFallback } from "./ErrorFallback";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";
import { BaseForm } from "./BaseForm";
import { useIsScreenSmallerThan } from "../hooks/useScreenSize";

interface CommentFormProps {
	onSubmit: (text: string) => Promise<void>;
	placeholder?: string;
	id: string;
	parentCommentId?: string;
	inReplyTo?: string;
	displayName: string;
}

/**
 * Component for submitting a comment or reply
 */
export function CommentForm(props: CommentFormProps) {
	const z = useZero();
	const [parentComment] = useQuery(() =>
		z.query.comment.where("id", props.parentCommentId || "").one(),
	);
	
	// Get the reply name, ensuring it's a string or undefined
	const getReplyName = () => {
		const name = props.inReplyTo || parentComment()?.displayName;
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
				userIdentifier={z?.userID || ''}
				displayName={props.displayName}
				placeholder={props.placeholder || "Add your comment..."}
				onSubmit={props.onSubmit}
				inReplyTo={getReplyName()}
				label="Comment"
				submitText={isSmallScreen() ? ">" : "Post Comment"}
				submittingText="Posting..."
				id={props.id}
			/>
		</ErrorBoundary>
	);
}

// Export the default
export default CommentForm;
