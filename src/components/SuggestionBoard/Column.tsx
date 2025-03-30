import { Suspense, For, Show, type Accessor } from "solid-js";
import { TransitionGroup } from "solid-transition-group";
import { SuggestionItem } from "../SuggestionCard/SuggestionItem";
import { SkeletonLoader } from "../SkeletonLoader";
import { SuggestionForm } from "../SuggestionCard/SuggestionForm";
import { cn } from "../../utils/cn";
import { darkenHexString } from "../../utils/colorUtils";
import type { Category, Suggestion } from "../../zero/schema";

export function Column(props: {
	category: Category;
	suggestions: Accessor<Suggestion[]>;
	userId: string;
	displayName: string;
	readOnly?: boolean;
}) {
	const backgroundColor = props.category.backgroundColor;
	const backgroundColorDark = darkenHexString(backgroundColor, 150);

	return (
		<div
			class={cn(
				"card shadow-md",
				"flex flex-col min-w-[320px] max-w-[90vw] md:min-w-[420px] lg:min-w-[520px] w-min",
				"flex-none snap-center bg-[var(--card-background-color)] dark:bg-[var(--card-background-color-dark)]",
			)}
			style={{
				"--card-background-color": backgroundColor,
				"--card-background-color-dark": backgroundColorDark,
			}}
		>
			<div class="card-body flex flex-col flex-1 p-4 h-16 pb-0">
				<span
					class={cn("card-title text-left")}
				>
					{props.category.name}
				</span>
				<p class="text-sm text-base-content/70 mb-2 flex-grow-0">
					{props.category.description}
				</p>

				{/* Wrap the entire list in one Suspense boundary */}
				<Suspense fallback={<SkeletonLoader type="suggestion" count={3} />}>
					<ul class={cn("space-y-2 overflow-y-auto flex-col relative")}>
						<TransitionGroup name="group-item">
							<For each={props.suggestions()}>
								{(suggestion) => (
									<div class="snap-start snap-always py-1 group-item">
										<SuggestionItem
											suggestion={suggestion}
											userId={props.userId}
											displayName={props.displayName}
											readOnly={props.readOnly ?? false}
										/>
									</div>
								)}
							</For>
						</TransitionGroup>
					</ul>
				</Suspense>
			</div>
			<Show when={!props.readOnly}>
				<div
					class={cn(
						"border-t border-base-content/10 z-50 flex-none",
						"p-4 md:pr-10",
					)}
				>
					<SuggestionForm
						displayName={props.displayName}
						categoryID={props.category.id}
						compact
					/>
				</div>
			</Show>
		</div>
	);
}
