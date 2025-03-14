import { useQuery } from "@rocicorp/zero/solid";
import type { Zero } from "@rocicorp/zero";
import type { Schema, Suggestion, Comment, Reaction } from "./schema";
import { createSignal, For, Show, createMemo, Switch, Match } from "solid-js";
import { randID } from "./rand";

// Custom hook for reaction statistics
function useReactionStats(reactions: () => Reaction[], userIdentifier: string) {
	const reactionCounts = createMemo(() => {
		const counts: Record<string, number> = {};
		for (const r of reactions()) {
			counts[r.emoji] = (counts[r.emoji] || 0) + 1;
		}
		return counts;
	});

	const userReactions = createMemo(() => {
		const reacted: Record<string, boolean> = {};
		for (const r of reactions()) {
			if (r.userIdentifier === userIdentifier) {
				reacted[r.emoji] = true;
			}
		}
		return reacted;
	});

	return { reactionCounts, userReactions };
}

// Common emojis used throughout the app
const COMMON_EMOJIS = ["👍", "👎", "❤️", "😂", "😮"];

// Component for submitting a new suggestion
function SuggestionForm({
	z,
	userIdentifier,
}: { z: Zero<Schema>; userIdentifier: string }) {
	const [suggestion, setSuggestion] = createSignal("");
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [errorMessage, setErrorMessage] = createSignal("");

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!suggestion().trim()) return;

		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await z.mutate.suggestion.insert({
				id: randID(),
				body: suggestion().trim(),
				timestamp: Date.now(),
				userIdentifier,
			});
			setSuggestion("");
		} catch (error) {
			console.error("Error submitting suggestion:", error);
			setErrorMessage("Failed to submit suggestion. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} class="suggestion-form" aria-label="New suggestion form">
			<label for="suggestion-textarea" class="sr-only">Enter your suggestion</label>
			<textarea
				id="suggestion-textarea"
				value={suggestion()}
				onInput={(e) => setSuggestion(e.target.value)}
				placeholder="Enter your suggestion..."
				rows={4}
				disabled={isSubmitting()}
				aria-invalid={!!errorMessage()}
				aria-describedby={errorMessage() ? "suggestion-error" : undefined}
			/>
			<button 
				type="submit" 
				disabled={isSubmitting() || !suggestion().trim()}
				aria-busy={isSubmitting()}
			>
				{isSubmitting() ? "Submitting..." : "Submit Suggestion"}
			</button>

			<Show when={errorMessage()}>
				<div class="error-notification" id="suggestion-error" role="alert">{errorMessage()}</div>
			</Show>
		</form>
	);
}

// Component for displaying a reaction button
function ReactionButton(props: {
	emoji: string;
	count: number;
	isReacted: boolean;
	onToggle: (emoji: string) => Promise<void>;
}) {
	const handleClick = () => props.onToggle(props.emoji);

	return (
		<button
			type="button"
			class={`reaction-button ${props.isReacted ? "reacted" : ""}`}
			onClick={handleClick}
			aria-label={`${props.emoji} reaction (${props.count})`}
			aria-pressed={props.isReacted}
		>
			<span aria-hidden="true">{props.emoji}</span>
			<span>{props.count}</span>
		</button>
	);
}

