import { createSignal } from "solid-js";
import { ErrorBoundary } from "solid-js";
import { ErrorFallback } from "./ErrorFallback";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";

interface CommentFormProps {
	onSubmit: (text: string) => Promise<void>;
	placeholder?: string;
	id: string;
	parentCommentId?: string;
	inReplyTo?: string;
}

/**
 * Component for submitting a comment or reply
 */
export function CommentForm({
	onSubmit,
	placeholder = "Write a comment...",
	id,
	parentCommentId,
}: CommentFormProps) {
	const [text, setText] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const z = useZero();
	const [parentComment] = useQuery(() =>
		z.query.comment.where("id", parentCommentId || "").one(),
	);
	const inReplyTo = parentComment()?.displayName;

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!text().trim()) return;

		setIsSubmitting(true);
		try {
			await onSubmit(text().trim());
			setText(""); // Clear the input after successful submission
		} catch (error) {
			console.error("Failed to submit comment:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

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
			<form onSubmit={handleSubmit} class="comment-form" id={id}>
				{inReplyTo && (
					<div class="reply-indicator">
						Replying to <span class="reply-name">{inReplyTo}</span>
					</div>
				)}

				<label for={`${id}-text`} class="sr-only">
					Comment
				</label>
				<textarea
					id={`${id}-text`}
					value={text()}
					onInput={(e) => setText(e.target.value)}
					placeholder={placeholder}
					disabled={isSubmitting()}
					rows={3}
					required
				/>

				<div class="form-actions">
					<button
						type="submit"
						disabled={isSubmitting() || !text().trim()}
						aria-busy={isSubmitting()}
					>
						{isSubmitting() ? "Posting..." : "Post Comment"}
					</button>
				</div>
			</form>
		</ErrorBoundary>
	);
}
