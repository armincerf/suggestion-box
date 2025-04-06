import { For, Show, createMemo, createEffect } from "solid-js";
import type { Poll } from "../../../shared/zero/schema";
import {
	useStructuredPollResults,
	usePollById,
} from "../../hooks/data/usePolls";
import { LoadingSpinner } from "../LoadingSpinner";
import { cn } from "../../utils/cn";
import { createLogger } from "../../hyperdx-logger";

const logger = createLogger("suggestion-box:PollResults");

interface PollResultsProps {
	pollId: string;
	poll?: Poll | null; // Optional: Pass the poll directly if already fetched elsewhere
}

export function PollResults(props: PollResultsProps) {
	// Fetch the poll by ID if not provided
	const pollIdAccessor = createMemo(() => props.pollId);
	const [fetchedPoll] = usePollById(pollIdAccessor);

	// Create a stable accessor for the poll (use provided poll or fetched poll)
	const pollAccessor = createMemo<Poll | null | undefined>(() => {
		if (props.poll) return props.poll;
		return fetchedPoll();
	});

	// Fetch the structured results using our existing hook
	const structuredResults = useStructuredPollResults(pollAccessor);

	// Derived states
	const isLoading = createMemo(
		() => fetchedPoll() === undefined || structuredResults() === undefined,
	);
	const isEmpty = createMemo(() => {
		const results = structuredResults();
		if (!results) return true;
		return Object.keys(results).length === 0;
	});
	const hasError = createMemo(() => {
		// If we're not loading anymore and have a poll but no structured results, there's likely an error
		if (!isLoading() && pollAccessor() && !structuredResults()) {
			return true;
		}
		return false;
	});

	// Debug logs to understand data flow
	createEffect(() => {
		const poll = pollAccessor();
		const results = structuredResults();

		logger.debug("PollResults component data", {
			pollId: props.pollId,
			hasPollProp: !!props.poll,
			hasFetchedPoll: !!fetchedPoll(),
			fetchedPollId: fetchedPoll()?.id,
			pollAccessorId: poll?.id,
			isLoading: isLoading(),
			isEmpty: isEmpty(),
			hasResults: !!results,
			resultsKeys: results ? Object.keys(results).length : 0,
		});
	});

	return (
		<div class="poll-results space-y-4">
			<Show
				when={!isLoading()}
				fallback={
					<div class="py-2">
						<LoadingSpinner />
					</div>
				}
			>
				<Show
					when={!isEmpty()}
					fallback={
						<Show
							when={!hasError()}
							fallback={
								<div class="text-sm text-center text-error">
									<p>There was an error loading poll results.</p>
									<p class="text-xs opacity-70">Poll ID: {props.pollId}</p>
								</div>
							}
						>
							<p class="text-sm text-center opacity-70">
								No results available.
							</p>
						</Show>
					}
				>
					<div class="space-y-4">
						<For each={Object.entries(structuredResults() || {})}>
							{([, questionData]) => (
								<QuestionResults
									questionText={questionData.questionText}
									options={questionData.options}
								/>
							)}
						</For>
					</div>
				</Show>
			</Show>
		</div>
	);
}

// A subcomponent for rendering a single question's results
export function QuestionResults(props: {
	questionText: string;
	options: {
		[optionId: string]: {
			optionText: string;
			count: number;
		};
	};
}) {
	const resultsArray = createMemo(() => Object.entries(props.options));

	const totalVotes = createMemo(() => {
		return resultsArray().reduce((sum, [, opt]) => sum + opt.count, 0);
	});

	const mostVotes = createMemo(() => {
		const counts = resultsArray().map(([, opt]) => opt.count);
		return counts.length > 0 ? Math.max(0, ...counts) : 0;
	});

	return (
		<div class="poll-results-question space-y-2">
			<p class="font-semibold text-sm dark:text-gray-200">
				{props.questionText}
			</p>
			<ul class="space-y-1">
				<For each={resultsArray()}>
					{([, optionResult]) => {
						const voteCount = optionResult.count;
						const percentage = createMemo(() =>
							totalVotes() > 0 ? (voteCount / totalVotes()) * 100 : 0,
						);
						const isWinning = createMemo(
							() => voteCount > 0 && voteCount === mostVotes(),
						);

						return (
							<li class="text-xs dark:text-gray-300">
								<div class="relative w-full min-h-[24px] border border-base-300 dark:border-gray-600 rounded-md flex items-center overflow-hidden">
									{/* Background Bar */}
									<div
										class={cn(
											"absolute top-0 left-0 h-full rounded-l-md transition-all duration-500 ease-out",
											isWinning() ? "vote-bg-winning" : "vote-bg",
										)}
										style={{ width: `${percentage()}%` }}
									/>
									{/* Text Overlay */}
									<div class="relative z-10 flex justify-between items-center w-full px-2 py-1">
										<span
											class={cn(
												"font-medium",
												isWinning() && "text-black dark:text-gray-900",
											)}
										>
											{optionResult.optionText}
										</span>
										<span
											class={cn(
												"font-bold",
												isWinning() && "text-black dark:text-gray-900",
											)}
										>
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
