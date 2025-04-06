import { onMount, Index, createMemo } from "solid-js";
import { ErrorBoundary } from "solid-js";
import { ErrorFallback } from "../ErrorFallback";
import { cn } from "../../utils/cn";
import { Column } from "./Column";
import { useCategories } from "../../hooks/data/useCategories";

export function Board(props: {
	userId: string;
	displayName: string;
	readOnly?: boolean;
}) {
	const [categories] = useCategories();
	let xScrollableRef: HTMLDivElement | undefined;

	const visibleCategoryList = createMemo(() => {
		const categoriesCopy = [...categories()];
		categoriesCopy.sort((a, b) => {
			// start, stop, continue - otherwise alphabetical
			if (a.name === "Start") return -1;
			if (b.name === "Start") return 1;
			if (a.name === "Stop") return -1;
			if (b.name === "Stop") return 1;
			if (a.name === "Continue") return -1;
			if (b.name === "Continue") return 1;
			return a.name.localeCompare(b.name);
		});
		return categoriesCopy;
	});

	onMount(() => {
		if (window.innerWidth < 768 && xScrollableRef) {
			requestAnimationFrame(() => {
				const scrollAmount =
					xScrollableRef.scrollWidth / 2 - xScrollableRef.clientWidth / 2;
				xScrollableRef.scrollTo({
					left: scrollAmount > 0 ? scrollAmount : 400,
					behavior: "smooth",
				});
			});
		}
	});

	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<ErrorFallback
					error={error}
					reset={reset}
					message="Failed to load suggestions."
				/>
			)}
		>
			<div
				ref={xScrollableRef}
				id="x-scrollable"
				class={cn(
					"h-full flex flex-nowrap",
					"items-stretch overflow-x-auto overflow-y-hidden",
					"snap-x snap-mandatory",
					"gap-4 p-4",
				)}
			>
				<Index each={visibleCategoryList()}>
					{(category) => {
						return (
							<Column
								category={category()}
								userId={props.userId}
								displayName={props.displayName}
								readOnly={props.readOnly ?? false}
							/>
						);
					}}
				</Index>
			</div>
		</ErrorBoundary>
	);
}
