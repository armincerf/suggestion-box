import { createSignal, createMemo } from "solid-js";
import { ErrorBoundary } from "solid-js";
import type { Suggestion } from "../../zero/schema";
import { getNameFromUserId } from "../../nameGenerator";
import { ErrorFallback } from "../ErrorFallback";
import { useZero } from "../../zero/ZeroContext";
import {
	useEditSuggestion,
	useAddComment,
} from "../../hooks/mutations/suggestionMutations";
import { createLogger } from "../../hyperdx-logger";
import { SuggestionHeader } from "./SuggestionHeader";
import { SuggestionBody } from "./SuggestionBody";
import { SuggestionActions } from "./SuggestionActions";
import { CommentSection } from "../Comments/CommentSection";

const logger = createLogger("suggestion-box:SuggestionItem");

export interface SuggestionItemProps {
	suggestion: Suggestion;
	userId: string;
	displayName: string;
	readOnly?: boolean;
}

export function SuggestionItem(props: SuggestionItemProps) {
	const suggestion = () => props.suggestion;
	const userId = () => props.userId;
	const displayName = () => props.displayName;

	const z = useZero();
	const editSuggestion = useEditSuggestion();
	const addCommentMutation = useAddComment();

	const [showCommentForm, setShowCommentForm] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [editedBody, setEditedBody] = createSignal(suggestion().body);
	const [isSubmittingEdit, setIsSubmittingEdit] = createSignal(false);
	const [editError, setEditError] = createSignal<string | null>(null);
	const [commentError, setCommentError] = createSignal<string | null>(null);
	const [selectedText, setSelectedText] = createSignal<{
		start: number;
		end: number;
	} | null>(null);

	const suggestionAuthor = createMemo(() => {
		return suggestion().displayName || getNameFromUserId(suggestion().userId);
	});

	const suggestionId = `suggestion-${suggestion().id}`;
	const commentFormId = `comment-form-${suggestion().id}`;

	const isOwnSuggestion = () => suggestion().userId === userId();

	const handleTextSelection = (start: number, end: number) => {
		setSelectedText({ start, end });
		setShowCommentForm(true);
	};

	const clearTextSelection = () => {
		setSelectedText(null);
	};

	const handleAddComment = async (text: string) => {
		setCommentError(null);
		const sel = selectedText();

		try {
			const result = await addCommentMutation(
				text,
				suggestion().id,
				userId(),
				displayName(),
				null,
				sel?.start ?? null,
				sel?.end ?? null,
			);
			if (!result.success) {
				logger.error("Failed to add comment", result.error);
				setCommentError("Failed to add comment. Please try again.");
				throw result.error;
			}
			setShowCommentForm(false);
			setSelectedText(null);
		} catch (e) {
			if (!commentError()) {
				logger.error("Unexpected error adding comment", e);
				setCommentError("An unexpected error occurred.");
			}
		}
	};

	const submitEdit = async (e?: Event) => {
		e?.preventDefault();
		const trimmedBody = editedBody().trim();
		if (!trimmedBody) return;

		setIsSubmittingEdit(true);
		setEditError(null);
		try {
			const result = await editSuggestion(
				suggestion().id,
				trimmedBody,
				suggestion().categoryId,
			);
			if (!result.success) {
				logger.error("Failed to submit edit", result.error);
				setEditError("Failed to save changes. Please try again.");
				throw result.error;
			}
			setIsEditing(false);
		} catch (error) {
			if (!editError()) {
				logger.error("Unexpected error submitting edit", error);
				setEditError("An unexpected error occurred while saving.");
			}
		} finally {
			setIsSubmittingEdit(false);
		}
	};

	const handleEditClick = () => {
		setEditError(null);
		setEditedBody(suggestion().body);
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditError(null);
	};

	const handleToggleCommentForm = () => {
		setShowCommentForm((s) => !s);
		if (showCommentForm()) {
			setSelectedText(null);
		}
	};

	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="Error displaying suggestion."
				/>
			)}
		>
			<div class="card card-compact sm:card-normal w-full bg-base-100 shadow-md suggestion-item group-item">
				<div class="card-body">
					<SuggestionHeader
						userId={suggestion().userId}
						displayName={suggestion().displayName}
						timestamp={suggestion().timestamp}
					/>

					<SuggestionBody
						suggestionId={suggestionId}
						initialBody={suggestion().body}
						isEditing={isEditing()}
						editedBody={editedBody()}
						onEditInput={setEditedBody}
						onSubmitEdit={submitEdit}
						onCancelEdit={handleCancelEdit}
						isSubmittingEdit={isSubmittingEdit()}
						editError={editError()}
						onTextSelection={handleTextSelection}
						clearTextSelection={clearTextSelection}
						authorDisplayName={suggestionAuthor()}
					/>

					<SuggestionActions
						suggestion={suggestion()}
						isOwnSuggestion={isOwnSuggestion()}
						isEditing={isEditing()}
						onCommentClick={handleToggleCommentForm}
						onEditClick={handleEditClick}
						commentFormId={commentFormId}
						commentFormVisible={showCommentForm()}
					/>

					<CommentSection
						suggestionId={suggestion().id}
						comments={suggestion().comments}
						userId={userId()}
						displayName={displayName()}
						onAddComment={handleAddComment}
						commentError={commentError()}
						showCommentForm={showCommentForm()}
						selectedText={selectedText()}
						commentFormId={commentFormId}
						newCommentInputId={`new-comment-${suggestion().id}`}
					/>
				</div>
			</div>
		</ErrorBoundary>
	);
}
