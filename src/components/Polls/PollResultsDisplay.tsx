import { For, createMemo, Show } from "solid-js"; // Added Show
import type { PollResultsData } from "../../hooks/data/usePolls";
import { cn } from "../../utils/cn";

// Extract the options part for easier typing
type OptionsResults = PollResultsData[string]["options"];

interface PollResultsDisplayProps {
	questionText: string;
	optionsResults: OptionsResults;
}

export function PollResultsDisplay(props: PollResultsDisplayProps) {
	const resultsArray = createMemo(() => Object.entries(props.optionsResults));

	const totalVotes = createMemo(() => {
		return resultsArray().reduce((sum, [, opt]) => sum + opt.count, 0);
	});

	const mostVotes = createMemo(() => {
		// Ensure resultsArray is not empty before spreading
		const counts = resultsArray().map(([, opt]) => opt.count);
		return counts.length > 0 ? Math.max(0, ...counts) : 0;
	});

	return (
		<div class="poll-results-display space-y-2">
			<p class="font-semibold text-sm dark:text-gray-200">
				{props.questionText}
			</p>
			<ul class="space-y-1">
				<For each={resultsArray()}>
					{([optionId, optionResult]) => {
						const voteCount = optionResult.count;
						const percentage = createMemo(() =>
							totalVotes() > 0 ? (voteCount / totalVotes()) * 100 : 0
						);
						const isWinning = createMemo(() => voteCount > 0 && voteCount === mostVotes());

						return (
							<li class="text-xs dark:text-gray-300">
								<div class="relative w-full min-h-[24px] border border-base-300 dark:border-gray-600 rounded-md flex items-center overflow-hidden">
									{/* Background Bar */}
									<div
										class={cn(
											"absolute top-0 left-0 h-full rounded-l-md transition-all duration-500 ease-out", // Use rounded-l-md
											isWinning() ? "vote-bg-winning" : "vote-bg"
											// Add 'animate-width-grow' if using keyframes
										)}
										style={{ width: `${percentage()}%` }}
									/>
									{/* Text Overlay */}
									<div class="relative z-10 flex justify-between items-center w-full px-2 py-1">
										<span class={cn("font-medium", isWinning() && "text-black dark:text-gray-900")}>
											{optionResult.optionText}
										</span>
										<span class={cn("font-bold", isWinning() && "text-black dark:text-gray-900")}>
											{voteCount}
										</span>
									</div>
								</div>
							</li>
						);
					}}
				</For>
				<Show when={totalVotes() === 0}>
					<p class="text-xs text-center opacity-70 py-1">No votes yet.</p>
				</Show>
			</ul>
		</div>
	);
} 