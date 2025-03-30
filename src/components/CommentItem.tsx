import { createSignal, Show } from "solid-js";
import { ErrorBoundary } from "solid-js";
import type { Comment } from "../zero/schema";
import { getNameFromUserId } from "../nameGenerator";
import CommentForm from "./CommentForm";
import { ErrorFallback } from "./ErrorFallback";
import { useZero } from "../zero/ZeroContext";
import { useUser } from "../hooks/data/useUser";
import { ReactionButtons } from "./ReactionButtons";
import { UserAvatar } from "./UserAvatar";
import { useIsScreenSmallerThan } from "../hooks/ui/useScreenSize";
import { useRelativeTime } from "../hooks/ui/useRelativeTime";
import { Modal } from "./Modal";
import { useAddComment, useDeleteComment } from "../hooks/mutations/suggestionMutations";

export interface CommentItemProps {
	comment: Comment;
	depth?: number;
}

/**
 * Component for displaying a comment (simplified version)
 */
export function CommentItem(props: CommentItemProps) {
	const z = useZero();
	const [showReplyForm, setShowReplyForm] = createSignal(false);
	const [isDeleting, setIsDeleting] = createSignal(false);
	const [replyError, setReplyError] = createSignal<string | null>(null);
	const [deleteError, setDeleteError] = createSignal<string | null>(null);
	const depth = props.depth || 0;
	const { displayName, userId } = useUser();
	const isSmallScreen = useIsScreenSmallerThan({
		sizeBreakpoint: 768,
	});
	
	const addComment = useAddComment();
	const deleteComment = useDeleteComment(() => {
		// Nothing special to do on success
	});

	// Get the comment author's display name 
	const commentAuthor = () => {
		return props.comment.displayName || getNameFromUserId(props.comment.userId);
	};

	const relativeTime = useRelativeTime(() => props.comment.timestamp);

	const handleAddReply = async (text: string) => {
		setReplyError(null);
		
		const result = await addComment(
			text,
			props.comment.suggestionId,
			z.userID,
			displayName() || "Anonymous",
			props.comment.id, // parentCommentId
			null, // selectionStart
			null  // selectionEnd
		);
		
		if (result.success) {
			setShowReplyForm(false);
		} else {
			setReplyError("Failed to add reply. Please try again.");
			console.error("Error adding reply:", result.error);
			throw result.error; // Re-throw to be caught by ErrorBoundary
		}
	};

	const handleDeleteComment = async () => {
		if (!confirm("Are you sure you want to delete this comment?")) return;

		setIsDeleting(true);
		setDeleteError(null);
		
		try {
			const result = await deleteComment(props.comment.id);
			
			if (!result.success) {
				setDeleteError("Failed to delete comment. Please try again.");
				console.error("Error deleting comment:", result.error);
			}
		} catch (error) {
			console.error("Failed to delete comment:", error);
			setDeleteError("An unexpected error occurred while deleting the comment.");
		} finally {
			setIsDeleting(false);
		}
	};

	// Check if user is the creator of this comment
	const isOwnComment = () => props.comment.userId === userId;
	const commentId = `comment-${props.comment.id}`;
	const replyButtonId = `reply-button-${props.comment.id}`;

	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="An error occurred with this comment."
				/>
			)}
		>
			<div
				class="flex space-x-3 py-4"
				id={commentId}
				aria-labelledby={`${commentId}-body`}
				style={{
					"margin-left": `${depth > 0 ? 20 : 0}px`,
					"border-left":
						depth > 0 ? "2px solid var(--border-color, #e0e0e0)" : "none",
					"padding-left": depth > 0 ? "15px" : "0",
				}}
			>
				<UserAvatar
					userId={props.comment.userId}
					displayName={commentAuthor()}
					size="sm"
					editable={props.comment.userId === userId}
				/>

				<div class="flex-1 space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<span class="font-medium truncate hidden md:block md:max-w-[200px] lg:max-w-[300px]">
								{commentAuthor()}
							</span>
							<span class="text-sm opacity-70">{relativeTime()}</span>
						</div>

						<Show when={isOwnComment()}>
							<button
								type="button"
								onClick={handleDeleteComment}
								disabled={isDeleting()}
								class="text-sm text-error hover:text-error-focus"
								aria-busy={isDeleting()}
							>
								{isDeleting() ? "Deleting..." : "Delete"}
							</button>
							<Show when={deleteError()}>
								<div class="text-error text-sm">{deleteError()}</div>
							</Show>
						</Show>
					</div>

					<div class="text-base-content" id={`${commentId}-body`}>
						{props.comment.body}
					</div>

					<div class="flex items-center space-x-4 text-sm">
						<div class="flex items-center">
							<ReactionButtons entity={props.comment} />
						</div>

						<button
							type="button"
							id={replyButtonId}
							onClick={() => setShowReplyForm(!showReplyForm())}
							aria-expanded={showReplyForm()}
							aria-controls={
								showReplyForm() ? `reply-form-${props.comment.id}` : undefined
							}
							class="btn btn-sm btn-ghost"
						>
							{showReplyForm() ? "Cancel" : "Reply"}
						</button>
					</div>

					<Show when={showReplyForm() && !isSmallScreen()}>
						<div class="mt-3" id={`reply-form-${props.comment.id}`}>
							<CommentForm
								onSubmit={handleAddReply}
								placeholder={`Reply to ${props.comment.displayName || "Unknown User"}`}
								id={`reply-form-input-${props.comment.id}`}
								parentCommentId={props.comment.id}
								inReplyTo={props.comment.displayName || "Unknown User"}
								displayName={displayName()}
							/>
							<Show when={replyError()}>
								<div class="text-error text-sm mt-2">{replyError()}</div>
							</Show>
						</div>
					</Show>
				</div>
			</div>
			
			{showReplyForm() && isSmallScreen() && (
				<Modal
					isOpen={showReplyForm()}
					onClose={() => setShowReplyForm(false)}
					title="Reply"
				>
					<div class="p-4">
						<p class="text-sm opacity-70">{props.comment.body}</p>
					</div>
					<CommentForm
						onSubmit={handleAddReply}
						placeholder="Write a reply..."
						id={`reply-form-input-${props.comment.id}`}
						parentCommentId={props.comment.id}
						inReplyTo={props.comment.displayName || "Unknown User"}
						displayName={displayName()}
					/>
					<Show when={replyError()}>
						<div class="text-error text-sm mt-2 px-4">{replyError()}</div>
					</Show>
				</Modal>
			)}
		</ErrorBoundary>
	);
}
