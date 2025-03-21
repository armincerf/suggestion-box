import { createSignal, Show, createMemo, Suspense } from "solid-js";
import { ErrorBoundary } from "solid-js";
import type { Suggestion } from "../schema";
import { getNameFromUserId } from "../nameGenerator";
import CommentForm from "./CommentForm";
import { NestedComment } from "./NestedComment";
import { ErrorFallback } from "./ErrorFallback";
import { MAX_COMMENTS_SHOWN } from "../utils/constants";
import { randID } from "../rand";
import { SkeletonLoader } from "./SkeletonLoader";
import { PaginatedList } from "./PaginatedList";
import { useZero } from "../context/ZeroContext";
import { ReactionButtons } from "./ReactionButtons";
import { UserAvatar } from "./UserAvatar";
import { useRelativeTime } from "../hooks/useRelativeTime";
import { ChevronRight } from "lucide-solid";

export interface SuggestionItemProps {
	suggestion: Suggestion;
	userIdentifier: string;
	displayName: string;
	readOnly?: boolean;
}

/**
 * Component for displaying a suggestion with comments (styled with daisyUI)
 */
export function SuggestionItem(props: SuggestionItemProps) {
	const suggestion = () => props.suggestion;
	const userIdentifier = () => props.userIdentifier;
	const displayName = () => props.displayName;

	const z = useZero();

	const [showCommentForm, setShowCommentForm] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [editedBody, setEditedBody] = createSignal(suggestion().body);
	const [isSubmittingEdit, setIsSubmittingEdit] = createSignal(false);
	const [selectedText, setSelectedText] = createSignal<{
		start: number;
		end: number;
	} | null>(null);
	const [commentsExpanded, setCommentsExpanded] = createSignal(false);

	const suggestionAuthor = createMemo(() => {
		return (
			suggestion().displayName || getNameFromUserId(suggestion().userIdentifier)
		);
	});

	const rootComments = createMemo(() => {
		return suggestion().comments.filter((comment) => comment.isRootComment);
	});

	const suggestionId = `suggestion-${suggestion().id}`;
	const commentFormId = `comment-form-${suggestion().id}`;
	const commentBtnId = `comment-btn-${suggestion().id}`;

	const handleTextSelection = () => {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
			setSelectedText(null);
			return;
		}

		const range = selection.getRangeAt(0);
		const container = document.getElementById(suggestionId);
		if (!container || !container.contains(range.commonAncestorContainer)) {
			setSelectedText(null);
			return;
		}

		const preSelectionRange = range.cloneRange();
		preSelectionRange.selectNodeContents(container);
		preSelectionRange.setEnd(range.startContainer, range.startOffset);
		const start = preSelectionRange.toString().length;
		const length = range.toString().length;

		if (length > 0) {
			setSelectedText({ start, end: start + length });
			setShowCommentForm(true);
		} else {
			setSelectedText(null);
		}
	};

	const handleAddComment = async (text: string) => {
		try {
			const sel = selectedText();
			await z.mutate.comment.insert({
				id: randID(),
				body: text,
				suggestionID: suggestion().id,
				selectionStart: sel?.start,
				selectionEnd: sel?.end,
				timestamp: Date.now(),
				userIdentifier: z.userID,
				displayName: displayName(),
				parentCommentID: null, // Top-level comments have no parent
				isRootComment: true, // Mark as root comment
			});

			// Clear the form and selection after submitting
			setShowCommentForm(false);
			setSelectedText(null);
			// Auto-expand comments when a new comment is added
			setCommentsExpanded(true);
		} catch (error) {
			console.error("Error adding comment:", error);
			throw error;
		}
	};

	const submitEdit = async () => {
		if (!editedBody().trim()) return;

		setIsSubmittingEdit(true);
		try {
			await z.mutate.suggestion.update({
				id: suggestion().id,
				body: editedBody().trim(),
				categoryID: suggestion().categoryID, // Keep the same category
			});
			setIsEditing(false);
		} catch (error) {
			console.error("Failed to update suggestion:", error);
			throw error; // Re-throw to be caught by ErrorBoundary
		} finally {
			setIsSubmittingEdit(false);
		}
	};

	// Toggle comments expanded/collapsed state
	const toggleComments = () => {
		setCommentsExpanded((prev) => !prev);
	};

	// Check if user is the creator of this suggestion
	const isOwnSuggestion = () =>
		suggestion().userIdentifier === userIdentifier();

	const relativeDate = useRelativeTime(suggestion().timestamp);

	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="An error occurred with this suggestion."
				/>
			)}
		>
			{/* 
				Main container styled as a "card" with daisyUI 
				Include a shadow, margin, etc.
			*/}
			<div
				class="card card-sm sm:card-md lg:card-lg w-full bg-base-100 shadow-md suggestion-item"
				aria-labelledby={`${suggestionId}-title`}
			>
				<div class="card-body">
					{/* Top meta (author & date) */}
					<div class="flex items-center justify-between suggestion-meta mb-2">
						<div class="flex items-center gap-2">
							<UserAvatar
								userIdentifier={suggestion().userIdentifier}
								displayName={suggestionAuthor()}
							/>
							<div class="suggestion-author font-semibold text-md truncate max-w-[200px]">
								{suggestionAuthor()}
							</div>
						</div>
						<span class="suggestion-date text-sm opacity-70">
							{relativeDate()}
						</span>
					</div>

					{/* sr-only heading for accessibility */}
					<div class="sr-only" id={`${suggestionId}-title`}>
						Suggestion from {new Date(suggestion().timestamp).toLocaleString()}
					</div>

					{/* Actual suggestion body or edit mode */}
					<Show
						when={!isEditing()}
						fallback={
							<div class="edit-suggestion-form mt-4">
								<label for={`edit-${suggestionId}`} class="sr-only">
									Edit suggestion
								</label>
								<textarea
									id={`edit-${suggestionId}`}
									class="textarea textarea-bordered w-full"
									value={editedBody()}
									onInput={(e) => setEditedBody(e.target.value)}
									rows={4}
									disabled={isSubmittingEdit()}
								/>
								<div class="flex justify-end gap-2 mt-2">
									<button
										type="button"
										class="btn btn-ghost"
										onClick={() => setIsEditing(false)}
										disabled={isSubmittingEdit()}
									>
										Cancel
									</button>
									<button
										type="button"
										class="btn btn-primary"
										onClick={submitEdit}
										disabled={isSubmittingEdit() || !editedBody().trim()}
										aria-busy={isSubmittingEdit()}
									>
										{isSubmittingEdit() ? "Saving..." : "Save Changes"}
									</button>
								</div>
							</div>
						}
					>
						<section
							id={suggestionId}
							class="suggestion-body mt-2"
							onMouseUp={handleTextSelection}
							aria-label="Suggestion content"
						>
							{suggestion().body}
						</section>
					</Show>

					{/* Reaction buttons + comment/edit/report actions */}
					<div class="mt-4 flex flex-wrap gap-2 items-center suggestion-actions">
						{/* Reaction Buttons */}
						<ReactionButtons entity={suggestion()} />

						{/* Comment + Edit + Report */}
						<div class="flex-grow" />
						<Show when={!isEditing()}>
							<button
								type="button"
								id={commentBtnId}
								class={`btn btn-sm ${
									showCommentForm() ? "btn-ghost" : "btn-primary"
								}`}
								onClick={() => {
									setShowCommentForm(!showCommentForm());
									setSelectedText(null);
								}}
								aria-expanded={showCommentForm()}
								aria-controls={showCommentForm() ? commentFormId : undefined}
							>
								{showCommentForm() ? "Cancel" : "Comment"}
							</button>

							<Show when={isOwnSuggestion()}>
								<button
									type="button"
									class="btn btn-sm btn-accent"
									onClick={() => setIsEditing(true)}
									aria-label="Edit suggestion"
								>
									Edit
								</button>
							</Show>
						</Show>

						<button
							type="button"
							onClick={() => {
								window.location.href =
									"https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=ygUjcmljayBhc3RsZXkgbmV2ZXIgZ29ubmEgZ2l2ZSB5b3UgdXA%3D";
							}}
							class="btn btn-sm btn-error"
							aria-label="Report as illegal"
						>
							Report
						</button>
					</div>

					{/* Comment form for new comments */}
					<Show when={showCommentForm()}>
						<div
							class="mt-4 card border card-body comment-form-container"
							id={commentFormId}
						>
							<ErrorBoundary
								fallback={(error, reset) => (
									<ErrorFallback
										error={error}
										reset={reset}
										message="Failed to post comment."
									/>
								)}
							>
								<CommentForm
									onSubmit={handleAddComment}
									placeholder={
										selectedText()
											? `Comment on "${selectedText()}"`
											: "Write a comment..."
									}
									id={`comment-form-${suggestion().id}`}
									displayName={displayName()}
								/>
								<Show when={selectedText()}>
									<div class="selected-text mt-2 text-sm" aria-live="polite">
										<strong>Selected text:</strong>{" "}
										<span class="badge badge-neutral badge-sm">
											{suggestion().body.substring(
												selectedText()?.start || 0,
												selectedText()?.end || 0,
											)}
										</span>
									</div>
								</Show>
							</ErrorBoundary>
						</div>
					</Show>

					{/* Comments Section */}
					<ErrorBoundary
						fallback={(error, reset) => (
							<ErrorFallback
								error={error}
								reset={reset}
								message="Failed to load comments."
							/>
						)}
					>
						<Suspense fallback={<SkeletonLoader type="comments" count={2} />}>
							<div
								class={`mt-4 border-t pt-2 ${
									commentsExpanded() ? "border-t-2" : ""
								} ${rootComments().length === 0 ? "opacity-50" : ""}`}
							>
								{/* Toggle button to expand/collapse comments */}
								<button
									type="button"
									class="btn btn-ghost btn-xs"
									onClick={toggleComments}
									aria-expanded={commentsExpanded()}
									aria-label={
										commentsExpanded() ? "Hide comments" : "Show comments"
									}
								>
									{/* Let's show arrow + the count */}
									<span class="flex items-center gap-1">
										<span
											class={`transition-transform ${
												commentsExpanded() ? "rotate-90" : "rotate-0 font-sm"
											}`}
										>
											<ChevronRight class="w-4 h-4" />
										</span>
										<span>Comments ({suggestion().comments.length || 0})</span>
									</span>
								</button>

								{/* Comments content */}
								<Show when={commentsExpanded() && rootComments().length > 0}>
									<div class="mt-3 space-y-2">
										<PaginatedList
											items={rootComments()}
											defaultLimit={MAX_COMMENTS_SHOWN}
											loadMoreText={`View all comments (${
												rootComments().length - MAX_COMMENTS_SHOWN
											} more)`}
											renderItem={(comment) => (
												<NestedComment
													comment={comment}
													depth={0}
													maxDepth={3}
													maxVisibleReplies={MAX_COMMENTS_SHOWN}
												/>
											)}
										/>
									</div>
								</Show>
							</div>
						</Suspense>
					</ErrorBoundary>
				</div>
			</div>
		</ErrorBoundary>
	);
}
