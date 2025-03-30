import { Show, createMemo, createSignal } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { SkeletonLoader } from "../SkeletonLoader";
import { useUser } from "../../hooks/data/useUser";
import { Board } from "../SuggestionBoard/Board";
import { SessionToolbar } from "./SessionToolbar";
import { type SortOption, useSuggestions } from "../../hooks/data/useSuggestions";

interface SessionBoardProps {
	sessionId: string;
	sessionStartedAt: number;
	sessionEndedAt: number | null;
	isSessionLeader: boolean;
	isSessionEnded: boolean;
	isSessionStarted: boolean;
	onEndSession: () => void;
}

export function SessionBoard(props: SessionBoardProps) {
	const { userId, displayName } = useUser();
	const [showConfirmEnd, setShowConfirmEnd] = createSignal(false);
	const [searchParams, setSearchParams] = useSearchParams();

	const [allSuggestions] = useSuggestions(true);
	const [suggestions] = useSuggestions();

	const users = createMemo(() => {
		const users = new Set<string>();
		for (const suggestion of allSuggestions()) {
			users.add(suggestion.userId);
		}
		return Array.from(users).map((userId) => {
			return {
				id: userId,
				displayName:
					allSuggestions().find((s) => s.userId === userId)?.displayName ?? null,
			};
		});
	});

	const handleEndSession = () => {
		props.onEndSession();
		setShowConfirmEnd(false);
	};

	return (
		<div class="h-[100dvh] flex flex-col">
			<SessionToolbar
				users={users}
				isSessionLeader={props.isSessionLeader}
				isSessionEnded={props.isSessionEnded}
				onEndSession={() => setShowConfirmEnd(true)}
				currentSortOption={(searchParams.sort as SortOption) || "thumbsUp"}
				isSessionStarted={props.isSessionStarted}
				setShowConfirmEnd={setShowConfirmEnd}
			/>

			<main class="flex-1 h-[var(--main-height)] bg-base-300 dark:bg-base-800">
				<Show
					when={suggestions()}
					fallback={<SkeletonLoader type="feedback" count={5} />}
				>
					<Board
						userId={userId}
						displayName={displayName()}
						readOnly={props.isSessionEnded}
						suggestions={suggestions}
					/>
				</Show>
			</main>

			{/* End Session Confirmation Modal */}
			<Show when={showConfirmEnd()}>
				<div class="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
						<h2 class="text-xl font-bold mb-4 dark:text-white">End Session?</h2>
						<p class="mb-6 dark:text-gray-300">
							Are you sure you want to end this session? Once ended,
							participants will be able to view suggestions but not add new
							ones.
						</p>
						<div class="flex justify-end space-x-2">
							<button
								type="button"
								class="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
								onClick={() => setShowConfirmEnd(false)}
							>
								Cancel
							</button>
							<button
								type="button"
								class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
								onClick={handleEndSession}
							>
								End Session
							</button>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
}
