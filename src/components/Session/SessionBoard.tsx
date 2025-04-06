import {
	type Accessor,
	Show,
	createMemo,
	createSignal,
	createEffect,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { SkeletonLoader } from "../SkeletonLoader";
import { useUser } from "../../hooks/data/useUser";
import { Board } from "../SuggestionBoard/Board";
import { SessionToolbar } from "./SessionToolbar";
import {
	type SortOption,
	useSuggestions,
} from "../../hooks/data/useSuggestions";
import { SearchPalette } from "../Search/SearchPalette";
import {
	useKeyboardShortcuts,
	type ShortcutDefinition,
} from "../../hooks/ui/useKeyboardShortcuts";
import { useSessionUsers } from "../../hooks/data/useSession";

interface SessionBoardProps {
	sessionId: string;
	sessionStartedAt: number;
	sessionEndedAt: number | null;
	isSessionLeader: boolean;
	isSessionEnded: boolean;
	isSessionStarted: boolean;
	onEndSession: () => void;
	isPollActive: boolean;
	onReopenPollModal: (dismissed: boolean) => void;
}

export function SessionBoard(props: SessionBoardProps) {
	const { userId, displayName } = useUser();
	const [showConfirmEnd, setShowConfirmEnd] = createSignal(false);
	const [searchParams] = useSearchParams();

	const [isSearchOpen, setIsSearchOpen] = createSignal(false);

	const openSearch = () => {
		return setTimeout(() => {
			setIsSearchOpen(true);
		}, 100);
	};
	const closeSearch = () => setIsSearchOpen(false);

	const shortcuts: Accessor<ShortcutDefinition[]> = createMemo(() => [
		{
			// Slash '/' to open search (only if not in an input)
			key: "/",
			handler: (event) => {
				// The hook now handles the input check via `ignoreInput`
				event.preventDefault(); // Prevent typing '/'
				openSearch();
				// Focusing the input inside SearchPalette is handled within SearchPalette itself
			},
			ignoreInput: false,
		},
		{
			// Cmd/Ctrl + K to toggle search
			key: "k",
			ctrl: true, // Handles Cmd on Mac, Ctrl on Win/Linux
			handler: (event) => {
				event.preventDefault(); // Prevent browser find/bookmark actions
				openSearch();
			},
			ignoreInput: true,
		},
	]);

	useKeyboardShortcuts(shortcuts);

	const [users] = useSessionUsers(props.sessionId);

	const handleEndSession = () => {
		props.onEndSession();
		setShowConfirmEnd(false);
	};

	return (
		<>
			<div class="h-[100dvh] flex flex-col">
				<SessionToolbar
					onOpenSearch={openSearch}
					sessionId={props.sessionId}
					users={users}
					isSessionLeader={props.isSessionLeader}
					isSessionEnded={props.isSessionEnded}
					onEndSession={() => setShowConfirmEnd(true)}
					currentSortOption={(searchParams.sort as SortOption) || "thumbsUp"}
					isSessionStarted={props.isSessionStarted}
					isPollActive={props.isPollActive}
					onReopenPollModal={props.onReopenPollModal}
				/>

				<main class="flex-1 h-[var(--main-height)] bg-base-300 dark:bg-base-800">
					<Board
						userId={userId}
						displayName={displayName()}
						readOnly={props.isSessionEnded}
					/>
				</main>

				{/* End Session Confirmation Modal */}
				<Show when={showConfirmEnd()}>
					<div class="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
						<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
							<h2 class="text-xl font-bold mb-4 dark:text-white">
								End Session?
							</h2>
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

			<SearchPalette isOpen={isSearchOpen()} onClose={closeSearch} />
		</>
	);
}
