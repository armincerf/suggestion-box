import {
	createSignal,
	createEffect,
	Switch,
	Match,
	Show,
	createMemo,
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
	useActiveSessionSuggestions,
	startSession as startSessionMutation,
	endSession as endSessionMutation,
} from "../hooks/useSession";
import type { Session, User, Suggestion } from "../schema";

export function SessionPage() {
	const params = useParams<{ sessionId: string }>();
	const navigate = useNavigate();
	const z = useZero();
	const { userId } = useUser();

	// UI state using signals (not Zero data)
	const [isLoading, setIsLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [reviewCompleted, setReviewCompleted] = createSignal(false);

	// Use hooks to load data from Zero
	const [sessionData] = useSession(params.sessionId);
	const [users] = useSessionUsers(params.sessionId);

	// Session info derived from sessionData
	const startedAt = createMemo(() => sessionData()?.startedAt || 0);
	const endedAt = createMemo(() => sessionData()?.endedAt || null);

	// Get suggestions to review
	const [suggestionsToReview] = useSuggestionsToReview(
		params.sessionId,
		startedAt(),
		reviewCompleted(),
	);

	// Get active session suggestions
	const [activeSuggestions] = useActiveSessionSuggestions(
		startedAt(),
		endedAt(),
	);

	console.log("activeSuggestions", activeSuggestions());

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

	// Add current user to session if not already present
	createEffect(async () => {
		if (!z || !userId || !params.sessionId) return;

		const session = sessionData();
		if (session && !session.users.includes(userId)) {
			// Add user to session
			const updatedUsers = [...session.users, userId];
			await z.mutate.session.update({
				id: params.sessionId,
				users: updatedUsers,
				updatedAt: Date.now(),
			});
		}

		console.log("createEffect 3", userId, params.sessionId);
		setIsLoading(false);
		console.log("isLoading", isLoading());
	});

	// Handle errors if session not found
	createEffect(() => {
		if (!sessionData() && !isLoading()) {
			setError("Session not found");
		}
	});

	// Start the session
	const handleStartSession = async () => {
		if (!z || !sessionData() || !isSessionLeader()) return;

		try {
			await startSessionMutation(z, params.sessionId);
		} catch (error) {
			console.error("Error starting session:", error);
		}
	};

	// End the session
	const handleEndSession = async () => {
		if (!z || !sessionData() || !isSessionLeader()) return;

		try {
			await endSessionMutation(z, params.sessionId);
		} catch (error) {
			console.error("Error ending session:", error);
		}
	};

	// Mark review as completed
	const completeReview = () => {
		setReviewCompleted(true);
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
		<div class="container mx-auto p-6 dark:bg-base-900">
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
						onStartSession={handleStartSession}
					/>
				</Match>

				{/* Active Session - Suggestion Review */}
				<Match
					when={
						isSessionStarted() &&
						suggestionsToReview().length > 0 &&
						!reviewCompleted()
					}
				>
					<SuggestionReviewer
						suggestions={suggestionsToReview() as Suggestion[]}
						onComplete={completeReview}
						isSessionLeader={isSessionLeader()}
						isSessionEnded={isSessionEnded()}
					/>
				</Match>

				{/* Active Session - Board View */}
				<Match
					when={
						isSessionStarted() &&
						(reviewCompleted() || suggestionsToReview().length === 0)
					}
				>
					<SessionBoard
						sessionId={params.sessionId}
						sessionData={sessionData() as Session}
						users={sessionUsers()}
						isSessionLeader={isSessionLeader()}
						isSessionEnded={isSessionEnded()}
						isSessionStarted={isSessionStarted()}
						onEndSession={handleEndSession}
					/>
				</Match>
			</Switch>
		</div>
	);
}

export default SessionPage;
