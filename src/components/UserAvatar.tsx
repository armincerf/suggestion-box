import { createMemo, createSignal, Index, type JSX, Show } from "solid-js";
import { useZero } from "../zero/ZeroContext";
import { useQuery } from "@rocicorp/zero/solid";
import { AvatarEditorModal } from "./AvatarEditor";
import { HoverCard } from "@ark-ui/solid/hover-card";
import { createListCollection, Select } from "@ark-ui/solid";
import { Portal } from "solid-js/web";
import { useUser } from "../hooks/data/useUser";
import { QUERY_TTL_FOREVER } from "../utils/constants";
import { createLogger } from "../hyperdx-logger";

const logger = createLogger("suggestion-box:UserAvatar");

function AvatarHoverCard(props: {
	isMe: boolean;
	currentDisplayName: string;
	displayName: string;
	avatarUrl: string;
	children: JSX.Element;
	class?: string | undefined;
}) {
	return (
		<HoverCard.Root openDelay={300} closeDelay={200}>
			<HoverCard.Trigger>
				<div class={`shrink-0 relative ${props.class || ""}`}>
					{props.children}
				</div>
			</HoverCard.Trigger>
			<Portal>
				<HoverCard.Positioner>
					<HoverCard.Content class="bg-white rounded-lg p-4 shadow-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
						<HoverCard.Arrow>
							<HoverCard.ArrowTip />
						</HoverCard.Arrow>
						<div class="flex flex-col items-center gap-3">
							<img
								src={props.avatarUrl}
								alt={`${props.currentDisplayName}'s avatar`}
								class="w-42  border-2 border-gray-200 dark:border-gray-700"
							/>
							<div class="text-center">
								<p class="font-bold text-gray-800 dark:text-gray-200">
									{props.currentDisplayName}
								</p>
								{props.isMe && (
									<p class="text-sm text-gray-500 dark:text-gray-400">
										It's a me!
									</p>
								)}
								{props.displayName !== props.currentDisplayName && (
									<p class="text-sm text-gray-500 dark:text-gray-400">
										Previously known as {props.displayName}
									</p>
								)}
							</div>
						</div>
					</HoverCard.Content>
				</HoverCard.Positioner>
			</Portal>
		</HoverCard.Root>
	);
}

interface UserAvatarProps {
	userId: string;
	displayName: string;
	size?: "xs" | "sm" | "md" | "lg";
	class?: string;
	editable?: boolean;
}

export function UserAvatar(props: UserAvatarProps) {
	const z = useZero();
	const { user, color: userColor } = useUser(props.userId);
	const [isHovered, setIsHovered] = createSignal(false);
	const [showEditor, setShowEditor] = createSignal(false);
	const isCurrentUser = () => props.userId === z.userID;
	const editable = () => props.editable !== false && isCurrentUser();

	const avatarUrl = () => {
		// Use the user's avatar if available, otherwise use a default with consistent color
		return (
			user()?.avatarUrl ||
			`https://ui-avatars.com/api/?name=${encodeURIComponent(props.displayName)}&background=${encodeURIComponent(userColor().replace("#", ""))}&color=fff`
		);
	};

	const sizeClass = () => {
		switch (props.size) {
			case "xs":
				return "size-4";
			case "sm":
				return "size-8";
			case "lg":
				return "size-12";
			default:
				return "size-10";
		}
	};

	const handleAvatarClick = () => {
		if (editable()) {
			setShowEditor(true);
		}
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			handleAvatarClick();
		}
	};

	const handleAvatarUpdate = async (newAvatarUrl: string) => {
		try {
			// Update the user's avatar in the database
			await z.mutate.users.update({
				id: z.userID,
				avatarUrl: newAvatarUrl,
			});

			setShowEditor(false);
		} catch (error) {
			logger.error("Failed to update avatar:", error);
			throw error;
		}
	};

	return (
		<>
			<AvatarHoverCard
				isMe={isCurrentUser()}
				currentDisplayName={user()?.displayName ?? ""}
				displayName={props.displayName}
				avatarUrl={avatarUrl()}
				class={props.class}
			>
				<div
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
					onClick={handleAvatarClick}
					onKeyPress={handleKeyPress}
					role={editable() ? "button" : undefined}
					tabIndex={-1}
					aria-label={
						editable() ? `Edit ${props.displayName}'s avatar` : undefined
					}
				>
					<img
						tabIndex={-1}
						alt={`${props.displayName}'s avatar`}
						src={avatarUrl()}
						class={`inline-block rounded-full ${sizeClass()} ${editable() ? "cursor-pointer" : ""}`}
					/>

					{editable() && isHovered() && (
						<div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
								<path d="m15 5 4 4" />
							</svg>
						</div>
					)}
				</div>
			</AvatarHoverCard>

			<Show when={showEditor()}>
				<AvatarEditorModal
					isOpen={showEditor()}
					onClose={() => setShowEditor(false)}
					onSave={handleAvatarUpdate}
					currentAvatarUrl={avatarUrl()}
					displayName={props.displayName}
				/>
			</Show>
		</>
	);
}

