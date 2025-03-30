import { Match, Switch, For } from "solid-js";
import "./SkeletonLoader.css";

type SkeletonType = "form" | "suggestion" | "feedback" | "comments" | "avatar";

interface SkeletonLoaderProps {
	type: SkeletonType;
	count?: number;
}

/**
 * Component for rendering placeholder loading skeletons
 * to minimize layout shift while content is loading
 */
export function SkeletonLoader({ type, count = 1 }: SkeletonLoaderProps) {
	return (
		<div
			class="skeleton-container"
			aria-busy="true"
			aria-label="Loading content"
		>
			<Switch>
				<Match when={type === "form"}>
					<div class="skeleton-form">
						<div class="skeleton-textarea" />
						<div class="skeleton-name-container">
							<div class="skeleton-name" />
							<div class="skeleton-checkbox" />
						</div>
						<div class="skeleton-button" />
					</div>
				</Match>

				<Match when={type === "suggestion"}>
					<For each={Array(count).fill(0)}>
						{() => (
							<div class="skeleton-suggestion">
								<div class="skeleton-author" />
								<div class="skeleton-body" />
								<div class="skeleton-meta">
									<div class="skeleton-date" />
									<div class="skeleton-reactions" />
									<div class="skeleton-actions" />
								</div>
							</div>
						)}
					</For>
				</Match>

				<Match when={type === "feedback"}>
					<div class="skeleton-feedback">
						<div class="skeleton-header" />
						<div class="skeleton-back" />
						<div class="skeleton-list">
							<For each={Array(count).fill(0)}>
								{() => (
									<div class="skeleton-suggestion">
										<div class="skeleton-author" />
										<div class="skeleton-body" />
										<div class="skeleton-meta" />
									</div>
								)}
							</For>
						</div>
					</div>
				</Match>

				<Match when={type === "avatar"}>
					<div class="skeleton-avatar" />
				</Match>

				<Match when={type === "comments"}>
					<For each={Array(count).fill(0)}>
						{() => (
							<div class="skeleton-comment">
								<div class="skeleton-comment-author" />
								<div class="skeleton-comment-body" />
								<div class="skeleton-comment-meta" />
							</div>
						)}
					</For>
				</Match>
			</Switch>
		</div>
	);
}
