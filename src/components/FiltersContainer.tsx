import { ErrorBoundary, For, Show, Suspense } from "solid-js";
import { ErrorFallback } from "./ErrorFallback";
import type { Category, Suggestion } from "../schema";
import { Slider } from "@ark-ui/solid/slider";
import type { SliderValueChangeDetails } from "@ark-ui/solid/slider";
import { SuggestionItem } from "./SuggestionItem";
import { SkeletonLoader } from "./SkeletonLoader";


type FiltersContainerProps = {
	categories: Category[];
	visibleCategories: Record<string, boolean>;
	toggleCategoryVisibility: (categoryId: string) => void;
	dateRange: [number, number];
	handleDateRangeChange: (details: SliderValueChangeDetails) => void;
	dateRangeOptions?: Array<{ value: number; label: string; ms: number }>;
	suggestions?: Suggestion[];
	suggestionsByCategory?: Record<string, Suggestion[]>;
	hasMore?: boolean;
	loadMore?: () => void;
	userIdentifier?: string;
	displayName?: string;
};

export function FiltersContainer(props: FiltersContainerProps) {

	// Default date range options if not provided
	const dateRangeOptions = props.dateRangeOptions || [
		{ value: 1, label: "1d", ms: 24 * 60 * 60 * 1000 },
		{ value: 7, label: "1w", ms: 7 * 24 * 60 * 60 * 1000 },
		{ value: 30, label: "1m", ms: 30 * 24 * 60 * 60 * 1000 },
		{ value: 90, label: "3m", ms: 90 * 24 * 60 * 60 * 1000 },
		{ value: 180, label: "6m", ms: 180 * 24 * 60 * 60 * 1000 },
		{ value: 365, label: "1y", ms: 365 * 24 * 60 * 60 * 1000 },
		{ value: 999999, label: "∞", ms: Number.POSITIVE_INFINITY },
	];

	// Formatter for displaying dates in the slider
	const formatDateValue = (index: number) => {
		const option = dateRangeOptions[index];
		if (index === 0) return "Now";
		if (option.value === 999999) return "All time";
		return `${option.label} ago`;
	};

	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="Failed to load filters."
				/>
			)}
		>
			<div class="filters-container">
				<div class="category-filters">
					<h2>Categories</h2>
					<div class="category-toggle-list">
						<For each={props.categories}>
							{(category) => (
								<label class="category-toggle">
									<input
										type="checkbox"
										checked={props.visibleCategories[category.id] || false}
										onChange={() => props.toggleCategoryVisibility(category.id)}
									/>
									<span>{category.name}</span>
								</label>
							)}
						</For>
					</div>
				</div>

				<div class="date-filter">
					<h2>Time Range</h2>
					<div class="date-slider-container">
						<Slider.Root
							value={props.dateRange}
							min={0}
							max={dateRangeOptions.length - 1}
							step={1}
							minStepsBetweenThumbs={1}
							onValueChange={props.handleDateRangeChange}
						>
							<div class="date-slider-header">
								<Slider.Label>Filter by date</Slider.Label>
								<div class="date-range-display">
									<span>From: <strong>{formatDateValue(props.dateRange[0])}</strong></span>
									<span>To: <strong>{formatDateValue(props.dateRange[1])}</strong></span>
								</div>
							</div>
							<p class="date-slider-hint">Showing suggestions posted between these dates. Labels show time relative to now (e.g., "1w ago" means one week ago).</p>
							<Slider.Control class="date-slider-control">
								<Slider.Track class="date-slider-track">
									<Slider.Range class="date-slider-range" />
								</Slider.Track>
								<Slider.Thumb index={0} class="date-slider-thumb">
									<Slider.HiddenInput />
								</Slider.Thumb>
								<Slider.Thumb index={1} class="date-slider-thumb">
									<Slider.HiddenInput />
								</Slider.Thumb>
							</Slider.Control>
							<Slider.MarkerGroup class="date-slider-markers">
								<For each={dateRangeOptions}>
									{(option) => {
										const markerIndex =
											option.value < 999999
												? dateRangeOptions.findIndex(
														(o) => o.value === option.value
													)
												: 6;

										return (
											<Slider.Marker
												value={markerIndex}
												class="date-slider-marker"
												{...{ key: `marker-${option.value}` }}
											>
												<div class="marker-label">{option.label}</div>
											</Slider.Marker>
										);
									}}
								</For>
							</Slider.MarkerGroup>
						</Slider.Root>
					</div>
				</div>
			</div>

			{props.suggestions && (
				<Show
					when={props.suggestions.length > 0}
					fallback={
						<div class="no-results">No suggestions match your filters.</div>
					}
				>
					<div
						aria-label={`${props.suggestions.length} suggestions`}
						class="suggestions-by-category"
					>
						<For each={props.categories}>
							{(category) => {
								const categorySuggestions =
									props.suggestionsByCategory?.[category.id] || [];
								return (
									<Show
										when={
											props.visibleCategories[category.id] &&
											categorySuggestions.length > 0
										}
									>
										<div class="category-section">
											<h3 class="category-heading">{category.name}</h3>
											<p class="category-description">{category.description}</p>
											<div class="suggestions-list">
												<For each={categorySuggestions}>
													{(suggestion) => (
														<Suspense
															fallback={
																<SkeletonLoader type="suggestion" count={1} />
															}
														>
															<SuggestionItem
																suggestion={suggestion}
																userIdentifier={props.userIdentifier || ""}
																displayName={props.displayName || ""}
															/>
														</Suspense>
													)}
												</For>
											</div>
										</div>
									</Show>
								);
							}}
						</For>
					</div>
				</Show>
			)}

			{props.hasMore && props.loadMore && (
				<Show when={props.hasMore}>
					<Suspense
						fallback={
							<div class="load-more-skeleton" aria-busy="true">
								Loading more suggestions...
							</div>
						}
					>
						<button
							type="button"
							onClick={props.loadMore}
							aria-label="Load more suggestions"
							class="load-more-btn"
						>
							Load More
						</button>
					</Suspense>
				</Show>
			)}
		</ErrorBoundary>
	);
}
