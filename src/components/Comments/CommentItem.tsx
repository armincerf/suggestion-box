import {
	createSignal,
	Show,
	For,
	createMemo,
	type Accessor,
	Index,
} from "solid-js";
import { ErrorBoundary } from "solid-js";
import type { Comment } from "../../../shared/zero/schema";
import { getNameFromUserId } from "../../nameGenerator";
import CommentForm from "./CommentForm";
import { ErrorFallback } from "../ErrorFallback";
import { useZero } from "../../zero/ZeroContext";
import { useUser } from "../../hooks/data/useUser";
import { ReactionButtons } from "../ReactionButtons";
import { UserAvatar } from "../UserAvatar";
import { useIsScreenSmallerThan } from "../../hooks/ui/useScreenSize";
import { useRelativeTime } from "../../hooks/ui/useRelativeTime";
import { Modal } from "../Modal";
import {
	useAddComment,
	useDeleteComment,
} from "../../hooks/mutations/suggestionMutations";
import { createLogger } from "../../hyperdx-logger";
import { useCommentReplies } from "../../hooks/data/useComments";
import { NestedComment } from "./NestedComment";
import { pluralize } from "../../utils/common";

const logger = createLogger("suggestion-box:CommentItem");

export interface CommentItemProps {
	comment: Accessor<Comment>;
	depth: number; // Current nesting depth
	maxDepth: number; // Max depth before "View Thread"
	maxVisibleDirectReplies: number; // How many replies to show initially
	onViewThread: (commentId: string) => void; // Add this prop
}

/**
 * Component for displaying a comment, handling replies recursively.
 */
