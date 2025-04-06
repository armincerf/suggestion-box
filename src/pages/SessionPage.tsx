import {
	createSignal,
	createEffect,
	Switch,
	Match,
	Show,
	createMemo,
	For,
} from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { useZero } from "../zero/ZeroContext";
import { useUser } from "../hooks/data/useUser";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { WaitingRoom } from "../components/Session/WaitingRoom";
import { SuggestionReviewer } from "../components/Session/SuggestionReviewer";
import { SessionBoard } from "../components/Session/SessionBoard";
import {
	useSessionMutations,
	useSessionUsers,
	useSuggestionsToReview,
} from "../hooks/data/useSession";
import { useEnsureSessionMembership } from "../hooks/data/useEnsureSessionMembership";
import type { User, Poll } from "../../shared/zero/schema";
import { createLogger } from "../hyperdx-logger";
import {
	useActivePoll,
	useEndedSessionPolls,
	useMySessionPollAcknowledgements,
} from "../hooks/data/usePolls";
import { ActivePollModal } from "../components/Polls/ActivePollModal";
import { PollResultsToast } from "../components/Polls/PollResultsToast";
import { useAcknowledgePollResults } from "../hooks/mutations/pollMutations";

const logger = createLogger("suggestion-box:SessionPage");

export function SessionPage() {
	const params = useParams<{ sessionId: string }>();
	const navigate = useNavigate();
	const z = useZero();
	const { userId } = useUser();

	const { sessionData, isLoading, isError } =
		useEnsureSessionMembership(params.sessionId);
	const [users] = useSessionUsers(params.sessionId);
	const [error, setError] = createSignal<string | null>(null);

	// Session info derived from sessionData
	const startedAt = createMemo(() => sessionData()?.startedAt || 0);
	const endedAt = createMemo(() => sessionData()?.endedAt || null);

	// Get suggestions to review
	const [suggestionsToReview] = useSuggestionsToReview(
		params.sessionId,
		startedAt,
	);
	const currentSuggestion = createMemo(() => suggestionsToReview()[0]);

	// Active poll management
	const [activePoll] = useActivePoll(() => params.sessionId);
	const [showPollModal, setShowPollModal] = createSignal(true);

	// Poll results toast management
	const [endedPolls] = useEndedSessionPolls(() => params.sessionId);
	const [acknowledgements] = useMySessionPollAcknowledgements(
		() => userId,
		() => params.sessionId,
	);
	const [pollsToShowResultsFor, setPollsToShowResultsFor] = createSignal<
		Poll[]
	>([]);
	const acknowledgePollResults = useAcknowledgePollResults();

	// Determine which polls need to show results
	createEffect(() => {
		const polls = endedPolls();
		const acks = acknowledgements();

		if (!polls || !acks || !userId) return;

		// Create a set of acknowledged poll IDs for quick lookup
		const acknowledgedPollIds = new Set(acks.map((ack) => ack.pollId));

		// Find polls that haven't been acknowledged
		const unacknowledgedPolls = polls.filter(
			(poll) => !acknowledgedPollIds.has(poll.id),
		);

		setPollsToShowResultsFor(unacknowledgedPolls);
	});

	// Filter users to only those in the session
	const sessionUsers = createMemo<User[]>(() => {
		if (!sessionData() || !users()) return [];
		const userIds = sessionData()?.users || [];
		return users().filter((user) => userIds.includes(user.id)) as User[];
	});

	// Check if current user is session leader
	const isSessionLeader = createMemo(() => {
		return sessionData()?.startedBy === userId;
	});

	const isSessionStarted = createMemo(() => {
		return (sessionData()?.startedAt || 0) > 0;
	});

	const isSessionEnded = createMemo(() => {
		return !!sessionData()?.endedAt;
	});

	// Handle errors if session not found or membership error
	createEffect(() => {
		if (isError()) {
			setError("Error with session: Could not join or create session");
		} else if (!sessionData() && !isLoading()) {
			setError("Session not found");
		}
	});

	const { endSession } = useSessionMutations();

	// End the session
	const handleEndSession = async () => {
		if (!z || !sessionData() || !isSessionLeader()) return;

		try {
			await endSession(params.sessionId);
			logger.info("Session ended", {
				sessionId: params.sessionId,
				endedBy: userId,
			});
		} catch (error) {
			logger.error(
				"Error ending session",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	};

	// Handle acknowledging a poll result
	const handleAcknowledge = async (pollId: string) => {
		if (!userId || !params.sessionId) return;

		try {
			await acknowledgePollResults(pollId, userId, params.sessionId);

			setPollsToShowResultsFor((prev) => prev.filter((p) => p.id !== pollId));
		} catch (error) {
			console.error("Failed to acknowledge poll results", error);
		}
	};

	const handlePollEnded = () => {
		setShowPollModal(false);
	};

	const handleReopenPollModal = (dismissed: boolean) => {
		setShowPollModal(!dismissed);
	};

	if (error()) {
		return (
			<div class="container mx-auto p-6 text-center">
				<div class="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg mb-4">
					<p class="text-red-700 dark:text-red-300">{error()}</p>
				</div>
				<button
					type="button"
					class="btn btn-primary"
					onClick={() => navigate("/")}
				>
					Return to Home
				</button>
			</div>
		);
	}

	return (
		<div class="dark:bg-base-900">
			<Show when={isLoading()}>
				<LoadingSpinner />
			</Show>
			<Switch>
				{/* Waiting Room */}
				<Match when={!isSessionStarted()}>
					<WaitingRoom
						sessionId={params.sessionId}
						users={sessionUsers()}
						isSessionLeader={isSessionLeader()}
					/>
				</Match>

				{/* Active Session - Board View */}
				<Match when={isSessionStarted() && suggestionsToReview().length === 0}>
					<SessionBoard
						sessionId={params.sessionId}
						sessionStartedAt={startedAt()}
						sessionEndedAt={endedAt()}
						isSessionLeader={isSessionLeader()}
						isSessionEnded={isSessionEnded()}
						isSessionStarted={isSessionStarted()}
						onEndSession={handleEndSession}
						isPollActive={!!activePoll()}
						onReopenPollModal={handleReopenPollModal}
					/>
					<Show when={!!activePoll() && showPollModal()}>
						<ActivePollModal
							poll={activePoll()}
							isOpen={showPollModal()}
							onClose={() => setShowPollModal(false)}
							onPollEnded={handlePollEnded}
						/>
					</Show>
				</Match>

				{/* Active Session - Suggestion Review */}
				<Match when={isSessionStarted() && suggestionsToReview().length > 0}>
					<Show when={currentSuggestion()}>
						{(currentSuggestion) => (
							<SuggestionReviewer
								users={sessionUsers()}
								currentSuggestion={currentSuggestion}
								isSessionLeader={isSessionLeader()}
								isSessionEnded={isSessionEnded()}
							/>
						)}
					</Show>
				</Match>
			</Switch>

			{/* Toast Container for Poll Results */}
			<div class="fixed bottom-4 right-4 w-full max-w-sm space-y-2 z-[100]">
				<For each={pollsToShowResultsFor()}>
					{(poll) => (
						<PollResultsToast
							pollId={poll.id}
							pollTitle={poll.title || "Poll Results"}
							onClose={() => handleAcknowledge(poll.id)}
						/>
					)}
				</For>
			</div>
		</div>
	);
}

export default SessionPage;
