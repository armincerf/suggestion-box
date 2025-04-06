import { createSignal, createMemo, createEffect } from "solid-js";
import { ErrorBoundary } from "solid-js";
import type { Suggestion } from "../../../shared/zero/schema";
import { getNameFromUserId } from "../../nameGenerator";
import { ErrorFallback } from "../ErrorFallback";
import {
	useEditSuggestion,
	useAddComment,
	useDeleteSuggestion,
} from "../../hooks/mutations/suggestionMutations";
import { createLogger } from "../../hyperdx-logger";
import { SuggestionHeader } from "./SuggestionHeader";
import { SuggestionBody } from "./SuggestionBody";
import { SuggestionActions } from "./SuggestionActions";
import { CommentSection } from "../Comments/CommentSection";
import { cn } from "../../utils/cn";
import { useConfirm } from "../../contexts/ConfirmContext";

const logger = createLogger("suggestion-box:SuggestionItem");

export interface SuggestionItemProps {
	suggestion: Suggestion;
	userId: string;
	displayName: string;
	readOnly?: boolean;
	highlightCommentId?: string | undefined;
	id?: string;
}

export function SuggestionItem(props: SuggestionItemProps) {
	const suggestion = () => props.suggestion;
	const userId = () => props.userId;
	const displayName = () => props.displayName;
	const readOnly = () => props.readOnly ?? false;
	const highlightCommentId = () => props.highlightCommentId;

	const editSuggestion = useEditSuggestion();
	const addCommentMutation = useAddComment();
	const deleteSuggestion = useDeleteSuggestion();
	const { confirm } = useConfirm();

	const [showCommentForm, setShowCommentForm] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [editedBody, setEditedBody] = createSignal(suggestion().body);
	const [isSubmittingEdit, setIsSubmittingEdit] = createSignal(false);
	const [editError, setEditError] = createSignal<string | null>(null);
	const [commentError, setCommentError] = createSignal<string | null>(null);

	const suggestionAuthor = createMemo(() => {
		return suggestion().displayName || getNameFromUserId(suggestion().userId);
	});

	const suggestionId = `suggestion-${suggestion().id}`;
	const commentFormId = `comment-form-${suggestion().id}`;

	const isOwnSuggestion = createMemo(() => suggestion().userId === userId());

	const handleAddComment = async (
		body: string,
		parentCommentId: string | null = null,
		selectionStart: number | null = null,
		selectionEnd: number | null = null,
	) => {
		if (readOnly()) return;
		setCommentError(null);
		try {
			await addCommentMutation(
				body,
				suggestion().id,
				parentCommentId,
				selectionStart,
				selectionEnd,
			);
		} catch (error) {
			console.error("Error adding comment:", error);
			setCommentError(
				error instanceof Error ? error.message : "Failed to add comment.",
			);
		}
	};

	const submitEdit = async () => {
		if (readOnly()) return;
		if (!isOwnSuggestion() || !editedBody().trim()) return;

		setIsSubmittingEdit(true);
		setEditError(null);
		try {
			const result = await editSuggestion(
				suggestion().id,
				editedBody(),
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
		if (readOnly()) return;
		setEditError(null);
		setEditedBody(suggestion().body);
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditError(null);
	};

	const handleToggleCommentForm = () => {
		if (readOnly()) return;
		setShowCommentForm((s) => !s);
	};

	const handleDeleteClick = async () => {
		if (readOnly()) return;
		if (!isOwnSuggestion()) return;
		const confirmed = await confirm(
			"Are you sure you want to delete this suggestion and all its comments?",
			{
				confirmText: "Delete",
				cancelText: "Cancel",
				confirmVariant: "danger",
			},
		);

		if (confirmed) {
			try {
				await deleteSuggestion(suggestion().id);
			} catch (error) {
				console.error("Error deleting suggestion:", error);
			}
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
			<div
				id={props.id ?? suggestionId}
				class={cn(
					"card card-compact sm:card-normal w-full bg-base-100 dark:bg-base-900 shadow-md suggestion-item group-item",
					"transition-transform duration-600 ease-in-out",
					readOnly() &&
						"suggestion-item-readonly opacity-75 pointer-events-none",
				)}
			>
				<div class="card-body">
					<SuggestionHeader
						userId={suggestion().userId}
						displayName={suggestion().displayName}
						timestamp={suggestion().timestamp}
						readOnly={readOnly()}
						onDelete={
							isOwnSuggestion() && !readOnly() ? handleDeleteClick : undefined
						}
					/>

					<SuggestionBody
						suggestionId={suggestionId}
						initialBody={suggestion().body}
						isEditing={isEditing() && !readOnly()}
						editedBody={editedBody()}
						onEditInput={setEditedBody}
						onSubmitEdit={submitEdit}
						onCancelEdit={handleCancelEdit}
						isSubmittingEdit={isSubmittingEdit()}
						editError={editError()}
						authorDisplayName={suggestionAuthor()}
						readOnly={readOnly()}
					/>

					<SuggestionActions
						suggestion={suggestion}
						isOwnSuggestion={isOwnSuggestion()}
						isEditing={isEditing()}
						onCommentClick={handleToggleCommentForm}
						onEditClick={handleEditClick}
						commentFormId={commentFormId}
						commentFormVisible={showCommentForm()}
						readOnly={readOnly()}
					/>

					<CommentSection
						suggestionId={suggestion().id}
						comments={suggestion().comments}
						userId={userId()}
						displayName={displayName()}
						onAddComment={handleAddComment}
						commentError={commentError()}
						showCommentForm={showCommentForm()}
						commentFormId={commentFormId}
						newCommentInputId={`new-comment-${suggestion().id}`}
						readOnly={readOnly()}
						highlightCommentId={highlightCommentId()}
					/>
				</div>
			</div>
		</ErrorBoundary>
	);
}