export function SelectUser(props: {
	userIds: string[];
	selectedUserId: string | undefined;
	setSelectedUserId: (userId: string | undefined) => void;
	disabled?: boolean;
}) {
	const z = useZero();
	const userIds = () => props.userIds;
	const selectedUserId = () => props.selectedUserId;
	const [users] = useQuery(
		() =>
			z.query.users.where("id", "IN", userIds()).orderBy("displayName", "asc"),
		{
			ttl: QUERY_TTL_FOREVER,
		},
	);
	const usersOptions = createMemo(() =>
		createListCollection({
			items: users().map((user) => ({
				id: user.id,
				displayName: user.displayName,
				avatar: user.avatarUrl,
			})),
		}),
	);
	const selectedUserName = createMemo(() => {
		const user = users().find((user) => user.id === selectedUserId());
		return user?.displayName ?? "";
	});

	return (
		<Select.Root
			collection={usersOptions()}
			value={[selectedUserId() ?? ""]}
			onValueChange={(e) => {
				logger.info("onValueChange", { e });
				if (e.items.length === 0) {
					props.setSelectedUserId(undefined);
				}
			}}
			disabled={props.disabled}
		>
			<Select.Control class="flex items-center justify-between w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 bg-white dark:bg-gray-700 text-sm">
				<Select.Trigger class="flex-1 text-left focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
					<Select.ValueText
						placeholder={
							selectedUserId()
								? `Assigned to ${selectedUserName()}`
								: "Select a User"
						}
						class="text-gray-700 dark:text-gray-200"
					/>
				</Select.Trigger>
				<Show when={selectedUserId()}>
					<Select.ClearTrigger class="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
						Clear
					</Select.ClearTrigger>
				</Show>
			</Select.Control>
			<Portal>
				<Select.Positioner class="z-10 w-64">
					<Select.Content class="max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1">
						<Select.ItemGroup>
							<Select.ItemGroupLabel class="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
								Users
							</Select.ItemGroupLabel>
							<Index each={usersOptions().items}>
								{(item) => (
									<Select.Item
										item={item()}
										class="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
										onClick={() => props.setSelectedUserId(item().id)}
									>
										<Select.ItemText class="flex-1">
											{item().displayName}
										</Select.ItemText>
										<Show when={item().avatar}>
											{(avatar) => (
												<Select.ItemIndicator class="ml-2">
													<img
														src={avatar()}
														alt={item().displayName}
														class="w-5 h-5 rounded-full"
													/>
												</Select.ItemIndicator>
											)}
										</Show>
									</Select.Item>
								)}
							</Index>
						</Select.ItemGroup>
					</Select.Content>
				</Select.Positioner>
			</Portal>
			<Select.HiddenSelect />
		</Select.Root>
	);
}
