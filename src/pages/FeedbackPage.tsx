import { Show, createMemo, Suspense, Index } from "solid-js";
import { ErrorBoundary } from "solid-js";
import { SuggestionItem } from "../components/SuggestionItem";
import { ErrorFallback } from "../components/ErrorFallback";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { SuggestionForm } from "../components/SuggestionForm";
import { useCategories } from "../hooks/useCategories";
import { useZero } from "../context/ZeroContext";
import { cn } from "../utils/cn";
import { useUser } from "../hooks/useUser";
import { useSuggestions } from "../hooks/useSuggestions";
import { darkenHexString } from "../utils/colorUtils";

export function FeedbackPageSkeleton() {
	return (
		<div>
			<SkeletonLoader type="feedback" count={5} />
		</div>
	);
}

export function FeedbackPage() {
	const z = useZero();
	const { displayName, userIdentifier } = useUser();
	if (!z || !userIdentifier) return <FeedbackPageSkeleton />;

	const [categories] = useCategories();
	const [suggestions] = useSuggestions();

	const visibleCategoryList = createMemo(() =>
		categories().filter(
			(category) =>
				suggestions().filter((s) => s.categoryID === category.id).length > 0,
		),
	);

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
							aria-label={`${suggestions().length} suggestions`}
							class={cn(
								"h-full flex flex-nowrap",
								"items-stretch overflow-x-auto overflow-y-hidden",
								"snap-x snap-mandatory",
								"gap-4 p-4",
							)}
						>
							<Index each={visibleCategoryList()}>
								{(category, i) => {
									const backgroundColor = category().backgroundColor;
									const backgroundColorDark = darkenHexString(
										backgroundColor,
										150,
									);

									return (
										<>
											{i > 0 && (
												<div class="divider divider-vertical my-auto" />
											)}
											<div
												class={cn(
													"card shadow-md",
													"flex flex-col min-w-[320px] max-w-[95vw] md:min-w-[420px] lg:min-w-[520px]",
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
													<div class={cn("space-y-2 overflow-y-auto")}>
														<Index
															each={suggestions().filter(
																(s) => s.categoryID === category().id,
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
																			suggestion={suggestion()}
																			userIdentifier={userIdentifier}
																			displayName={displayName()}
																		/>
																	</div>
																</Suspense>
															)}
														</Index>
													</div>
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
