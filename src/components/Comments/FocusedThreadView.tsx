import {
	Show,
	For,
	Suspense,
	createMemo,
	type Accessor,
	Index,
} from "solid-js";
import { ErrorBoundary } from "solid-js";
import { useCommentReplies } from "../../hooks/data/useComments";
import { useQuery } from "@rocicorp/zero/solid";
import { type TZero, useZero } from "../../zero/ZeroContext";
import { DUMMY_QUERY_ID, QUERY_TTL_FOREVER } from "../../utils/constants";
import { NestedComment } from "./NestedComment";
import { ErrorFallback } from "../ErrorFallback";
import { SkeletonLoader } from "../SkeletonLoader";
import { UserAvatar } from "../UserAvatar";
import { getNameFromUserId } from "../../nameGenerator";
import { useRelativeTime } from "../../hooks/ui/useRelativeTime";
import ArrowLeft from "lucide-solid/icons/arrow-left";

// Specific query to get a single comment by ID
const commentByIdQuery = (z: TZero, commentId: string | null) => {
	if (!commentId) return z.query.comments.where("id", DUMMY_QUERY_ID); // Dummy if no ID
	return z.query.comments.where("id", commentId);
};

interface FocusedThreadViewProps {
	focusedCommentId: Accessor<string>;
	onGoBack: () => void;
	// Pass down the callbacks and limits for further nesting *within* this view
	onViewThread: (commentId: string) => void;
	maxDepth: number;
	maxVisibleDirectReplies: number;
}

/**
 * Displays a specific comment thread, starting from focusedCommentId,
 * intended to slide over the main comment list.
 */
export function FocusedThreadView(props: FocusedThreadViewProps) {
	const z = useZero();

	// 1. Fetch the root comment for this focused view
	const [focusedCommentData] = useQuery(
		() => commentByIdQuery(z, props.focusedCommentId()),
		{ ttl: QUERY_TTL_FOREVER },
	);
	const rootComment = createMemo(() => focusedCommentData()?.[0]);

	// 2. Fetch replies to this root comment
	const { replies } = useCommentReplies({ commentId: props.focusedCommentId });

	// 3. Get display details for the root comment
	const commentAuthor = createMemo(() => {
		const c = rootComment();
		return c ? c.displayName || getNameFromUserId(c.userId) : "Loading...";
	});
	const relativeTime = useRelativeTime(() => rootComment()?.timestamp);

	// We start the depth at 0 *within this focused view*
	const viewRootDepth = 0;

	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="Failed to load this thread view."
				/>
			)}
		>
			{/* Added min-h-[inherit] to ensure it fills the animated container */}
			<div class="focused-thread-view p-3 bg-base-200/50 dark:bg-base-300/50 rounded-md h-full flex flex-col min-h-[inherit]">
				{/* Header with Back Button and Root Comment Info */}
				<div class="flex items-center gap-2 mb-3 pb-3 border-b border-base-content/10 flex-none">
					<button
						type="button"
						onClick={props.onGoBack}
						class="btn btn-sm btn-ghost btn-circle"
						aria-label="Go back to all comments"
					>
						<ArrowLeft class="w-5 h-5" />
					</button>
					<Suspense fallback={<SkeletonLoader type="avatar" />}>
						<Show when={rootComment()}>
							<UserAvatar
								userId={rootComment().userId}
								displayName={commentAuthor()}
								size="sm"
							/>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium truncate">
									Thread started by {commentAuthor()}
								</p>
								<p class="text-xs opacity-70">{relativeTime()}</p>
							</div>
						</Show>
					</Suspense>
				</div>

				{/* Root comment body (optional) */}
				<Suspense fallback={<SkeletonLoader type="comments" count={1} />}>
					<Show when={rootComment()}>
						<div class="mb-3 p-2 bg-base-100 rounded text-sm flex-none prose prose-sm max-w-none">
							{/* Using prose for consistency */}
							{rootComment().body}
						</div>
					</Show>
				</Suspense>

				{/* Replies List - allow scrolling within this view */}
				<div class="flex-1 overflow-y-auto space-y-2 pr-1">
					<Suspense fallback={<SkeletonLoader type="comments" count={3} />}>
						<Show
							when={replies().length > 0}
							fallback={
								<p class="text-center text-sm opacity-70 py-4">
									No replies in this thread yet.
								</p>
							}
						>
							<Index each={replies()}>
								{(reply) => (
									<NestedComment
										comment={reply}
										depth={viewRootDepth + 1} // Start replies at depth 1 within this view
										maxDepth={props.maxDepth} // Use passed-in maxDepth for further nesting
										maxVisibleDirectReplies={props.maxVisibleDirectReplies}
										onViewThread={props.onViewThread} // Allow drilling deeper
									/>
								)}
							</Index>
						</Show>
					</Suspense>
				</div>
			</div>
		</ErrorBoundary>
	);
}