export function CommentItem(props: CommentItemProps) {
	const z = useZero();
	const [showReplyForm, setShowReplyForm] = createSignal(false);
	const [isDeleting, setIsDeleting] = createSignal(false);
	const [replyError, setReplyError] = createSignal<string | null>(null);
	const [deleteError, setDeleteError] = createSignal<string | null>(null);
	const [showAllDirectReplies, setShowAllDirectReplies] = createSignal(false);
	const { displayName, userId } = useUser();
	const isSmallScreen = useIsScreenSmallerThan({
		sizeBreakpoint: 768,
	});

	const addComment = useAddComment();
	const deleteComment = useDeleteComment();
	const commentId = createMemo(() => props.comment().id);

	const { replies } = useCommentReplies({ commentId: commentId });

	// Get the comment author's display name
	const commentAuthor = () => {
		return (
			props.comment().displayName || getNameFromUserId(props.comment().userId)
		);
	};

	const relativeTime = useRelativeTime(() => props.comment().timestamp);

	const handleAddReply = async (text: string) => {
		setReplyError(null);

		const result = await addComment(
			text,
			props.comment().suggestionId,
			props.comment().id, // parentCommentId
			null, // selectionStart
			null, // selectionEnd
		);

		if (result.success) {
			setShowReplyForm(false);
		} else {
			setReplyError("Failed to add reply. Please try again.");
			logger.error("Error adding reply:", result.error);
			throw result.error; // Re-throw to be caught by ErrorBoundary
		}
	};

	const handleDeleteComment = async () => {
		if (!confirm("Are you sure you want to delete this comment?")) return;

		setIsDeleting(true);
		setDeleteError(null);

		try {
			const result = await deleteComment(props.comment().id);

			if (!result.success) {
				setDeleteError("Failed to delete comment. Please try again.");
				logger.error("Error deleting comment:", result.error);
			}
		} catch (error) {
			logger.error("Failed to delete comment:", error);
			setDeleteError(
				"An unexpected error occurred while deleting the comment.",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	const visibleReplies = createMemo(() => {
		const allReplies = replies() || [];
		if (showAllDirectReplies()) {
			return allReplies;
		}
		return allReplies.slice(0, props.maxVisibleDirectReplies);
	});

	const isOwnComment = () => props.comment().userId === userId;
	const commentIdStr = `comment-${props.comment().id}`;
	const replyButtonId = `reply-button-${props.comment().id}`;
	const viewThreadButtonId = `view-thread-button-${props.comment().id}`;

	const handleViewThreadClick = () => {
		props.onViewThread(props.comment().id);
	};

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
				class="flex space-x-3 py-2 comment-item"
				id={commentIdStr}
				aria-labelledby={`${commentIdStr}-body`}
			>
				<UserAvatar
					userId={props.comment().userId}
					displayName={commentAuthor()}
					size="sm"
					editable={props.comment().userId === userId}
				/>

				<div class="flex-1 space-y-1">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<span class="font-medium truncate hidden md:block md:max-w-[200px] lg:max-w-[300px]">
								{commentAuthor()}
							</span>
							<span class="text-sm opacity-70">{relativeTime()}</span>
						</div>

						<Show when={isOwnComment() && !isDeleting()}>
							<button
								type="button"
								onClick={handleDeleteComment}
								class="btn btn-xs btn-ghost text-error hover:bg-error hover:text-error-content ml-2"
								aria-label="Delete comment"
								title="Delete comment"
							>
								✕
							</button>
						</Show>
						<Show when={isDeleting()}>
							<span class="loading loading-spinner loading-xs ml-2" />
						</Show>
					</div>

					<Show when={deleteError()}>
						<div class="text-error text-sm">{deleteError()}</div>
					</Show>

					<div
						class="text-base-content prose prose-sm max-w-none"
						id={`${commentIdStr}-body`}
					>
						{props.comment().body}
					</div>

					<div class="flex items-center space-x-2 text-sm">
						<ReactionButtons entity={props.comment()} />
						<button
							type="button"
							id={replyButtonId}
							onClick={() => setShowReplyForm(!showReplyForm())}
							aria-expanded={showReplyForm()}
							aria-controls={
								showReplyForm() ? `reply-form-${props.comment().id}` : undefined
							}
							class="btn btn-xs btn-ghost"
						>
							{showReplyForm() ? "Cancel" : "Reply"}
						</button>
					</div>

					<Show when={showReplyForm() && !isSmallScreen()}>
						<div class="mt-3" id={`reply-form-${props.comment().id}`}>
							<CommentForm
								onSubmit={handleAddReply}
								placeholder={`Reply to ${
									props.comment().displayName || "Unknown User"
								}`}
								id={`reply-form-input-${props.comment().id}`}
								inReplyTo={props.comment().displayName || "Unknown User"}
								displayName={displayName()}
								autoFocus={true}
							/>
							<Show when={replyError()}>
								<div class="text-error text-sm mt-2">{replyError()}</div>
							</Show>
						</div>
					</Show>

					<Show when={replies() && replies().length > 0}>
						<div class="mt-2 space-y-2 border-l-2 border-base-300/70 pl-3">
							<Show when={props.depth < props.maxDepth}>
								<Index each={visibleReplies()}>
									{(reply) => (
										<NestedComment
											comment={reply}
											depth={props.depth + 1}
											maxDepth={props.maxDepth}
											maxVisibleDirectReplies={props.maxVisibleDirectReplies}
											onViewThread={props.onViewThread}
										/>
									)}
								</Index>
								<Show
									when={
										!showAllDirectReplies() &&
										replies().length > props.maxVisibleDirectReplies
									}
								>
									<button
										type="button"
										class="btn btn-xs btn-ghost text-info"
										onClick={() => setShowAllDirectReplies(true)}
									>
										Show {replies().length - props.maxVisibleDirectReplies} more
										{pluralize(
											" reply",
											replies().length - props.maxVisibleDirectReplies,
										)}
									</button>
								</Show>
							</Show>

							<Show
								when={props.depth >= props.maxDepth && replies().length > 0}
							>
								<button
									type="button"
									id={viewThreadButtonId}
									class="btn btn-xs btn-ghost text-accent"
									onClick={handleViewThreadClick}
								>
									View Thread ({replies().length}{" "}
									{pluralize("reply", replies().length)})
								</button>
							</Show>
						</div>
					</Show>
				</div>
			</div>

			{showReplyForm() && isSmallScreen() && (
				<Modal
					isOpen={showReplyForm()}
					onClose={() => setShowReplyForm(false)}
					title={`Reply to ${commentAuthor()}`}
				>
					<div class="p-4">
						<p class="text-sm opacity-70 border-l-4 border-base-300 pl-2">
							{props.comment().body}
						</p>
					</div>
					<CommentForm
						onSubmit={handleAddReply}
						placeholder="Write a reply..."
						id={`reply-form-input-modal-${props.comment().id}`}
						inReplyTo={props.comment().displayName || "Unknown User"}
						displayName={displayName()}
						autoFocus={true}
					/>
					<Show when={replyError()}>
						<div class="text-error text-sm mt-2 px-4">{replyError()}</div>
					</Show>
				</Modal>
			)}
		</ErrorBoundary>
	);
}
