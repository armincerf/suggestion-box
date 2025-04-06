import { For, Show, Switch, Match, createMemo, type Accessor } from "solid-js";
import type { PollQuestion } from "../../../shared/zero/schema";
import type { PollResultsData } from "../../hooks/data/usePolls";
import { cn } from "../../utils/cn";

type QuestionResults = PollResultsData[string];

interface PollVotingInterfaceProps {
	question: PollQuestion;
	userId: string;
	// Results specific to this question, can be null if no votes yet
	questionResults: Accessor<QuestionResults["options"] | null | undefined>;
	// The Option ID the current user has voted for (or undefined)
	myVoteOptionId: Accessor<string | undefined>;
	// Callback when user selects an option (before final submit)
	onVoteSelect: (questionId: string, optionId: string) => void;
	// Whether voting is disabled (e.g., already submitted)
	isVotingDisabled: Accessor<boolean>;
}

export function PollVotingInterface(props: PollVotingInterfaceProps) {
	const options = createMemo(() => props.question.options || []);

	return (
		<Switch>
			<Match when={!props.isVotingDisabled()}>
				<fieldset class="poll-voting-interface space-y-2">
					<legend class="font-semibold dark:text-white">
						{props.question.text}
					</legend>
					<ul class="pl-2 space-y-1">
						<For each={options()}>
							{(option) => {
								const optionId = option.id;
								const isMyVote = createMemo(
									() => props.myVoteOptionId() === optionId,
								);

								return (
									<li>
										<label
											class={cn(
												"relative w-full min-h-[36px] border border-base-300 dark:border-gray-600 rounded-md flex items-center overflow-hidden",
												"cursor-pointer hover:border-primary dark:hover:border-primary",
											)}
										>
											{/* Content Overlay */}
											<div class="relative z-10 flex items-center justify-between w-full px-3 py-1.5">
												{/* Radio Input + Text */}
												<span class="flex items-center gap-2 flex-grow">
													<input
														type="radio"
														name={`question-${props.question.id}`}
														value={optionId}
														class="radio radio-sm radio-primary"
														checked={isMyVote()}
														onChange={() => {
															props.onVoteSelect(props.question.id, optionId);
														}}
													/>
													<span class="select-none">{option.text}</span>
												</span>
											</div>
										</label>
									</li>
								);
							}}
						</For>
					</ul>
				</fieldset>
			</Match>
			<Match when={props.isVotingDisabled()}>
				{/* When voting is disabled, we show individual question results */}
				<div class="poll-results-wrapper">
					{/* Create a "mini" poll results view showing just this question */}
					<QuestionResultsWithVoteIndicator
						questionText={props.question.text}
						options={props.questionResults() || {}}
						myVoteOptionId={props.myVoteOptionId()}
					/>
				</div>
			</Match>
		</Switch>
	);
}

// A specialized version of question results that shows which option the user voted for
function QuestionResultsWithVoteIndicator(props: {
	questionText: string;
	options: {
		[optionId: string]: {
			optionText: string;
			count: number;
		};
	};
	myVoteOptionId: string | undefined;
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
					{([optionId, optionResult]) => {
						const voteCount = optionResult.count;
						const percentage = createMemo(() =>
							totalVotes() > 0 ? (voteCount / totalVotes()) * 100 : 0,
						);
						const isWinning = createMemo(
							() => voteCount > 0 && voteCount === mostVotes(),
						);
						const isMyVote = optionId === props.myVoteOptionId;

						return (
							<li class="text-xs dark:text-gray-300">
								<div class="relative w-full min-h-[24px] border border-base-300 dark:border-gray-600 rounded-md flex items-center overflow-hidden">
									{/* Background Bar */}
									<div
										class={cn(
											"absolute top-0 left-0 h-full rounded-l-md transition-all duration-500 ease-out",
											isWinning()
												? "vote-bg-winning"
												: isMyVote
													? "vote-bg-own"
													: "vote-bg",
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
											{isMyVote && <span class="relative">🗳️ </span>}
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
