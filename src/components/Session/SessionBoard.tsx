import { Show, createMemo, createSignal, Suspense, Index } from "solid-js";
import { ErrorBoundary } from "solid-js";
import { SuggestionItem } from "../SuggestionItem";
import { ErrorFallback } from "../ErrorFallback";
import { SkeletonLoader } from "../SkeletonLoader";
import { SuggestionForm } from "../SuggestionForm";
import { useCategories } from "../../hooks/useCategories";
import { cn } from "../../utils/cn";
import { useUser } from "../../hooks/useUser";
import { darkenHexString } from "../../utils/colorUtils";
import type { Session, User } from "../../schema";
import { useActiveSessionSuggestions } from "../../hooks/useSession";

interface SessionBoardProps {
	sessionId: string;
	sessionData: Session;
	users: User[];
	isSessionLeader: boolean;
	isSessionEnded: boolean;
	isSessionStarted: boolean;
	onEndSession: () => void;
}

export function SessionBoard(props: SessionBoardProps) {
	const { userIdentifier, displayName } = useUser();
	const [categories] = useCategories();
	const [showConfirmEnd, setShowConfirmEnd] = createSignal(false);

	const [suggestions] = useActiveSessionSuggestions(
		props.sessionData.startedAt || 0,
		props.sessionData.endedAt || null,
	);

	// Safely access suggestions with a null check

	// Only show categories that have suggestions
	const visibleCategoryList = createMemo(() => {
		return categories().filter(
			(category) =>
				suggestions()?.filter((s) => s.categoryID === category.id).length > 0,
		);
	});

	const handleEndSession = () => {
		props.onEndSession();
		setShowConfirmEnd(false);
	};

	return (
		<div class="h-[100dvh] flex flex-col">
			<header class="p-4 bg-indigo-600 dark:bg-indigo-800 text-white">
				<div class="flex justify-between items-center">
					<h1 class="text-3xl font-bold">Session Board</h1>

					<Show
						when={
							props.isSessionLeader &&
							!props.isSessionStarted &&
							!props.isSessionEnded
						}
					>
						<button
							type="button"
							class="btn bg-white text-indigo-600 hover:bg-gray-100 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
							onClick={() => setShowConfirmEnd(true)}
						>
							End Session
						</button>
					</Show>
				</div>

				<div class="mt-2 flex items-center">
					<div class="text-sm opacity-90">
						{props.isSessionEnded ? "This session has ended" : "Active session"}
						{props.users.length > 0 && ` • ${props.users.length} participants`}
					</div>
				</div>
			</header>

			<main class="flex-1 h-[var(--main-height)] bg-base-300 dark:bg-base-800">
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
						when={suggestions()?.length > 0}
						fallback={<SkeletonLoader type="feedback" count={5} />}
					>
						<Show
							when={visibleCategoryList().length > 0}
							fallback={
								<div class="flex items-center justify-center h-full">
									<div class="text-center p-6 bg-white dark:bg-base-700 rounded-lg shadow-md max-w-md">
										<h2 class="text-2xl font-bold mb-4 dark:text-white">No suggestions yet</h2>
										<p class="mb-6 dark:text-gray-300">
											No suggestions have been added during this session. Be the
											first to add one!
										</p>
										<Show when={!props.isSessionEnded}>
											<SuggestionForm
												displayName={displayName()}
												categoryID={categories()[0]?.id || ""}
											/>
										</Show>
									</div>
								</div>
							}
						>
							<div
								id="x-scrollable"
								aria-label={`${suggestions()?.length} suggestions`}
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
											<div
												class={cn(
													"card shadow-md",
													"flex flex-col min-w-[320px] max-w-[90vw] md:min-w-[420px] lg:min-w-[520px]",
													"flex-none snap-center bg-[var(--card-background-color)] dark:bg-[var(--card-background-color-dark)]",
												)}
												style={{
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
															each={suggestions()?.filter(
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
																			readOnly={props.isSessionEnded}
																		/>
																	</div>
																</Suspense>
															)}
														</Index>
													</div>
												</div>

												<Show when={!props.isSessionEnded}>
													<div class="border-t flex-none p-4">
														<SuggestionForm
															displayName={displayName()}
															categoryID={category().id}
															compact={true}
														/>
													</div>
												</Show>
											</div>
										);
									}}
								</Index>
							</div>
						</Show>
					</Show>
				</ErrorBoundary>
			</main>

			{/* End Session Confirmation Modal */}
			<Show when={showConfirmEnd()}>
				<div class="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
						<h2 class="text-xl font-bold mb-4 dark:text-white">End Session?</h2>
						<p class="mb-6 dark:text-gray-300">
							Are you sure you want to end this session? Once ended,
							participants will be able to view suggestions but not add new
							ones.
						</p>
						<div class="flex justify-end space-x-2">
							<button
								type="button"
								class="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
								onClick={() => setShowConfirmEnd(false)}
							>
								Cancel
							</button>
							<button
								type="button"
								class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
								onClick={handleEndSession}
							>
								End Session
							</button>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
}
