import {
	type Accessor,
	For,
	Show,
	createSignal,
	createEffect,
	onCleanup,
	createMemo,
} from "solid-js";
import { cn } from "../../utils/cn";
import HomeIcon from "lucide-solid/icons/home";
import ListPlusIcon from "lucide-solid/icons/list-plus";
import VoteIcon from "lucide-solid/icons/vote";
import PlayIcon from "lucide-solid/icons/play";
import PauseIcon from "lucide-solid/icons/pause";
import { UserAvatar } from "../UserAvatar";
import { useSearchParams } from "@solidjs/router";
import { CreatePollModal } from "../Polls/CreatePollModal";
import { faker } from "@faker-js/faker";
import { useZero } from "../../zero/ZeroContext";
import { useUser } from "../../hooks/data/useUser";
import { useCategories } from "../../hooks/data/useCategories";
import { useCreateSuggestion } from "../../hooks/mutations/suggestionMutations";

type SortOption = "thumbsUp" | "thumbsDown" | "newest" | "oldest";
type SimulationSpeed = "off" | "slow" | "fast";

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
	const z = useZero();
	const { userId } = useUser();

	// Simulation State
	const [isSimulating, setIsSimulating] = createSignal(false);
	const [simulationSpeed, setSimulationSpeed] =
		createSignal<SimulationSpeed>("off");
	const [simulationIntervalId, setSimulationIntervalId] = createSignal<
		ReturnType<typeof setInterval> | number | undefined
	>(undefined);

	// Get Data & Mutations for Simulation
	const [categories] = useCategories();
	const createSuggestion = useCreateSuggestion();

	// Check if running on localhost
	const isLocalhost = createMemo(
		() =>
			typeof window !== "undefined" && window.location.hostname === "localhost",
	);

	const isCreatePollModalOpen = () => searchParams.createPoll === "true";
	const openCreatePollModal = () => setSearchParams({ createPoll: "true" });
	const closeCreatePollModal = () => setSearchParams({ createPoll: undefined });

	const handleSortChange = (option: SortOption) =>
		setSearchParams({ sort: option });
	const handleUserSelect = (userId: string) => {
		const currentUserIds = searchParams.userId;
		let selectedUserIds: string[] = [];
		if (currentUserIds) {
			selectedUserIds = Array.isArray(currentUserIds)
				? [...currentUserIds]
				: [currentUserIds];
		}
		const index = selectedUserIds.indexOf(userId);
		if (index >= 0) selectedUserIds.splice(index, 1);
		else selectedUserIds.push(userId);
		setSearchParams({
			...searchParams,
			userId: selectedUserIds.length > 0 ? selectedUserIds : null,
		});
	};
	const isUserSelected = (userId: string) => {
		return Array.isArray(searchParams.userId)
			? searchParams.userId.includes(userId)
			: searchParams.userId === userId;
	};

	// Simulation Logic
	const performRandomAction = async () => {
		if (!z || !userId) return;

		const availableCategories = categories();

		if (!availableCategories || availableCategories.length === 0) {
			console.warn("Simulation: No categories available.");
			return;
		}

		try {
			const randomCategory = faker.helpers.arrayElement(availableCategories);
			const body = faker.hacker.phrase();
			console.log("Simulation: Creating suggestion...", body);
			await createSuggestion(body, randomCategory.id);
		} catch (error) {
			console.error("Simulation Error performing action:", error);
		}
	};

	const stopSimulation = () => {
		const intervalId = simulationIntervalId();
		if (intervalId !== undefined) {
			if (simulationSpeed() === "fast") {
				clearTimeout(intervalId as number);
			} else {
				clearInterval(intervalId as ReturnType<typeof setInterval>);
			}
			setSimulationIntervalId(undefined);
		}
		setIsSimulating(false);
		setSimulationSpeed("off");
		console.log("Simulation: Stopped");
	};

	const startSimulation = (speed: SimulationSpeed) => {
		if (speed === "off") {
			stopSimulation();
			return;
		}

		stopSimulation();
		setSimulationSpeed(speed);
		setIsSimulating(true);
		console.log(`Simulation: Starting (${speed})`);

		if (speed === "slow") {
			const id = setInterval(performRandomAction, 1000);
			setSimulationIntervalId(id);
		} else if (speed === "fast") {
			const runFast = () => {
				performRandomAction().finally(() => {
					if (isSimulating() && simulationSpeed() === "fast") {
						const id = setTimeout(runFast, 0);
						setSimulationIntervalId(id);
					} else if (simulationIntervalId() !== undefined) {
						clearTimeout(simulationIntervalId() as number);
						setSimulationIntervalId(undefined);
					}
				});
			};
			runFast();
		}
	};

	// Effect to manage simulation start/stop based on signals
	createEffect(() => {
		const speed = simulationSpeed();
		if (speed === "off") {
			stopSimulation();
		}
	});

	// Cleanup timer on component unmount
	onCleanup(() => {
		stopSimulation();
	});

	return (
		<>
			<header class="h-[var(--header-height)] bg-base-100 dark:bg-base-800 shadow-sm rounded-md p-3">
				<div class="flex items-center justify-between gap-3">
					<div class="flex flex-col md:flex-row gap-3 overflow-x-auto w-full">
						<a href="/" class="btn btn-ghost hidden md:flex">
							<HomeIcon class="w-6 h-6" />
						</a>
						<span class="hidden md:block badge badge-neutral mt-2">
							Filter by creator:
						</span>
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
												class="mr-1"
											/>
											<p class="text-xs sm:text-sm">{user.displayName}</p>
										</button>
									)}
								</For>
							</div>
							<Show when={searchParams.userId}>
								<span class="text-xs text-gray-500">
									{Array.isArray(searchParams.userId)
										? searchParams.userId.length
										: 1}{" "}
									users selected
								</span>
								<button
									type="button"
									class="btn btn-xs btn-outline btn-error"
									onClick={() => setSearchParams({ userId: undefined })}
								>
									Clear
								</button>
							</Show>
						</div>

						<div class="flex h-full items-center hidden md:flex mt-1">
							<label class="badge badge-neutral mr-2" for="sort-options">
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
					<button
						type="button"
						aria-label="Search"
						class={cn(
							"flex items-center gap-1 h-8 md:w-24 md:mb-4 rounded-full bg-gray-950/2 px-2 py-1 ",
							"inset-ring inset-ring-gray-950/8 hover:bg-gray-950/30 transition-colors duration-200",
						)}
						onClick={props.onOpenSearch}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 16 16"
							fill="currentColor"
							aria-hidden="true"
							data-slot="icon"
							class="-ml-0.5 size-5 fill-gray-600"
						>
							<title>Search Suggestions & Comments</title>
							<path
								fill-rule="evenodd"
								d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
								clip-rule="evenodd"
							/>
						</svg>
						<kbd class="hidden md:block font-sans text-xs/4 text-gray-500 not-in-[.macos]:after:content-['Ctrl_K'] in-[.macos]:after:content-['⌘K']" />
					</button>
					<div class="hidden md:flex items-center gap-2 flex-shrink-0 ml-auto mb-4">
						{/* Simulation Controls (localhost only) */}
						<Show
							when={
								isLocalhost() && props.isSessionStarted && !props.isSessionEnded
							}
						>
							<div class="join">
								<button
									type="button"
									class={cn(
										"join-item btn btn-sm btn-outline",
										isSimulating() ? "btn-warning" : "btn-success",
									)}
									onClick={() =>
										isSimulating() ? stopSimulation() : startSimulation("slow")
									}
									title={
										isSimulating()
											? "Stop Simulation"
											: "Start Simulating Activity"
									}
								>
									{isSimulating() ? (
										<PauseIcon class="w-4 h-4" />
									) : (
										<PlayIcon class="w-4 h-4" />
									)}
									Simulate
								</button>
								<button
									type="button"
									class={cn(
										"join-item btn btn-sm btn-outline",
										simulationSpeed() === "slow" && "btn-active",
									)}
									onClick={() => startSimulation("slow")}
									disabled={!isSimulating() && simulationSpeed() === "slow"}
									title="Set simulation speed to Slow (1 action/sec)"
								>
									Slow
								</button>
								<button
									type="button"
									class={cn(
										"join-item btn btn-sm btn-outline",
										simulationSpeed() === "fast" && "btn-active",
									)}
									onClick={() => startSimulation("fast")}
									disabled={!isSimulating() && simulationSpeed() === "fast"}
									title="Set simulation speed to Fast (max speed)"
								>
									Fast
								</button>
							</div>
						</Show>

						<Show
							when={
								props.isSessionStarted &&
								!props.isSessionEnded &&
								!props.isPollActive
							}
						>
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
