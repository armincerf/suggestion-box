import {
	createSignal,
	Show,
	createMemo,
	Suspense,
	ErrorBoundary,
} from "solid-js";
import type { Suggestion, Comment } from "../../zero/schema";
import CommentForm from "./CommentForm";
import { NestedComment } from "./NestedComment";
import { ErrorFallback } from "../ErrorFallback";
import { MAX_COMMENTS_SHOWN } from "../../utils/constants";
import { SkeletonLoader } from "../SkeletonLoader";
import { PaginatedList } from "../PaginatedList";
import { FocusedThreadView } from "./FocusedThreadView";
import { cn } from "../../utils/cn";
import ChevronRight from "lucide-solid/icons/chevron-right";
import ChevronDown from "lucide-solid/icons/chevron-down";

interface CommentSectionProps {
	suggestionId: Suggestion["id"];
	comments: Readonly<Comment[]> | undefined;
	userId: string;
	displayName: string;
	onAddComment: (text: string) => Promise<void>;
	commentError: string | null;
	showCommentForm: boolean;
	selectedText: { start: number; end: number } | null;
	commentFormId: string; // ID for the form container
	newCommentInputId: string; // ID for the form input itself
}

// These could be props if more flexibility is needed
const ROOT_MAX_DEPTH = 1;
const ROOT_MAX_VISIBLE_REPLIES = 1;
const FOCUSED_MAX_DEPTH = ROOT_MAX_DEPTH + 3;

export function CommentSection(props: CommentSectionProps) {
	const [commentsExpanded, setCommentsExpanded] = createSignal(false);
	const [focusStack, setFocusStack] = createSignal<string[]>([]);

	const rootComments = createMemo(() => {
		return (props.comments || [])
			.filter((comment) => !comment.parentCommentId)
			.sort((a, b) => a.timestamp - b.timestamp);
	});
	const totalCommentCount = createMemo(() => (props.comments || []).length);

	const commentsWrapperId = `comments-wrapper-${props.suggestionId}`;

	const isThreadFocused = createMemo(() => focusStack().length > 0);
	const currentFocusedId = createMemo(() => {
		const stack = focusStack();
		return stack.length > 0 ? stack[stack.length - 1] : null;
	});

	const toggleComments = () => {
		const expanding = !commentsExpanded();
		setCommentsExpanded(expanding);
		if (!expanding) {
			setFocusStack([]); // Collapse focus view when closing comments list
		}
	};

	const handleViewThread = (commentId: string) => {
		setFocusStack((prev) => [...prev, commentId]);
		if (!commentsExpanded()) {
			setCommentsExpanded(true); // Auto-expand comments if focusing a thread
		}
		// Optional: Scroll management could be added here
	};

	const handleGoBack = () => {
		setFocusStack((prev) => prev.slice(0, -1));
		// Optional: Scroll management could be added here
	};

	return (
		<>
			<Show when={props.showCommentForm}>
				<div
					class="mt-3 card border card-body p-3 comment-form-container"
					id={props.commentFormId}
				>
					<CommentForm
						id={props.newCommentInputId}
						onSubmit={props.onAddComment}
						placeholder={
							props.selectedText
								? "Comment on selection..."
								: "Add a comment..."
						}
						displayName={props.displayName}
						autoFocus={true}
					/>
					<Show when={props.commentError}>
						<p class="text-error text-xs mt-1">{props.commentError}</p>
					</Show>
				</div>
			</Show>

			<ErrorBoundary
				fallback={(error, reset) => (
					<ErrorFallback
						error={error}
						reset={reset}
						message="Failed to load comments."
					/>
				)}
			>
				<Suspense fallback={<SkeletonLoader type="comments" count={1} />}>
					<div
						class={`mt-3 border-t pt-2 ${
							totalCommentCount() === 0 ? "opacity-60" : ""
						}`}
					>
						<button
							type="button"
							class="btn btn-ghost btn-xs -ml-2 w-full justify-start text-left"
							onClick={toggleComments}
							aria-expanded={commentsExpanded()}
							aria-controls={commentsWrapperId}
						>
							<span class="flex items-center gap-1">
								{commentsExpanded() ? (
									<ChevronDown class="w-4 h-4" />
								) : (
									<ChevronRight class="w-4 h-4" />
								)}
								<span>Comments ({totalCommentCount()})</span>
							</span>
						</button>

						<div
							id={commentsWrapperId}
							class={cn(
								"mt-2 grid transition-[grid-template-rows] duration-300 ease-in-out",
								commentsExpanded() ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
							)}
						>
							<div class={cn("overflow-hidden")}>
								<div class={cn("transition-opacity duration-200 ease-in-out", commentsExpanded() ? "opacity-100 delay-100" : "opacity-0")}>
									<Show
										when={!isThreadFocused()}
										fallback={
											<Show when={currentFocusedId()}>
												{(fcId) => (
													<FocusedThreadView
														focusedCommentId={fcId}
														onGoBack={handleGoBack}
														onViewThread={handleViewThread}
														maxDepth={FOCUSED_MAX_DEPTH}
														maxVisibleDirectReplies={ROOT_MAX_VISIBLE_REPLIES}
													/>
												)}
											</Show>
										}
									>
										<Show
											when={rootComments().length > 0}
											fallback={
												<Show when={commentsExpanded()}>
													<div class="flex items-center justify-center min-h-[50px] text-sm opacity-70 p-4">
														No comments yet.
													</div>
												</Show>
											}
										>
											<PaginatedList
												className="paginated-list p-1"
												items={rootComments()}
												defaultLimit={MAX_COMMENTS_SHOWN}
												loadMoreText={`View all (${
													rootComments().length - MAX_COMMENTS_SHOWN
												} more)`}
												renderItem={(comment) => {
													const commentAccessor = createMemo(() => comment);
													return (
														<NestedComment
															comment={commentAccessor}
															depth={0}
															maxDepth={ROOT_MAX_DEPTH}
															maxVisibleDirectReplies={ROOT_MAX_VISIBLE_REPLIES}
															onViewThread={handleViewThread} />
													);
												}}
											/>
										</Show>
									</Show>
								</div>
							</div>
						</div>
					</div>
				</Suspense>
			</ErrorBoundary>
		</>
	);
}