// Component for a comment form
function CommentForm({
	onSubmit,
	placeholder = "Add a comment...",
	initialValue = "",
	id = "",
}: {
	onSubmit: (text: string) => void;
	placeholder?: string;
	initialValue?: string;
	id?: string;
}) {
	const [comment, setComment] = createSignal(initialValue);
	const [errorMessage, setErrorMessage] = createSignal("");
	const formId = id || `comment-form-${Math.random().toString(36).substring(2, 9)}`;
	const textareaId = `${formId}-textarea`;
	const errorId = `${formId}-error`;

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		if (!comment().trim()) return;

		setErrorMessage("");
		try {
			onSubmit(comment().trim());
			setComment("");
		} catch (error) {
			console.error("Error submitting comment:", error);
			setErrorMessage("Failed to submit comment. Please try again.");
		}
	};

	return (
		<form onSubmit={handleSubmit} class="comment-form" id={formId} aria-label="Comment form">
			<label for={textareaId} class="sr-only">Comment</label>
			<textarea
				id={textareaId}
				value={comment()}
				onInput={(e) => setComment(e.target.value)}
				placeholder={placeholder}
				rows={2}
				aria-invalid={!!errorMessage()}
				aria-describedby={errorMessage() ? errorId : undefined}
			/>
			<button type="submit" disabled={!comment().trim()}>
				Submit
			</button>

			<Show when={errorMessage()}>
				<div class="error-notification" id={errorId} role="alert">{errorMessage()}</div>
			</Show>
		</form>
	);
}

// Component for displaying a comment with nested replies
function CommentItem(props: {
	comment: Comment;
	z: Zero<Schema>;
	userIdentifier: string;
}) {
    const { z, userIdentifier } = props;
	const [showReplyForm, setShowReplyForm] = createSignal(false);
	const [isDeleting, setIsDeleting] = createSignal(false);
	const [errorMessage, setErrorMessage] = createSignal("");
	const [reactions] = useQuery(() =>
		z.query.reaction.where("commentID", props.comment.id),
	);

	const [replies] = useQuery(() =>
		z.query.comment
			.where("parentCommentID", props.comment.id)
			.orderBy("timestamp", "asc"),
	);

	const { reactionCounts, userReactions } = useReactionStats(
		reactions,
		userIdentifier,
	);

	const handleAddReply = async (text: string) => {
		setErrorMessage("");
		try {
			await z.mutate.comment.insert({
				id: randID(),
				body: text,
				suggestionID: props.comment.suggestionID,
				parentCommentID: props.comment.id,
				timestamp: Date.now(),
				userIdentifier,
			});
			setShowReplyForm(false);
		} catch (error) {
			console.error("Error adding reply:", error);
			setErrorMessage("Failed to add reply. Please try again.");
		}
	};

	const toggleReaction = async (emoji: string) => {
		const existingReaction = reactions().find(
			(r) => r.emoji === emoji && r.userIdentifier === userIdentifier,
		);

		setErrorMessage("");
		try {
			if (existingReaction) {
				await z.mutate.reaction.delete({ id: existingReaction.id });
			} else {
				await z.mutate.reaction.insert({
					id: randID(),
					commentID: props.comment.id,
					emoji,
					userIdentifier,
					timestamp: Date.now(),
				});
			}
		} catch (error) {
			console.error("Error toggling reaction:", error);
			setErrorMessage("Failed to toggle reaction. Please try again.");
		}
	};

	const deleteComment = async () => {
		if (!confirm("Are you sure you want to delete this comment?")) return;

		setIsDeleting(true);
		setErrorMessage("");
		try {
			await z.mutate.comment.delete({ id: props.comment.id });
		} catch (error) {
			console.error("Failed to delete comment:", error);
			setErrorMessage("You can only delete your own comments.");
			setIsDeleting(false);
		}
	};

	// Check if user is the creator of this comment
	const isOwnComment = () => props.comment.userIdentifier === userIdentifier;
	const commentId = `comment-${props.comment.id}`;
	const replyButtonId = `reply-button-${props.comment.id}`;
	const errorId = `error-${props.comment.id}`;

	return (
		<div class="comment" id={commentId} aria-labelledby={`${commentId}-body`}>
			<div class="comment-body" id={`${commentId}-body`}>{props.comment.body}</div>
			<div class="comment-meta">
				<span class="comment-date">
					{new Date(props.comment.timestamp).toLocaleString()}
				</span>

				<div class="comment-reactions">
					<For each={COMMON_EMOJIS}>
						{(emoji) => (
							<ReactionButton
								emoji={emoji}
								count={reactionCounts()[emoji] || 0}
								isReacted={userReactions()[emoji] || false}
								onToggle={toggleReaction}
							/>
						)}
					</For>
				</div>

				<button
					type="button"
					id={replyButtonId}
					onClick={() => setShowReplyForm(!showReplyForm())}
					aria-expanded={showReplyForm()}
					aria-controls={showReplyForm() ? `reply-form-${props.comment.id}` : undefined}
				>
					{showReplyForm() ? "Cancel" : "Reply"}
				</button>

				{isOwnComment() && (
					<button
						type="button"
						onClick={deleteComment}
						disabled={isDeleting()}
						class="delete-button"
						aria-busy={isDeleting()}
					>
						{isDeleting() ? "Deleting..." : "Delete"}
					</button>
				)}
			</div>

			<Show when={errorMessage()}>
				<div class="error-notification" id={errorId} role="alert">{errorMessage()}</div>
			</Show>

			{showReplyForm() && (
				<div class="reply-form" id={`reply-form-${props.comment.id}`}>
					<CommentForm
						onSubmit={handleAddReply}
						placeholder="Write a reply..."
						id={`reply-form-input-${props.comment.id}`}
					/>
				</div>
			)}

			{replies().length > 0 && (
				<div class="replies" aria-label="Replies to comment">
					<For each={replies()}>
						{(reply) => (
							<CommentItem
								comment={reply}
								z={z}
								userIdentifier={userIdentifier}
							/>
						)}
					</For>
				</div>
			)}
		</div>
	);
}

