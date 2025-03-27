import {
	createSignal,
	createEffect,
	Switch,
	Match,
	Show,
	createMemo,
	onMount,
} from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { useZero } from "../context/ZeroContext";
import { useUser } from "../hooks/useUser";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { WaitingRoom } from "../components/Session/WaitingRoom";
import { SuggestionReviewer } from "../components/Session/SuggestionReviewer";
import { SessionBoard } from "../components/Session/SessionBoard";
import {
	useSession,
	useSessionUsers,
	useSuggestionsToReview,
	endSession as endSessionMutation,
} from "../hooks/useSession";
import type { User } from "../zero-schema";
import { logger } from "../../hyperdx-logger";

export function SessionPage() {
	const params = useParams<{ sessionId: string }>();
	const navigate = useNavigate();
	const z = useZero();
	const { userId } = useUser();

	const [isLoading, setIsLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [sessionData] = useSession(params.sessionId);
	const [users] = useSessionUsers(params.sessionId);

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
		console.log("sessionData()?.startedAt", sessionData()?.startedAt);
		return (sessionData()?.startedAt || 0) > 0;
	});

	const isSessionEnded = createMemo(() => {
		return !!sessionData()?.endedAt;
	});

	// if the session doesn't exist, create it
	// with whatever the id in the url is
	onMount(() => {
		if (!sessionData()) {
			z.mutate.sessions.insert({
				id: params.sessionId,
				users: [userId],
				startedBy: userId,
			});
		}
	});

	createEffect(() => {
		if (!z || !userId || !params.sessionId) return;

		const session = sessionData();
		if (session?.users && !session.users.includes(userId)) {
			logger.info("Adding user to session", {
				userId,
				sessionId: params.sessionId,
			});
			// Add user to session
			const updatedUsers = [...session.users, userId];
			z.mutate.sessions.update({
				id: params.sessionId,
				users: updatedUsers,
				updatedAt: Date.now(),
			});
		}
		setIsLoading(false);
	});

	// Handle errors if session not found
	createEffect(() => {
		if (!sessionData() && !isLoading()) {
			setError("Session not found");
		}
	});

	// End the session
	const handleEndSession = async () => {
		if (!z || !sessionData() || !isSessionLeader()) return;

		try {
			await endSessionMutation(z, params.sessionId);
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
		isLoading: isLoading(),
		isSessionStarted: isSessionStarted(),
		isSessionEnded: isSessionEnded(),
		suggestionsCount: suggestionsToReview().length,
		sessionId: params.sessionId,
	});

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
				<Match
					when={
						isSessionStarted() &&
						suggestionsToReview().length === 0
					}
				>
					<SessionBoard
						sessionId={params.sessionId}
						sessionStartedAt={startedAt()}
						sessionEndedAt={endedAt()}
						isSessionLeader={isSessionLeader()}
						isSessionEnded={isSessionEnded()}
						isSessionStarted={isSessionStarted()}
						onEndSession={handleEndSession}
					/>
				</Match>

				{/* Active Session - Suggestion Review */}
				<Match
					when={
						isSessionStarted() &&
						suggestionsToReview().length > 0
					}
				>
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
		</div>
	);
}

export default SessionPage;
