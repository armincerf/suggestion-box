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
	const [submitted, setSubmitted] = createSignal(false);

	return (
		<div class="min-h-[100dvh] flex flex-col bg-gradient-to-b from-base-100 to-base-200">
			<header class="p-4 bg-base-100 shadow-md">
				<div class="container mx-auto flex justify-between items-center">
					<div>
						<h1 class="text-3xl font-bold">Suggestion Box</h1>
					</div>
					<div class="flex items-center gap-3">
						<Show
							when={activeSession()}
							fallback={
								<button
									type="button"
									onClick={createNewSession}
									disabled={isCreatingSession()}
									class={cn(
										"btn btn-primary",
										isCreatingSession() && "loading"
									)}
								>
									{isCreatingSession()
										? "Creating..."
										: "Create Session"}
								</button>
							}
						>
							<A
								href={`/sessions/${activeSession()?.id}`}
								class="btn btn-primary"
							>
								Join Active Session
							</A>
						</Show>
					</div>
				</div>
			</header>

			<main class="flex-1 container mx-auto p-4 md:p-8">
				<div class="max-w-3xl mx-auto">
					<div class="card bg-base-100 shadow-2xl border border-base-300 overflow-hidden">
						<div class="card-body p-6 md:p-8">
							<h2 class="text-2xl font-bold mb-6">Submit Your Feedback</h2>
							<div class={cn(
								"bg-primary/5 p-6 rounded-lg border border-primary/20 mb-6",
								submitted() && "bg-success/5 border-success/20"
							)}>
								<p class="text-base-content/80">
									{submitted() ? (
										"Your feedback has been submitted. Thank you!"
									) : (
										"Your insights help us improve. Share your thoughts, ideas, or suggestions below."
									)}
								</p>
							</div>
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
										categoryOptional={true}
										onSubmit={() => setSubmitted(true)}
									/>
								</Show>
							</ErrorBoundary>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

export default HomePage;