// Component for displaying a suggestion with comments
function SuggestionItem({
	suggestion,
	z,
	userIdentifier,
}: {
	suggestion: Suggestion;
	z: Zero<Schema>;
	userIdentifier: string;
}) {
	const [showCommentForm, setShowCommentForm] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [editedBody, setEditedBody] = createSignal(suggestion.body);
	const [isSubmittingEdit, setIsSubmittingEdit] = createSignal(false);
	const [errorMessage, setErrorMessage] = createSignal("");
	const [selectedText, setSelectedText] = createSignal<{
		start: number;
		end: number;
	} | null>(null);
	const [reactions] = useQuery(() =>
		z.query.reaction.where("suggestionID", suggestion.id),
	);

	// Query all comments for this suggestion
	const [allComments] = useQuery(() => 
		z.query.comment
			.where("suggestionID", suggestion.id)
			.orderBy("timestamp", "desc")
	);
	
	// Filter to get only top-level comments (no parentCommentID)
	const comments = createMemo(() => 
		allComments().filter(comment => !comment.parentCommentID)
	);

	const { reactionCounts, userReactions } = useReactionStats(
		reactions,
		userIdentifier,
	);
	
	const suggestionId = `suggestion-${suggestion.id}`;
	const commentFormId = `comment-form-${suggestion.id}`;
	const commentBtnId = `comment-btn-${suggestion.id}`;
	const errorId = `error-${suggestion.id}`;

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
		const selection = selectedText();
		setErrorMessage("");
		try {
			// Create a comment object with all required fields
			const commentData = {
				id: randID(),
				body: text,
				suggestionID: suggestion.id,
				parentCommentID: undefined as string | undefined,
				selectionStart: selection ? selection.start : undefined,
				selectionEnd: selection ? selection.end : undefined,
				timestamp: Date.now(),
				userIdentifier,
			};
			
			await z.mutate.comment.insert(commentData);
			setShowCommentForm(false);
			setSelectedText(null);
		} catch (error) {
			console.error("Error adding comment:", error);
			setErrorMessage("Failed to add comment. Please try again.");
		}
	};

	const submitEdit = async () => {
		if (!editedBody().trim()) return;

		setIsSubmittingEdit(true);
		setErrorMessage("");
		try {
			await z.mutate.suggestion.update({
				id: suggestion.id,
				body: editedBody().trim(),
			});
			setIsEditing(false);
		} catch (error) {
			console.error("Failed to update suggestion:", error);
			setErrorMessage("You can only edit your own suggestions.");
		} finally {
			setIsSubmittingEdit(false);
		}
	};

	const toggleReaction = async (emoji: string) => {
		const existingReactionId = reactions().find(
			(r) => r.emoji === emoji && r.userIdentifier === userIdentifier,
		)?.id;

		setErrorMessage("");
		try {
			if (existingReactionId) {
				await z.mutate.reaction.delete({ id: existingReactionId });
			} else {
				await z.mutate.reaction.insert({
					id: randID(),
					suggestionID: suggestion.id,
					emoji,
					userIdentifier,
					timestamp: Date.now(),
				});
			}
		} catch (error) {
			console.error("Error toggling reaction:", error);
			setErrorMessage("Failed to toggle reaction. Please try again.");
		}
	};

	// Check if user is the creator of this suggestion
	const isOwnSuggestion = () => suggestion.userIdentifier === userIdentifier;

	return (
		<div class="suggestion-item" aria-labelledby={`${suggestionId}-title`}>
			<div class="sr-only" id={`${suggestionId}-title`}>Suggestion from {new Date(suggestion.timestamp).toLocaleString()}</div>
			
			{!isEditing() ? (
				<section
					id={suggestionId}
					class="suggestion-body"
					onMouseUp={handleTextSelection}
					aria-label="Suggestion content"
				>
					{suggestion.body}
				</section>
			) : (
				<div class="edit-suggestion-form">
					<label for={`edit-${suggestionId}`} class="sr-only">Edit suggestion</label>
					<textarea
						id={`edit-${suggestionId}`}
						value={editedBody()}
						onInput={(e) => setEditedBody(e.target.value)}
						rows={4}
						disabled={isSubmittingEdit()}
						aria-invalid={!!errorMessage()}
						aria-describedby={errorMessage() ? errorId : undefined}
					/>
					<div class="edit-buttons">
						<button
							type="button"
							onClick={() => setIsEditing(false)}
							disabled={isSubmittingEdit()}
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={submitEdit}
							disabled={isSubmittingEdit() || !editedBody().trim()}
							aria-busy={isSubmittingEdit()}
						>
							{isSubmittingEdit() ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</div>
			)}

			<div class="suggestion-meta">
				<span class="suggestion-date">
					{new Date(suggestion.timestamp).toLocaleString()}
				</span>

				<div class="suggestion-reactions">
					<For each={COMMON_EMOJIS}>
						{(emoji) => (
							<ReactionButton
								emoji={emoji}
								count={reactionCounts()[emoji] || 0}
								isReacted={userReactions()[emoji] || false}
								onToggle={toggleReaction}
							/>
						)}
					</For>
				</div>

				{!isEditing() && (
					<>
						<button
							type="button"
							id={commentBtnId}
							onClick={() => {
								setShowCommentForm(!showCommentForm());
								setSelectedText(null);
							}}
							aria-expanded={showCommentForm()}
							aria-controls={showCommentForm() ? commentFormId : undefined}
						>
							{showCommentForm() ? "Cancel" : "Comment"}
						</button>

						{isOwnSuggestion() && (
							<button
								type="button"
								onClick={() => setIsEditing(true)}
								class="edit-button"
								aria-label="Edit suggestion"
							>
								Edit
							</button>
						)}
					</>
				)}
			</div>

			<Show when={errorMessage()}>
				<div class="error-notification" id={errorId} role="alert">{errorMessage()}</div>
			</Show>

			{showCommentForm() && (
				<div class="comment-form-container" id={commentFormId}>
					<CommentForm
						onSubmit={handleAddComment}
						placeholder={
							selectedText()
								? "Comment on selected text..."
								: "Add a comment..."
						}
						id={`comment-form-input-${suggestion.id}`}
					/>
					{selectedText() && (
						<div class="selected-text" aria-live="polite">
							<strong>Selected text:</strong>
							{suggestion.body.substring(
								selectedText()?.start || 0,
								selectedText()?.end || 0,
							)}
						</div>
					)}
				</div>
			)}

			{comments().length > 0 && (
				<div class="comments-section" aria-label={`Comments (${comments().length})`}>
					<h4>Comments ({comments().length})</h4>
					<For each={comments()}>
						{(comment) => (
							<CommentItem
								comment={comment}
								z={z}
								userIdentifier={userIdentifier}
							/>
						)}
					</For>
				</div>
			)}
		</div>
	);
}

