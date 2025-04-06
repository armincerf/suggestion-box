import { Show, createSignal, createMemo } from "solid-js";
import { ErrorBoundary } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { SuggestionFormWithCategoryPicker } from "../components/SuggestionCard/SuggestionForm";
import { ErrorFallback } from "../components/ErrorFallback";
import { useZero } from "../zero/ZeroContext";
import { cn } from "../utils/cn";
import { useUser } from "../hooks/data/useUser";
import { useActiveSessions } from "../hooks/data/useSession";
import { useCreateSession } from "../hooks/mutations/sessionMutations";
import { createLogger } from "../hyperdx-logger";

const logger = createLogger("suggestion-box:HomePage");

export function HomePageSkeleton() {
	return (
		<div class="container mx-auto p-8 animate-pulse">
			<div class="h-10 bg-base-300 rounded w-1/3 mb-4" />
			<div class="h-4 bg-base-300 rounded w-1/2 mb-8" />
			<div class="h-64 bg-base-300 rounded mb-4" />
			<div class="h-12 bg-base-300 rounded w-1/4 mt-4" />
		</div>
	);
}

function HomePage() {
	const z = useZero();
	const { displayName, userId } = useUser();
	const navigate = useNavigate();
	const [isCreatingSession, setIsCreatingSession] = createSignal(false);

	// Get active session using the hook
	const [activeSessions] = useActiveSessions();

	// Get the most recent active session (first one in the sorted results)
	const activeSession = createMemo(() => {
		const sessions = activeSessions();
		return sessions && sessions.length > 0 ? sessions[0] : null;
	});

	const createSession = useCreateSession();

	if (!z || !userId) return <HomePageSkeleton />;

	const createNewSession = async () => {
		setIsCreatingSession(true);
		try {
			const session = await createSession(userId, []);
			if (session.success && session.data) {
				navigate(`/sessions/${session.data}`);
			}
		} catch (error) {
			logger.error("Error creating session:", error);
			throw error;
		} finally {
			setIsCreatingSession(false);
		}
	};

	return (
		<div class="min-h-[100dvh] flex flex-col">
			<header class="p-4 bg-base-100 shadow-sm">
				<div class="container mx-auto">
					<h1 class="text-3xl font-bold mb-2">Suggestion Box</h1>
					<p class="text-base-content/70">Share your ideas and feedback</p>
				</div>
			</header>

			<main class="flex-1 container mx-auto p-4 md:p-8">
				<div class="flex flex-col gap-4">
					<div class="card bg-base-100 shadow-xl">
						<div class="card-body">
							<h2 class="card-title mb-4">Submit Feedback</h2>
							<ErrorBoundary
								fallback={(error, reset) => (
									<ErrorFallback
										error={error}
										reset={reset}
										message="Failed to submit suggestion."
									/>
								)}
							>
								<Show when={z}>
									<SuggestionFormWithCategoryPicker
										displayName={displayName()}
									/>
								</Show>
							</ErrorBoundary>
						</div>
					</div>

					<div class="card bg-base-100 shadow-xl">
						<div class="card-body">
							<h2 class="card-title mb-4">Retrospective Sessions</h2>
							<p class="mb-6">
								Create a new retrospective session to gather feedback from your
								team.
							</p>
							<div class="card-actions flex flex-col gap-4">
								<Show
									when={activeSession()}
									fallback={
										<button
											type="button"
											onClick={createNewSession}
											disabled={isCreatingSession()}
											class={cn(
												"btn btn-primary w-full",
												isCreatingSession() && "loading",
											)}
										>
											{isCreatingSession()
												? "Creating..."
												: "Create New Session"}
										</button>
									}
								>
									<A
										href={`/sessions/${activeSession()?.id}`}
										class="btn btn-primary w-full"
									>
										Join Active Session
									</A>
								</Show>
								<A href="/feedback" class="btn btn-outline w-full">
									View Feedback Board
								</A>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

export default HomePage;
