import {
	Show,
	createMemo,
	Suspense,
	Index,
	onMount,
	createSignal,
	For,
} from "solid-js";
import { ErrorBoundary } from "solid-js";
import { SuggestionItem } from "../components/SuggestionItem";
import { ErrorFallback } from "../components/ErrorFallback";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { SuggestionForm } from "../components/SuggestionForm";
import { useCategories } from "../hooks/useCategories";
import { useZero } from "../context/ZeroContext";
import { cn } from "../utils/cn";
import { useUser } from "../hooks/useUser";
import { useSuggestionRating, useSuggestions } from "../hooks/useSuggestions";
import { darkenHexString } from "../utils/colorUtils";
import { TransitionGroup } from "solid-transition-group";

export function FeedbackPageSkeleton() {
	return (
		<div>
			<SkeletonLoader type="feedback" count={5} />
		</div>
	);
}

export function FeedbackPage() {
	const z = useZero();
	const { displayName, userId } = useUser();
	if (!z || !userId) return <FeedbackPageSkeleton />;

	const [categories] = useCategories();
	const [suggestions] = useSuggestions();

	const visibleCategoryList = createMemo(() =>
		categories()
			.filter(
				(category) =>
					suggestions().filter((s) => s.categoryID === category.id).length > 0,
			)
			.sort((a, b) => {
				// start, stop, continue - otherwise alphabetical
				if (a.name === "Start") return -1;
				if (b.name === "Start") return 1;
				if (a.name === "Stop") return -1;
				if (b.name === "Stop") return 1;
				if (a.name === "Continue") return -1;
				if (b.name === "Continue") return 1;
				return a.name.localeCompare(b.name);
			}),
	);

	onMount(() => {
		if (window.innerWidth < 768) {
			setTimeout(() => {
				const xScrollable = document.getElementById("x-scrollable");
				if (xScrollable) {
					xScrollable.scrollTo({
						left: 400,
						behavior: "smooth",
					});
				}
			}, 100);
		}
	});

	return (
		<div class="h-[100dvh] flex flex-col">
			<header class={"p-4 h-[var(--header-height)] flex-none"}>
				<h1 class="text-3xl font-bold mb-2">Feedback Board</h1>
			</header>

			<main
				class={cn(
					"flex-1 h-[var(--main-height)] bg-base-300",
					"flex justify-center",
				)}
			>
				<ErrorBoundary
					fallback={(error, reset) => (
						<ErrorFallback
							error={error}
							reset={reset}
							message="Failed to load suggestions."
						/>
					)}
				>
					<Show
						when={suggestions().length > 0}
						fallback={<SkeletonLoader type="feedback" count={5} />}
					>
						<div
							id="x-scrollable"
							aria-label={`${suggestions().length} suggestions`}
							class={cn(
								"h-full flex flex-nowrap",
								"items-stretch overflow-x-auto overflow-y-hidden",
								"snap-x snap-mandatory",
								"gap-4 p-4",
							)}
						>
							<Index each={visibleCategoryList()}>
								{(category) => {
									const backgroundColor = category().backgroundColor;
									const backgroundColorDark = darkenHexString(
										backgroundColor,
										150,
									);

									return (
										<>
											<div
												class={cn(
													"card shadow-md",
													"flex flex-col min-w-[320px] max-w-[90vw] md:min-w-[420px] lg:min-w-[520px] w-min",
													"flex-none snap-center bg-[var(--card-background-color)] dark:bg-[var(--card-background-color-dark)]",
												)}
												style={{
													// background color is a hex code, on dark mode darken it
													"--card-background-color": backgroundColor,
													"--card-background-color-dark": backgroundColorDark,
												}}
											>
												<div class="card-body flex flex-col flex-1 p-4 h-16">
													<h3 class="card-title">{category().name}</h3>
													<p class="text-sm text-base-content/70 mb-2">
														{category().description}
													</p>
													<ul class={cn("space-y-2 overflow-y-auto")}>
														<TransitionGroup
															moveClass="group-item"
															name="slide"
														>
															<For
																each={suggestions()
																	.filter((s) => s.categoryID === category().id)
																	.sort(
																		(a, b) =>
																			useSuggestionRating(
																				b.reactions.map((r) => r.emoji),
																			) -
																			useSuggestionRating(
																				a.reactions.map((r) => r.emoji),
																			),
																	)}
															>
																{(suggestion) => (
																	<Suspense
																		fallback={
																			<SkeletonLoader
																				type="suggestion"
																				count={1}
																			/>
																		}
																	>
																		<div class="snap-start snap-always py-1">
																			<SuggestionItem
																				suggestion={suggestion}
																				userId={userId}
																				displayName={displayName()}
																			/>
																		</div>
																	</Suspense>
																)}
															</For>
														</TransitionGroup>
													</ul>
												</div>
												<div class="border-t flex-none p-4">
													<SuggestionForm
														displayName={displayName()}
														categoryID={category().id}
														compact={true}
													/>
												</div>
											</div>
										</>
									);
								}}
							</Index>
						</div>
					</Show>
				</ErrorBoundary>
			</main>
		</div>
	);
}