// Component for the feedback page
function FeedbackPage({
	z,
	userIdentifier,
}: { z: Zero<Schema>; userIdentifier: string }) {
	const [page, setPage] = createSignal(1);
	const [errorMessage, setErrorMessage] = createSignal("");
	const pageSize = 10;

	const [suggestions] = useQuery(() =>
		z.query.suggestion.orderBy("timestamp", "desc").limit(page() * pageSize),
	);

	const loadMore = () => setPage((p) => p + 1);
	const hasMore = createMemo(() => suggestions().length === page() * pageSize);
	const errorId = "feedback-page-error";

	return (
		<div class="feedback-page">
			<h1>Submitted Feedback</h1>
			<a href="/" class="back-link" aria-label="Back to suggestion box">
				← Back to Suggestion Box
			</a>

			<Show when={errorMessage()}>
				<div class="error-notification" id={errorId} role="alert">{errorMessage()}</div>
			</Show>

			<Show
				when={suggestions().length > 0}
				fallback={<div>No suggestions have been submitted yet.</div>}
			>
				<div aria-label={`${suggestions().length} suggestions`}>
					<For each={suggestions()}>
						{(suggestion) => (
							<SuggestionItem
								suggestion={suggestion}
								z={z}
								userIdentifier={userIdentifier}
							/>
						)}
					</For>
				</div>
			</Show>

			<Show when={hasMore()}>
				<button 
					type="button" 
					onClick={loadMore}
					aria-label="Load more suggestions"
				>
					Load More
				</button>
			</Show>
		</div>
	);
}

