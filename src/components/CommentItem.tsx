import { createSignal, Show, createMemo, Suspense, onCleanup } from "solid-js";
import { ErrorBoundary } from "solid-js";
import type { Comment } from "../schema";
import { getNameFromUserId } from "../nameGenerator";
import CommentForm from "./CommentForm";
import { ErrorFallback } from "./ErrorFallback";
import { MAX_REPLIES_SHOWN } from "../utils/constants";
import { randID } from "../rand";
import { SkeletonLoader } from "./SkeletonLoader";
import { PaginatedList } from "./PaginatedList";
import { useZero } from "../context/ZeroContext";
import { useUser } from "../hooks/useUser";
import { useCommentReplies } from "../hooks/useComments";
import { ReactionButtons } from "./ReactionButtons";
import { UserAvatar } from "./UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { useIsScreenSmallerThan } from "../hooks/useScreenSize";
import { useRelativeTime } from "../hooks/useRelativeTime";
import { Modal } from "./Modal";

interface CommentItemProps {
	comment: Comment;
	depth?: number;
	maxDepth?: number;
	maxVisibleReplies?: number;
}

/**
 * Component for displaying a comment with nested replies
 * TODO - use a modal for viewing threads on small screens
 */
export function CommentItem(props: CommentItemProps) {
	const z = useZero();
	const [showReplyForm, setShowReplyForm] = createSignal(false);
	const [isDeleting, setIsDeleting] = createSignal(false);
	const [expandThread, setExpandThread] = createSignal(false);
	const depth = props.depth || 0;
	const maxVisibleReplies = props.maxVisibleReplies || MAX_REPLIES_SHOWN;
	const { displayName, userId } = useUser();
	const isSmallScreen = useIsScreenSmallerThan({
		sizeBreakpoint: 768,
	});

	// Use the dedicated hook to fetch replies with reactive updates
	const { replies: allReplies } = useCommentReplies({
		commentId: props.comment.id,
	});

	const maxDepth = isSmallScreen() ? 1 : props.maxDepth || 2;

	// Determine if we should show nested replies based on the depth and expandThread state
	const canAutoExpandReplies = createMemo(
		() => depth < maxDepth || expandThread(),
	);

	// Get the comment author's display name
	const commentAuthor = createMemo(() => {
		return props.comment.displayName || getNameFromUserId(props.comment.userId);
	});

	const relativeTime = useRelativeTime(props.comment.timestamp);

	const handleAddReply = async (text: string) => {
		try {
			await z.mutate.comment.insert({
				id: randID(),
				body: text,
				suggestionID: props.comment.suggestionID,
				parentCommentID: props.comment.id,
				timestamp: Date.now(),
				userId: z.userID,
				displayName: displayName() || "Anonymous",
				isRootComment: false,
			});

			setShowReplyForm(false);
		} catch (error) {
			console.error("Error adding reply:", error);
			throw error; // Re-throw to be caught by ErrorBoundary
		}
	};

	const deleteComment = async () => {
		if (!confirm("Are you sure you want to delete this comment?")) return;

		setIsDeleting(true);
		try {
			await z.mutate.comment.delete({ id: props.comment.id });
		} catch (error) {
			console.error("Failed to delete comment:", error);
			throw error; // Re-throw to be caught by ErrorBoundary
		} finally {
			setIsDeleting(false);
		}
	};

	// Check if user is the creator of this comment
	const isOwnComment = () => props.comment.userId === userId;
	const commentId = `comment-${props.comment.id}`;
	const replyButtonId = `reply-button-${props.comment.id}`;

	// Function to render a nested comment reply
	const renderCommentReply = (reply: Comment) => (
		<CommentItem
			comment={reply}
			depth={props.depth ? props.depth + 1 : 1}
			maxDepth={props.maxDepth || MAX_REPLIES_SHOWN}
			maxVisibleReplies={props.maxVisibleReplies || MAX_REPLIES_SHOWN}
		/>
	);

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
								onClick={deleteComment}
								disabled={isDeleting()}
								class="text-sm text-error hover:text-error-focus"
								aria-busy={isDeleting()}
							>
								{isDeleting() ? "Deleting..." : "Delete"}
							</button>
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
						</div>
					</Show>

					<ErrorBoundary
						fallback={(error, reset) => (
							<ErrorFallback
								error={error}
								reset={reset}
								message="Failed to load replies."
							/>
						)}
					>
						<Show when={allReplies().length > 0}>
							<div class="mt-3">
								<Suspense
									fallback={<SkeletonLoader type="comments" count={1} />}
								>
									{canAutoExpandReplies() ? (
										<div class="space-y-3">
											<PaginatedList
												items={allReplies()}
												defaultLimit={maxVisibleReplies}
												loadMoreText={`View all replies (${allReplies().length - maxVisibleReplies} more)`}
												className="space-y-3"
												renderItem={renderCommentReply}
											/>
										</div>
									) : (
										<div class="mt-2 text-sm opacity-70">
											<span>
												{allReplies().length} more{" "}
												{allReplies().length === 1 ? "reply" : "replies"}
											</span>
											<button
												type="button"
												class="ml-2 text-primary hover:text-primary-focus"
												onClick={() => setExpandThread(true)}
												aria-expanded={expandThread()}
											>
												View thread
											</button>
										</div>
									)}
								</Suspense>
							</div>
						</Show>
					</ErrorBoundary>
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
				</Modal>
			)}
		</ErrorBoundary>
	);
}
