import {
	createSignal,
	Show,
	createMemo,
	Index,
	batch,
	createEffect,
} from "solid-js";
import type { Poll } from "../../../shared/zero/schema";
import { Modal } from "../Modal";
import { useUser } from "../../hooks/data/useUser";
import { useSubmitVote, useEndPoll } from "../../hooks/mutations/pollMutations";
import { LoadingSpinner } from "../LoadingSpinner";
import {
	usePollVotes,
	useStructuredPollResults,
} from "../../hooks/data/usePolls";
import { PollVotingInterface } from "./PollVotingInterface";
import { toaster } from "../../toast";
import { createLogger } from "../../hyperdx-logger";

const logger = createLogger("suggestion-box:ActivePollModal");

interface ActivePollModalProps {
	poll: Poll | null | undefined;
	isOpen?: boolean;
	onClose: () => void;
	onPollEnded?: (endedPoll: Poll) => void;
}

export function ActivePollModal(props: ActivePollModalProps) {
	const { userId } = useUser();
	const submitVoteMutation = useSubmitVote();
	const endPollMutation = useEndPoll();
	const [isSubmitting, setIsSubmitting] = createSignal(false);
	const [isEnding, setIsEnding] = createSignal(false);
	const [submitError, setSubmitError] = createSignal<string | null>(null);
	const [tempSelectedOptions, setTempSelectedOptions] = createSignal<
		Record<string, string>
	>({});

	const currentPoll = createMemo(() => props.poll);
	const pollIdAccessor = createMemo(() => currentPoll()?.id);
	const isPollCreator = createMemo(
		() => currentPoll()?.createdByUserId === userId,
	);

	const [votesData] = usePollVotes(pollIdAccessor);
	const structuredResults = useStructuredPollResults(currentPoll);

	const mySubmittedVotes = createMemo(() => {
		const votes = votesData();
		if (!userId || !votes) return {};
		const userVotes: Record<string, string> = {};
		for (const vote of votes) {
			if (vote.userId === userId && vote.questionId && vote.optionId) {
				userVotes[vote.questionId] = vote.optionId;
			}
		}
		return userVotes;
	});

	const modalIsOpen = createMemo(() => {
		return typeof props.isOpen !== "undefined" ? props.isOpen : !!currentPoll();
	});

	const handleVoteSelection = (questionId: string, optionId: string) => {
		if (!mySubmittedVotes()[questionId]) {
			setTempSelectedOptions((prev) => ({ ...prev, [questionId]: optionId }));
		}
	};

	createEffect(() => {
		currentPoll();
		mySubmittedVotes();
		setTempSelectedOptions({});
	});

	const handleSubmitVotes = async () => {
		const poll = currentPoll();
		const existingVotes = mySubmittedVotes();
		const selectionsToSubmit = Object.entries(tempSelectedOptions()).reduce(
			(acc, [qId, oId]) => {
				if (!existingVotes[qId]) {
					acc[qId] = oId;
				}
				return acc;
			},
			{} as Record<string, string>,
		);

		if (!poll || !userId || Object.keys(selectionsToSubmit).length === 0) {
			logger.debug("Submit votes skipped", {
				pollId: poll?.id,
				userId,
				selections: selectionsToSubmit,
				existing: existingVotes,
			});
			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);
		let successCount = 0;
		const totalSelections = Object.keys(selectionsToSubmit).length;

		try {
			const promises = Object.entries(selectionsToSubmit).map(
				([questionId, optionId]) =>
					submitVoteMutation(poll.id, questionId, optionId, userId),
			);

			const results = await Promise.all(promises);

			results.forEach((result, index) => {
				if (result.success) {
					successCount++;
				} else {
					const failedQId = Object.keys(selectionsToSubmit)[index];
					logger.error("Failed vote submission", {
						error: result.error,
						questionId: failedQId,
					});
				}
			});

			batch(() => {
				if (successCount > 0) {
					toaster.create({
						title: "Votes Submitted",
						type: "success",
						description: `${successCount} vote(s) recorded.`,
					});
				}
				if (successCount < totalSelections) {
					const failedCount = totalSelections - successCount;
					setSubmitError(`Failed to submit ${failedCount} vote(s).`);
					toaster.create({
						title: "Submission Error",
						type: "error",
						description: `Failed to submit ${failedCount} vote(s).`,
					});
				}
				setTempSelectedOptions({});
			});
		} catch (err) {
			logger.error("Error submitting votes batch", { error: err });
			setSubmitError("An unexpected error occurred while submitting votes.");
			toaster.create({
				title: "Error",
				type: "error",
				description: "An unexpected error occurred.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEndPoll = async () => {
		const poll = currentPoll();
		if (!poll || !isPollCreator() || !userId) return;
		setIsEnding(true);
		try {
			const result = await endPollMutation(poll.id, userId);
			if (result.success) {
				props.onPollEnded?.(poll);
			} else {
				logger.error("Failed to end poll", { error: result.error });
				toaster.create({
					title: "Error",
					description: "Failed to end the poll.",
					type: "error",
				});
			}
		} catch (err) {
			logger.error("Error ending poll", { error: err });
			toaster.create({
				title: "Error",
				description: "An error occurred while ending the poll.",
				type: "error",
			});
		} finally {
			setIsEnding(false);
		}
	};

	const canSubmit = createMemo(() => {
		const existing = mySubmittedVotes();
		const pending = Object.keys(tempSelectedOptions()).some(
			(qId) => !existing[qId],
		);
		return pending && !isSubmitting();
	});

	return (
		<Modal
			isOpen={modalIsOpen()}
			onClose={props.onClose}
			title={`${currentPoll()?.title ?? "Loading..."}:`}
		>
			<Show when={currentPoll()} fallback={<LoadingSpinner />}>
				{(poll) => (
					<div class="space-y-4 w-full p-4">
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Created by:{" "}
							{poll().creator?.displayName ?? poll().createdByUserId}
						</p>

						<Show
							when={structuredResults() !== undefined}
							fallback={
								<div class="py-4">
									<LoadingSpinner />
								</div>
							}
						>
							<div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
								<Index each={poll().questions}>
									{(questionAccessor) => {
										const question = createMemo(() => questionAccessor());
										const qId = createMemo(() => question().id);
										const results = createMemo(() => structuredResults());
										const questionResultsOptions = createMemo(
											() => results()?.[qId()]?.options,
										);
										const myVote = createMemo(() => mySubmittedVotes()[qId()]);
										const isDisabled = createMemo(
											() => !!mySubmittedVotes()[qId()],
										);
										const tempVote = createMemo(
											() => tempSelectedOptions()[qId()],
										);

										return (
											<PollVotingInterface
												question={question()}
												userId={userId}
												questionResults={questionResultsOptions}
												myVoteOptionId={createMemo(() =>
													isDisabled() ? myVote() : tempVote(),
												)}
												onVoteSelect={handleVoteSelection}
												isVotingDisabled={isDisabled}
											/>
										);
									}}
								</Index>
							</div>
						</Show>

						<Show when={submitError()}>
							<div class="p-2 text-error border border-error rounded text-sm">
								{submitError()}
							</div>
						</Show>

						<div class="flex justify-between items-center pt-4 border-t dark:border-gray-700">
							<Show when={isPollCreator()}>
								<button
									type="button"
									class="btn btn-warning btn-sm"
									onClick={handleEndPoll}
									disabled={isEnding()}
								>
									{isEnding() ? <LoadingSpinner /> : "End Poll"}
								</button>
							</Show>
							<Show when={!isPollCreator()}>
								<div class="w-0 h-0" aria-hidden="true" />
							</Show>

							<button
								type="button"
								class="btn btn-primary btn-sm"
								onClick={handleSubmitVotes}
								disabled={!canSubmit()}
							>
								{isSubmitting() ? <LoadingSpinner /> : "Submit Vote(s)"}
							</button>
						</div>
					</div>
				)}
			</Show>
		</Modal>
	);
}
