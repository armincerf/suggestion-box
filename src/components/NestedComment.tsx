import type { Comment } from "../zero/schema";
import { CommentItem } from "./CommentItem";
import { splitProps } from "solid-js";

interface NestedCommentProps {
	comment: Comment;
	depth?: number;
	maxDepth?: number; // maximum recursion level to auto-load replies
	maxVisibleReplies?: number;
}

/**
 * A recursive component that renders a comment and its child comments
 * with controlled recursion depth and pagination
 */
export function NestedComment(props: NestedCommentProps) {
	// let CommentItem handle its own replies
	// This component only needs to render the current comment

	const [commentProps, rest] = splitProps(props, ["comment"]);

	if (!commentProps.comment) {
		return null;
	}

	return (
		<div class={`nested-comment-thread depth-${props.depth}`}>
			<CommentItem {...commentProps} {...rest} />
		</div>
	);
}
