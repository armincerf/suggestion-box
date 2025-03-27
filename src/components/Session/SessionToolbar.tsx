import { type Accessor, For, Show } from "solid-js";
import { cn } from "../../utils/cn";
import { HomeIcon } from "lucide-solid";
import { UserAvatar } from "../UserAvatar";
import { useSearchParams } from "@solidjs/router";

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
	setShowConfirmEnd: (show: boolean) => void;
}

export function SessionToolbar(props: SessionToolbarProps) {
	const handleSortChange = (option: SortOption) => {
		setSearchParams({ sort: option });
	};
	const [searchParams, setSearchParams] = useSearchParams();

	// Helper function to check if a user is selected
	const isUserSelected = (userId: string) => {
		const paramUserIds = searchParams.userId;
		if (!paramUserIds) return false;
		
		let isSelected = false;
		if (Array.isArray(paramUserIds)) {
			isSelected = paramUserIds.includes(userId);
		} else {
			// Handle case where it's a single string
			isSelected = paramUserIds === userId;
		}
		
		return isSelected;
	};

	const handleUserSelect = (userId: string) => {
		const currentUserIds = searchParams.userId;
		
		let selectedUserIds: string[] = [];
		
		if (currentUserIds) {
			selectedUserIds = Array.isArray(currentUserIds) 
				? [...currentUserIds] 
				: [currentUserIds];
		}
		
		const index = selectedUserIds.indexOf(userId);
		if (index >= 0) {
			selectedUserIds.splice(index, 1);
		} else {
			selectedUserIds.push(userId);
		}
		
		if (selectedUserIds.length === 0) {
			setSearchParams({ ...searchParams, userId: null });
		} else {
			setSearchParams({ ...searchParams, userId: selectedUserIds });
		}
	};

	return (
		<header class="h-[var(--header-height)] bg-white dark:bg-gray-800 shadow-sm rounded-md p-3">
			<Show
				when={
					props.isSessionLeader &&
					!props.isSessionStarted &&
					!props.isSessionEnded
				}
			>
				<button
					type="button"
					class="btn bg-white text-indigo-600 hover:bg-gray-100 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
					onClick={() => props.setShowConfirmEnd(true)}
				>
					End Session
				</button>
			</Show>
			<div class="flex items-center justify-between gap-3">
				<div class="flex flex-col md:flex-row gap-3 overflow-x-auto w-full">
					<a href="/" class="btn btn-ghost hidden md:flex">
						<HomeIcon class="w-6 h-6" />
					</a>

					<div class="flex flex-wrap gap-2 items-center min-w-0">
						<span class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
							Filter:
						</span>
						<div class="flex gap-2 items-center overflow-x-auto max-w-[50dvw]">
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

					<div class="flex items-center hidden md:flex">
						<label
							class="text-sm text-gray-600 dark:text-gray-400 mr-1 whitespace-nowrap"
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
				{props.isSessionLeader && !props.isSessionEnded && (
					<button
						type="button"
						onClick={props.onEndSession}
						class="btn btn-xs sm:btn-sm btn-warning flex-shrink-0"
					>
						End Session
					</button>
				)}
			</div>
		</header>
	);
}
