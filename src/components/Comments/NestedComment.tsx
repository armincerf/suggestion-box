import type { Accessor } from "solid-js";
import type { Comment } from "../../zero/schema";
import { CommentItem } from "./CommentItem";

interface NestedCommentProps {
	comment: Accessor<Comment>;
	depth: number; // Now required
	maxDepth: number; // Max depth before "View Thread"
	maxVisibleDirectReplies: number; // How many replies to show initially before "Show More"
	onViewThread: (commentId: string) => void; // Add this prop
}

/**
 * Renders a single comment thread item recursively.
 * Passes necessary props to CommentItem for depth control.
 */
export function NestedComment(props: NestedCommentProps) {
	if (!props.comment) {
		return null;
	}

	return (
		<div class={`nested-comment-thread depth-${props.depth}`}>
			{/* Pass all props down, including onViewThread */}
			<CommentItem {...props} />
		</div>
	);
}
