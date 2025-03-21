import { Show, createSignal } from "solid-js";
import { ErrorBoundary } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { SuggestionForm } from "../components/SuggestionForm";
import { ErrorFallback } from "../components/ErrorFallback";
import { useZero } from "../context/ZeroContext";
import { cn } from "../utils/cn";
import { useUser } from "../hooks/useUser";
import { randID } from "../rand";

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

export function HomePage() {
	const z = useZero();
	const { displayName, userIdentifier } = useUser();
	const navigate = useNavigate();
	const [isCreatingSession, setIsCreatingSession] = createSignal(false);

	if (!z || !userIdentifier) return <HomePageSkeleton />;

	const createNewSession = async () => {
		setIsCreatingSession(true);
		try {
			const sessionId = randID();
			await z.mutate.session.insert({
				id: sessionId,
				startedBy: userIdentifier,
				users: [userIdentifier],
				updatedAt: Date.now(),
			});
			navigate(`/sessions/${sessionId}`);
		} catch (error) {
			console.error("Error creating session:", error);
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
									<SuggestionForm autoFocus displayName={displayName()} />
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
								<button
									type="button"
									onClick={createNewSession}
									disabled={isCreatingSession()}
									class={cn(
										"btn btn-primary w-full",
										isCreatingSession() && "loading",
									)}
								>
									{isCreatingSession() ? "Creating..." : "Create New Session"}
								</button>
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
