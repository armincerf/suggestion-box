import { For, Show, createMemo, type Accessor } from "solid-js";
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
	const resultsMap = createMemo(() => props.questionResults() ?? {});

	const totalVotes = createMemo(() => {
		return Object.values(resultsMap()).reduce((sum, opt) => sum + opt.count, 0);
	});

	const mostVotes = createMemo(() => {
        const counts = Object.values(resultsMap()).map((opt) => opt.count);
		return counts.length > 0 ? Math.max(0, ...counts) : 0;
	});

	return (
		<fieldset class="poll-voting-interface space-y-2">
			<legend class="font-semibold dark:text-white">
				{props.question.text}
			</legend>
			<ul class="pl-2 space-y-1">
				<For each={options()}>
					{(option) => {
						const optionId = option.id;
						const result = createMemo(() => resultsMap()[optionId]);
						const voteCount = createMemo(() => result()?.count ?? 0);
						const isMyVote = createMemo(() => props.myVoteOptionId() === optionId);
						const isWinning = createMemo(() => voteCount() > 0 && voteCount() === mostVotes());
						const percentage = createMemo(() =>
							totalVotes() > 0 ? (voteCount() / totalVotes()) * 100 : 0
						);
						const isDisabled = () => props.isVotingDisabled();

						return (
							<li>
								<label
									class={cn(
										"relative w-full min-h-[36px] border border-base-300 dark:border-gray-600 rounded-md flex items-center overflow-hidden",
										isDisabled() ? "cursor-default" : "cursor-pointer hover:border-primary dark:hover:border-primary"
									)}
								>
									{/* Background Bar - Shows after voting */}
									<Show when={isDisabled()}>
										<div
											class={cn(
												"absolute top-0 left-0 h-full rounded-l-md transition-all duration-500 ease-out", // Use rounded-l-md
												isWinning() ? "vote-bg-winning" : isMyVote() ? "vote-bg-own" : "vote-bg",
												// Add 'animate-width-grow' if using keyframes
											)}
											style={{ width: `${percentage()}%` }}
										/>
									</Show>

									{/* Content Overlay */}
									<div class="relative z-10 flex items-center justify-between w-full px-3 py-1.5">
                                        {/* Radio Input + Text */}
										<span class="flex items-center gap-2 flex-grow">
											<input
												type="radio"
												name={`question-${props.question.id}`}
												value={optionId}
												class="radio radio-sm radio-primary disabled:radio-secondary"
												checked={isMyVote()}
												disabled={isDisabled()}
												onChange={() => {
                                                    if (!isDisabled()) {
                                                        props.onVoteSelect(props.question.id, optionId);
                                                    }
                                                }}
											/>
											<span class={cn("select-none", isWinning() && isDisabled() && "font-bold text-black dark:text-gray-900")}>
												{/* Show indicator only if it's my vote *and* voting is disabled */}
												{isMyVote() && isDisabled() && <span class="relative">🗳️ </span>}
												{option.text}
											</span>
										</span>

                                        {/* Vote Count - Shows after voting */}
										<Show when={isDisabled()}>
											<span class={cn("font-bold text-sm ml-2", isWinning() && "text-black dark:text-gray-900")}>
												{voteCount()}
											</span>
										</Show>
									</div>
								</label>
							</li>
						);
					}}
				</For>
			</ul>
		</fieldset>
	);
} 