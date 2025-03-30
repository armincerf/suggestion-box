import {
	createSignal,
	createEffect,
	Switch,
	Match,
	Show,
	createMemo,
	For,
	batch,
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
import { ActivePollModal } from "../components/Polls/ActivePollModal";
import { PollResultsToast } from "../components/Polls/PollResultsToast";
import {
	useActivePoll,
	useEndedSessionPolls,
	useMySessionPollAcknowledgements,
	useStructuredPollResults,
	type PollResultsData,
} from "../hooks/data/usePolls";
import { useAcknowledgePollResults } from "../hooks/mutations/pollMutations";
import { toaster } from "../toast";

const logger = createLogger("suggestion-box:SessionPage");

export function SessionPage() {
	const params = useParams<{ sessionId: string }>();
	const navigate = useNavigate();
	const z = useZero();
	const { userId } = useUser();

	// Use our new hook to handle session membership
	const { status, sessionData, isLoading, isError } = useEnsureSessionMembership(params.sessionId);
	const [users] = useSessionUsers(params.sessionId);
	const [error, setError] = createSignal<string | null>(null);

	// --- Memoized accessors ---
	const sessionIdAccessor = createMemo(() => params.sessionId);
	const userIdAccessor = createMemo(() => userId);

	// --- Poll State ---
	const [activePollData] = useActivePoll(sessionIdAccessor);
	const [endedPolls] = useEndedSessionPolls(sessionIdAccessor);
	const [myAcks] = useMySessionPollAcknowledgements(userIdAccessor, sessionIdAccessor);
	const acknowledgeMutation = useAcknowledgePollResults();

	const [pollsToShowResultsFor, setPollsToShowResultsFor] = createSignal<Poll[]>([]);
	const [resultsForToasts, setResultsForToasts] = createSignal<Record<string, PollResultsData | null>>({});
	const [isActivePollDismissed, setIsActivePollDismissed] = createSignal(false);

	// Reset dismissal state if the active poll changes (e.g., new poll starts)
	createEffect(() => {
		activePollData(); // Depend on active poll data
		setIsActivePollDismissed(false);
	});

	// NEW: Find unacknowledged polls and update the polls to show results for
	createEffect(() => {
		const allEnded = endedPolls();
		const acknowledged = myAcks();

		if (!params.sessionId || !allEnded || acknowledged === undefined) {
			setPollsToShowResultsFor([]);
			return;
		}

		const acknowledgedIds = new Set(acknowledged?.map((ack) => ack.pollId) ?? []);
		const unacknowledged = allEnded.filter((poll) => !acknowledgedIds.has(poll.id));

		// Update toasts state and results map
		batch(() => {
			setPollsToShowResultsFor(unacknowledged);
			// Clear results for polls no longer shown, keep existing for those still shown
			setResultsForToasts(prev => {
				const next: Record<string, PollResultsData | null> = {};
				for (const poll of unacknowledged) {
					next[poll.id] = prev[poll.id] ?? null; // Keep old result if available
				}
				return next;
			});
		});
	});

	// Calculate results using useStructuredPollResults for each needed poll
	createEffect(() => {
		const pollsNeedingResults = pollsToShowResultsFor();
		const currentResults = resultsForToasts();
		for (const poll of pollsNeedingResults) {
			if (currentResults[poll.id] === null) { // Only calculate if not already done
				// Create a temporary accessor for the specific poll
				const pollAccessor = createMemo(() => poll);
				// Use the hook to calculate results
				const structuredResults = useStructuredPollResults(pollAccessor);
				// Update the results map once the calculation is done
				createEffect(() => {
					const res = structuredResults();
					if (res !== undefined) { // Check if calculation finished
						setResultsForToasts(prev => ({ ...prev, [poll.id]: res }));
					}
				});
			}
		}
	});

	// Handle acknowledging a poll
	const handleAcknowledge = async (pollId: string) => {
		if (!userId || !params.sessionId) return;
		try {
			const result = await acknowledgeMutation(pollId, userId, params.sessionId);
			if (result.success) {
				setPollsToShowResultsFor((prev) => prev.filter((p) => p.id !== pollId));
				setResultsForToasts(prev => {
					const updated = { ...prev };
					delete updated[pollId];
					return updated;
				});
			} else {
				logger.error("Failed to acknowledge poll", { error: result.error, pollId });
				toaster.create({ title: "Error", description: "Failed to save acknowledgement.", type: "error" });
			}
		} catch (err) {
			logger.error("Error acknowledging poll", { error: err, pollId });
			toaster.create({ title: "Error", description: "An error occurred.", type: "error" });
		}
	};

	// NEW: Create a memoized boolean for active poll status
	const isPollActive = createMemo(() => !!activePollData());

	// Session info derived from sessionData
	const startedAt = createMemo(() => sessionData()?.startedAt || 0);
	const endedAt = createMemo(() => sessionData()?.endedAt || null);

	// Get suggestions to review
	const [suggestionsToReview] = useSuggestionsToReview(
		params.sessionId,
		startedAt,
	);
	const currentSuggestion = createMemo(() => suggestionsToReview()[0]);

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

	logger.debug("Session page state", {
		status: status(),
		isLoading: isLoading(),
		isSessionStarted: isSessionStarted(),
		isSessionEnded: isSessionEnded(),
		suggestionsCount: suggestionsToReview().length,
		sessionId: params.sessionId,
		activePollId: activePollData()?.id,
	});

	return (
		<div class="dark:bg-base-900 min-h-screen relative">
			<Show when={isLoading()}>
				<LoadingSpinner />
			</Show>
			
			{/* Render Active Poll Modal with isOpen prop for manual dismissal */}
			<ActivePollModal
				poll={activePollData()}
				isOpen={!!activePollData() && !isActivePollDismissed()}
				onClose={() => setIsActivePollDismissed(true)}
				onPollEnded={(endedPoll) => {
					logger.info("Poll ended via mutation", { pollId: endedPoll.id });
				}}
			/>
			
			<Switch>
				{/* Waiting Room */}
				<Match when={!isSessionStarted() && !isLoading()}>
					<WaitingRoom
						sessionId={params.sessionId}
						users={sessionUsers()}
						isSessionLeader={isSessionLeader()}
					/>
				</Match>

				{/* Active Session - Board View */}
				<Match when={isSessionStarted() && suggestionsToReview().length === 0 && !isLoading()}>
					<SessionBoard
						sessionId={params.sessionId}
						sessionStartedAt={startedAt()}
						sessionEndedAt={endedAt()}
						isSessionLeader={isSessionLeader()}
						isSessionEnded={isSessionEnded()}
						isSessionStarted={isSessionStarted()}
						onEndSession={handleEndSession}
						isPollActive={isPollActive()}
						onReopenPollModal={setIsActivePollDismissed}
					/>
				</Match>

				{/* Active Session - Suggestion Review */}
				<Match when={isSessionStarted() && suggestionsToReview().length > 0 && !isLoading()}>
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
				
				{/* Fallback while loading session status */}
				<Match when={isLoading()}>
					<LoadingSpinner />
				</Match>
			</Switch>
			
			{/* Container for Multiple Toasts */}
			<div class="fixed bottom-4 right-4 w-full max-w-sm space-y-2 z-[100]">
				<For each={pollsToShowResultsFor()}>
					{(poll) => (
						<PollResultsToast
							pollId={poll.id}
							pollTitle={poll.title || "Poll Results"}
							results={resultsForToasts()[poll.id] ?? null}
							onClose={() => handleAcknowledge(poll.id)}
						/>
					)}
				</For>
			</div>
		</div>
	);
}

export default SessionPage;
