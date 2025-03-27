import { SkeletonLoader } from "../components/SkeletonLoader";
import { useZero } from "../context/ZeroContext";
import { cn } from "../utils/cn";
import { useUser } from "../hooks/useUser";
import { useSuggestions } from "../hooks/useSuggestions";
import { Board } from "../components/SuggestionBoard/Board";

export function FeedbackPageSkeleton() {
	return (
		<div>
			<SkeletonLoader type="feedback" count={5} />
		</div>
	);
}

export function FeedbackPage() {
	const z = useZero();
	const { displayName, userId } = useUser();
	if (!z || !userId) return <FeedbackPageSkeleton />;

	const [suggestions] = useSuggestions();

	return (
		<div class="h-[100dvh] flex flex-col">
			<header class={"p-4 h-[var(--header-height)] flex-none"}>
				<h1 class="text-3xl font-bold mb-2">Feedback Board</h1>
			</header>

			<main
				class={cn(
					"flex-1 h-[var(--main-height)] bg-base-300",
					"flex justify-center",
				)}
			>
				<Board
					userId={userId}
					displayName={displayName()}
					suggestions={suggestions}
				/>
			</main>
		</div>
	);
}
