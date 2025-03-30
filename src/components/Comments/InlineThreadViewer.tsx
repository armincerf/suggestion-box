import { For, Index, type Accessor } from "solid-js";
import type { Comment } from "../../zero/schema";
import { NestedComment } from "./NestedComment";
import { cn } from "../../utils/cn";

interface InlineThreadViewerProps {
	id: string;
	replies: Accessor<Comment[]>;
	startDepth: number; // The depth level at which these replies begin
	maxDepth: number; // Max depth for further nesting *within* this inline view
	maxVisibleDirectReplies: number; // How many replies to show initially within this view (if needed)
	onViewThread: (commentId: string) => void;
}

/**
 * Renders a list of replies inline, typically used for threads
 * that have exceeded the initial nesting depth limit.
 */
export function InlineThreadViewer(props: InlineThreadViewerProps) {
	return (
		<fieldset
			id={props.id}
			class={cn(
				"ml-4 pl-4 border-l-2 border-dashed border-accent/50 space-y-2 py-2", // Style as needed - indent + border
			)}
		>
			<Index each={props.replies()}>
				{(reply) => (
					<NestedComment
						comment={reply}
						// Pass the calculated starting depth for this level
						depth={props.startDepth}
						// Pass down the maxDepth and visibility rules for further nesting
						maxDepth={props.maxDepth}
						maxVisibleDirectReplies={props.maxVisibleDirectReplies}
						onViewThread={props.onViewThread}
					/>
				)}
			</Index>
		</fieldset>
	);
}
