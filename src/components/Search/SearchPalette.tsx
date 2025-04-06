import {
	createSignal,
	Show,
	For,
	createEffect,
	on,
	createMemo,
	ErrorBoundary,
	onCleanup,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { useSearch, type SearchResultHit } from "../../typesense/useSearch";
import { SearchResultItem } from "./SearchResultItem";
import Loader2Icon from "lucide-solid/icons/loader-2";
import SearchIcon from "lucide-solid/icons/search";
import { SuggestionItem } from "../SuggestionCard/SuggestionItem";
import { useUser } from "../../hooks/data/useUser";
import type { Suggestion, Comment } from "../../../shared/zero/schema";
import { ErrorFallback } from "../ErrorFallback";
import { useIsScreenSmallerThan } from "../../hooks/ui/useScreenSize";
import { cn } from "../../utils/cn";

interface SearchPaletteProps {
	isOpen: boolean;
	onClose: () => void;
	onOpen?: () => void;
}

function hitToPreviewSuggestion(hit: SearchResultHit): Suggestion {
	if (hit.type === "suggestion") {
		return {
			id: hit.id,
			body: hit.body,
			userId: hit.userId ?? "unknown-user",
			displayName: hit.displayName ?? "Unknown User",
			timestamp: hit.timestamp ?? Date.now(),
			categoryId: hit.categoryId ?? "unknown-category",
			reactions: [],
			comments: [],
			actionItems: [],
			updatedAt: hit.timestamp ?? Date.now(),
			deletedAt: null,
			category: {
				id: hit.categoryId ?? "unknown-category",
				name: "Unknown Category",
				description: "Unknown Category Description",
				backgroundColor: "#000000",
			},
		};
	}
	const previewComment: Comment = {
		id: hit.id,
		suggestionId: hit.suggestionId ?? "unknown-suggestion",
		body: hit.body,
		userId: hit.userId ?? "unknown-user",
		displayName: hit.displayName ?? "Unknown User",
		timestamp: hit.timestamp ?? Date.now(),
		parentCommentId: hit.parentCommentId ?? null,
		reactions: [],
		selectionStart: null,
		selectionEnd: null,
		isRootComment: true,
	};
	return {
		id: hit.suggestionId ?? `preview-suggestion-${hit.id}`,
		body: hit.body ?? "[Suggestion Preview - Full suggestion not loaded]",
		userId: hit.userId ?? "unknown-suggestion-author",
		displayName: hit.displayName ?? "Unknown Suggestion Author",
		timestamp: hit.timestamp ?? Date.now(),
		categoryId: hit.categoryId ?? "unknown-category",
		reactions: [],
		comments: [previewComment],
		actionItems: [],
		updatedAt: hit.timestamp ?? Date.now(),
		deletedAt: null,
		category: {
			id: hit.categoryId ?? "unknown-category",
			name: "Unknown Category",
			description: "Unknown Category Description",
			backgroundColor: "#000000",
		},
	};
}

export function SearchPalette(props: SearchPaletteProps) {
	const {
		query,
		setQuery,
		searchSuggestions,
		setSearchSuggestions,
		searchComments,
		setSearchComments,
		useSemantic,
		setUseSemantic,
		isLoading,
		results,
		error,
	} = useSearch();
	const { displayName: currentUserDisplayName, userId } = useUser();
	const [, setSearchParams] = useSearchParams();
	const isSmallScreen = useIsScreenSmallerThan({ sizeBreakpoint: 768 });

	const [activeItem, setActiveItem] = createSignal<SearchResultHit | null>(
		null,
	);
	let inputRef: HTMLInputElement | undefined;
	let resultsRef: HTMLDivElement | undefined;

	createEffect(
		on(
			[results, isSmallScreen],
			([newResults, smallScreen]) => {
				if (smallScreen || newResults.length === 0) {
					setActiveItem(null);
				}
			},
			{ defer: true },
		),
	);

	const handleGoTo = (selectedHit: SearchResultHit | null | undefined) => {
		if (!selectedHit) return;

		const suggestionIdToGo =
			selectedHit.type === "suggestion"
				? selectedHit.id
				: selectedHit.suggestionId;
		const commentIdToGo =
			selectedHit.type === "comment" ? selectedHit.id : undefined;

		if (suggestionIdToGo) {
			console.log(
				`Navigating to suggestion: ${suggestionIdToGo}${commentIdToGo ? `, comment: ${commentIdToGo}` : ""}`,
			);
			setSearchParams({
				selectedSuggestionId: suggestionIdToGo,
				selectedCommentId: commentIdToGo,
			});
			props.onClose();
		} else {
			console.warn(
				"Could not determine suggestion ID for navigation:",
				selectedHit,
			);
		}
	};

	const previewSuggestionData = createMemo(() => {
		const item = activeItem();
		if (!item || isSmallScreen()) return null;
		try {
			return hitToPreviewSuggestion(item);
		} catch (err) {
			console.error("Error creating preview data:", err);
			return null;
		}
	});

	const commentIdToHighlightInPreview = createMemo(() => {
		const item = activeItem();
		return item?.type === "comment" ? item.id : undefined;
	});

	const userIdForPreview = createMemo(() => {
		return typeof userId === "string" ? userId : "preview-user-placeholder";
	});

	// Keyboard navigation
	const handleKeyDown = (e: KeyboardEvent) => {
		console.log("handleKeyDown", e.key);
		if (e.key === "Escape") {
			e.preventDefault();
			props.onClose();
		} else if (e.key === "Enter" && activeItem() && !isSmallScreen()) {
			e.preventDefault();
			handleGoTo(activeItem());
		} else if (
			e.key === "ArrowDown" ||
			e.key === "ArrowUp" ||
			e.key === "Tab"
		) {
			e.preventDefault();
			const currentResults = results();
			const active = activeItem() || currentResults[0];
			if (currentResults.length === 0) return;

			const currentIndex = active
				? currentResults.findIndex((item) => {
						if (item.type === active.type && item.id === active.id) {
							return true;
						}
						return false;
					})
				: -1;

			let newIndex: number;
			if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
				newIndex =
					currentIndex < currentResults.length - 1 ? currentIndex + 1 : 0;
			} else {
				newIndex =
					currentIndex > 0 ? currentIndex - 1 : currentResults.length - 1;
			}

			setActiveItem(currentResults[newIndex]);
		}
	};

	createEffect(() => {
		if (props.isOpen) {
			requestAnimationFrame(() => {
				inputRef?.focus();
			});
			document.addEventListener("keydown", handleKeyDown, true);
			onCleanup(() => {
				document.removeEventListener("keydown", handleKeyDown, true);
			});
		}
	});

	return (
		<div
			class="relative z-30"
			role="dialog"
			aria-modal="true"
			style={{ display: props.isOpen ? "block" : "none" }}
		>
			<div
				class="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm transition-opacity"
				aria-hidden="true"
				onClick={props.onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						props.onClose();
					}
				}}
			/>

			<div
				class="fixed inset-0 z-50 w-screen overflow-y-auto p-4 sm:p-6 md:p-20"
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						props.onClose();
					}
				}}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						props.onClose();
					}
				}}
			>
				<div class="mx-auto max-w-5xl transform divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden rounded-xl bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 shadow-2xl transition-all">
					<div class="relative">
						<SearchIcon
							class="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-500"
							aria-hidden="true"
						/>
						<input
							ref={inputRef}
							class="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 sm:text-sm"
							placeholder="Search suggestions and comments..."
							value={query()}
							onInput={(e) => setQuery(e.currentTarget.value)}
							role="combobox"
							aria-expanded="true"
							aria-controls="search-results"
						/>
					</div>

					<div
						tabIndex={-1}
						class="p-2 px-4 border-t border-b dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-1 text-xs flex-shrink-0"
					>
						<label class="label cursor-pointer gap-1 p-0">
							<input
								tabIndex={-1}
								type="checkbox"
								class="checkbox checkbox-xs checkbox-primary"
								checked={searchSuggestions()}
								onChange={(e) => setSearchSuggestions(e.currentTarget.checked)}
							/>
							<span class="label-text dark:text-gray-300">Suggestions</span>
						</label>
						<label class="label cursor-pointer gap-1 p-0">
							<input
								tabIndex={-1}
								type="checkbox"
								class="checkbox checkbox-xs checkbox-primary"
								checked={searchComments()}
								onChange={(e) => setSearchComments(e.currentTarget.checked)}
							/>
							<span class="label-text dark:text-gray-300">Comments</span>
						</label>
						<label class="label cursor-pointer gap-1 p-0">
							<input
								tabIndex={-1}
								type="checkbox"
								class="checkbox checkbox-xs checkbox-accent"
								checked={useSemantic()}
								onChange={(e) => setUseSemantic(e.currentTarget.checked)}
							/>
							<span class="label-text dark:text-gray-300">Semantic</span>
						</label>
					</div>

					<div class="flex flex-col md:flex-row max-h-[60vh] min-h-[200px] md:min-h-[400px] divide-x-0 md:divide-x dark:divide-gray-700">
						<div class={cn("w-full md:w-1/2 lg:w-1/3 flex flex-col min-h-0")}>
							<Show when={isLoading()}>
								<div class="flex justify-center items-center h-20 p-4 text-gray-500">
									<Loader2Icon class="w-6 h-6 animate-spin" />
								</div>
							</Show>
							<Show when={!isLoading() && error()}>
								<p class="text-center text-error p-4">{error()}</p>
							</Show>
							<Show
								when={
									!isLoading() &&
									!error() &&
									results().length === 0 &&
									query() !== ""
								}
							>
								<p class="text-center text-gray-500 p-4">
									No results found for "{query()}".
								</p>
							</Show>

							<Show
								when={
									!isLoading() &&
									!error() &&
									(results().length > 0 || query() === "")
								}
							>
								<nav
									ref={resultsRef}
									class="flex-1 scroll-py-2 overflow-y-auto p-2"
								>
									<For each={results()}>
										{(hit) => {
											const isActive = () => activeItem() === hit;

											return (
												<button
													type="button"
													class={cn(
														"group flex cursor-pointer items-start gap-3 rounded-md p-3 select-none w-full text-left",
														"text-gray-700 dark:text-gray-300 text-sm",
														isActive() &&
															"bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
													)}
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setActiveItem(hit);
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															setActiveItem(hit);
															handleGoTo(hit);
														}
													}}
													onMouseEnter={() => {
														if (!isSmallScreen()) {
															setActiveItem(hit);
														}
													}}
												>
													<SearchResultItem
														hit={hit}
														isActive={() => isActive()}
													/>
												</button>
											);
										}}
									</For>
								</nav>
							</Show>
						</div>

						<div class="hidden md:block md:w-1/2 lg:w-2/3 flex-1 p-4 overflow-y-auto min-h-0 relative">
							<Show
								when={activeItem() && previewSuggestionData()}
								fallback={
									<div
										id="preview-fallback"
										class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"
									>
										<p>
											{isLoading()
												? "Loading results..."
												: query()
													? results().length > 0
														? "Select or hover over a result to preview"
														: "No results found"
													: "Start typing to search"}
										</p>
									</div>
								}
							>
								<ErrorBoundary
									fallback={(err, reset) => (
										<ErrorFallback
											error={err}
											reset={reset}
											message="Could not load preview."
										/>
									)}
								>
									<div class="relative pb-16">
										<div class="bg-transparent shadow-none">
											<SuggestionItem
												suggestion={previewSuggestionData()!}
												userId={userIdForPreview()}
												displayName={currentUserDisplayName() || ""}
												readOnly={false}
												highlightCommentId={commentIdToHighlightInPreview()}
											/>
										</div>
									</div>
								</ErrorBoundary>
							</Show>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
