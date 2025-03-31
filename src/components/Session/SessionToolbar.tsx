import { type Accessor, For, Show } from "solid-js";
import { cn } from "../../utils/cn";
import HomeIcon from "lucide-solid/icons/home";
import ListPlusIcon from "lucide-solid/icons/list-plus";
import VoteIcon from "lucide-solid/icons/vote";
import SearchIcon from "lucide-solid/icons/search";
import { UserAvatar } from "../UserAvatar";
import { useSearchParams } from "@solidjs/router";
import { CreatePollModal } from "../Polls/CreatePollModal";

type SortOption = "thumbsUp" | "thumbsDown" | "newest" | "oldest";

interface SessionToolbarProps {
	users: Accessor<
		{
			id: string;
			displayName: string | null;
		}[]
	>;
	isSessionLeader: boolean;
	isSessionStarted: boolean;
	isSessionEnded: boolean;
	onEndSession: () => void;
	currentSortOption: SortOption;
	setShowConfirmEnd?: (show: boolean) => void;
	sessionId: string;
	isPollActive: boolean;
	onReopenPollModal: (dismissed: boolean) => void;
	onOpenSearch: () => void;
}

export function SessionToolbar(props: SessionToolbarProps) {
	const [searchParams, setSearchParams] = useSearchParams();

	const isCreatePollModalOpen = () => searchParams.createPoll === 'true';

	const openCreatePollModal = () => setSearchParams({ createPoll: 'true' });
	const closeCreatePollModal = () => setSearchParams({ createPoll: undefined });

	const handleSortChange = (option: SortOption) => setSearchParams({ sort: option });
	
	const handleUserSelect = (userId: string) => {
		const currentUserIds = searchParams.userId;
		let selectedUserIds: string[] = [];
		if (currentUserIds) {
			selectedUserIds = Array.isArray(currentUserIds) ? [...currentUserIds] : [currentUserIds];
		}
		const index = selectedUserIds.indexOf(userId);
		if (index >= 0) selectedUserIds.splice(index, 1); else selectedUserIds.push(userId);
		setSearchParams({ ...searchParams, userId: selectedUserIds.length > 0 ? selectedUserIds : null });
	};
	
	const isUserSelected = (userId: string) => {
		return Array.isArray(searchParams.userId) 
			? searchParams.userId.includes(userId) 
			: searchParams.userId === userId;
	};

	return (
		<>
			<header class="h-[var(--header-height)] bg-base-100 dark:bg-base-800 shadow-sm rounded-md p-3">
				<div class="flex items-center justify-between gap-3">
					<div class="flex flex-col md:flex-row gap-3 overflow-x-auto w-full">
						<a href="/" class="btn btn-ghost hidden md:flex">
							<HomeIcon class="w-6 h-6" />
						</a>
						<span class="hidden md:block badge badge-neutral mt-2">Filter by creator:</span>
						<div class="flex flex-wrap gap-2 items-center min-w-0">
							<div class="flex gap-2 items-center overflow-x-auto md:max-w-[50dvw]">
								<For each={props.users()}>
									{(user) => (
										<button
											type="button"
											onClick={() => handleUserSelect(user.id)}
											class={cn(
												"inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm",
												"transition-colors duration-200 flex-shrink-0",
												isUserSelected(user.id)
													? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
													: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
											)}
										>
											<UserAvatar
												userId={user.id}
												displayName={user.displayName ?? ""}
												size="sm"
											/>
											<p class="text-xs sm:text-sm">{user.displayName}</p>
										</button>
									)}
								</For>
							</div>
						</div>

						<div class="flex h-full items-center hidden md:flex mt-1">
							<label
								class="badge badge-neutral mr-2"
								for="sort-options"
							>
								Sort:
							</label>
							<select
								id="sort-options"
								class="select select-xs sm:select-sm select-bordered rounded-md text-xs sm:text-sm"
								value={props.currentSortOption}
								onChange={(e) =>
									handleSortChange(e.currentTarget.value as SortOption)
								}
							>
								<option value="thumbsUp">👍 Most upvotes</option>
								<option value="thumbsDown">👎 Most downvotes</option>
								<option value="newest">Newest first</option>
								<option value="oldest">Oldest first</option>
							</select>
						</div>
					</div>

					<div class="hidden md:flex items-center gap-2 flex-shrink-0 ml-auto mb-4">
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-circle"
							onClick={props.onOpenSearch}
							title="Search Suggestions & Comments"
						>
							<SearchIcon class="w-5 h-5" />
						</button>

						<Show when={props.isSessionStarted && !props.isSessionEnded && !props.isPollActive}>
							<button
								type="button"
								class="btn btn-sm btn-outline btn-primary"
								onClick={openCreatePollModal}
								title="Create a new poll for this session"
							>
								<ListPlusIcon class="w-4 h-4 mr-1" />
								Create Poll
							</button>
						</Show>
						<Show when={props.isPollActive}>
							<button
								type="button"
								class="btn btn-xs sm:btn-sm btn-info btn-outline"
								title="View active poll"
								onClick={() => props.onReopenPollModal(false)}
							>
								<VoteIcon class="w-4 h-4 mr-1" />
								Poll Active
							</button>
						</Show>

						<Show when={props.isSessionLeader && !props.isSessionEnded}>
							<button
								type="button"
								onClick={props.onEndSession}
								class="btn btn-xs sm:btn-sm btn-warning"
								title="End this retrospective session"
							>
								End Session
							</button>
						</Show>
					</div>
				</div>
			</header>

			<CreatePollModal
				isOpen={isCreatePollModalOpen()}
				onClose={closeCreatePollModal}
				sessionId={props.sessionId}
				isPollActive={props.isPollActive}
			/>
		</>
	);
}