// Main App component
function App({ z }: { z: Zero<Schema> }) {
	// Generate and store a user identifier in localStorage
	const [errorMessage, setErrorMessage] = createSignal("");
	const errorId = "app-error";

	const getUserIdentifier = () => {
		let identifier = localStorage.getItem("userIdentifier");
		if (!identifier) {
			// Create a new identifier if one doesn't exist
			identifier = randID();
			try {
				localStorage.setItem("userIdentifier", identifier);
			} catch (error) {
				console.error("Failed to store user identifier:", error);
				setErrorMessage(
					"Could not store user identifier. Some features may not work correctly."
				);
			}
		}
		return identifier;
	};

	const userIdentifier = getUserIdentifier();
	const path = window.location.pathname;

	return (
		<div class="app">
			<Show when={errorMessage()}>
				<div class="error-notification" id={errorId} role="alert">{errorMessage()}</div>
			</Show>

			<Switch>
				<Match when={path === "/"}>
					<div class="home-page">
						<h1>Suggestion Box</h1>
						<p class="description">
							Please be nice and constructive with your feedback.
						</p>

						<SuggestionForm z={z} userIdentifier={userIdentifier} />

						<div class="view-feedback-container">
							<a href="/feedback" class="view-feedback-btn" aria-label="View all submitted feedback">
								View Submitted Feedback
							</a>
						</div>
					</div>
				</Match>
				<Match when={path === "/feedback"}>
					<FeedbackPage z={z} userIdentifier={userIdentifier} />
				</Match>
				<Match when={true}>
					<div class="not-found" role="alert">
						<h1>Page Not Found</h1>
						<p>The page you're looking for does not exist.</p>
						<a href="/">Go to Home</a>
					</div>
				</Match>
			</Switch>
		</div>
	);
}

export default App;
