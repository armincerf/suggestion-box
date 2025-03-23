import { createSignal, type JSX, Show } from "solid-js";
import { useZero } from "../context/ZeroContext";
import { useQuery } from "@rocicorp/zero/solid";
import { AvatarEditorModal } from "./AvatarEditor";
import { Popover } from "@ark-ui/solid/popover";

function AvatarDetails(props: {
	isMe: boolean;
	currentDisplayName: string;
	displayName: string;
	children: JSX.Element;
	class?: string | undefined;
	isOpen: boolean;
	onClose: () => void;
}) {
	const [isHovered, setIsHovered] = createSignal(false);

	return (
		<Popover.Root
			open={props.isOpen}
			closeOnEscape={false}
			closeOnInteractOutside={false}
			onInteractOutside={() => {
				setIsHovered(false);
				props.onClose();
			}}
			onEscapeKeyDown={() => {
				setIsHovered(false);
				props.onClose();
			}}
		>
			<Popover.Anchor>
				<div
					class={`shrink-0 relative ${props.class || ""} ${isHovered() ? "bg-black bg-opacity-40 rounded-full" : ""}`}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
				>
					{props.children}
				</div>
			</Popover.Anchor>
			<Popover.Positioner>
				<Popover.Content class="bg-white rounded-lg p-4 dark:bg-gray-800">
					<Popover.Title>User Details</Popover.Title>
					<Popover.Description>
						<p>
							<span class="font-bold">
								{props.displayName !== props.currentDisplayName
									? "Now known as"
									: "Name:"}
							</span>{" "}
							{props.isMe ? "It's a me!" : props.currentDisplayName}
						</p>
					</Popover.Description>
				</Popover.Content>
			</Popover.Positioner>
		</Popover.Root>
	);
}

interface UserAvatarProps {
	userId: string;
	displayName: string;
	size?: "sm" | "md" | "lg";
	class?: string;
	editable?: boolean;
}

export function UserAvatar(props: UserAvatarProps) {
	const z = useZero();
	const [isHovered, setIsHovered] = createSignal(false);
	const [showEditor, setShowEditor] = createSignal(false);
	const isCurrentUser = () => props.userId === z.userID;
	const editable = () => props.editable !== false && isCurrentUser();

	const [user] = useQuery(() => z.query.user.where("id", props.userId).one(), {
		ttl: "forever",
	});

	const avatarUrl = () => {
		// Use the user's avatar if available, otherwise use a default
		return (
			user()?.avatarUrl ||
			`https://ui-avatars.com/api/?name=${encodeURIComponent(props.displayName)}&background=random`
		);
	};

	const sizeClass = () => {
		switch (props.size) {
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
		} else {
			setShowDetails(true);
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
			await z.mutate.user.update({
				id: z.userID,
				avatarUrl: newAvatarUrl,
			});

			setShowEditor(false);
		} catch (error) {
			console.error("Failed to update avatar:", error);
			// You could add error handling UI here
		}
	};
	const [showDetails, setShowDetails] = createSignal(false);

	return (
		<>
			<AvatarDetails
				isMe={isCurrentUser()}
				currentDisplayName={user()?.displayName ?? ""}
				displayName={props.displayName}
				isOpen={showDetails()}
				onClose={() => setShowDetails(false)}
				class={props.class}
			>
				<div
					class={`shrink-0 relative ${props.class || ""}`}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
					onClick={handleAvatarClick}
					onKeyPress={handleKeyPress}
					role={editable() ? "button" : undefined}
					tabIndex={editable() ? 0 : undefined}
					aria-label={
						editable() ? `Edit ${props.displayName}'s avatar` : undefined
					}
				>
					<img
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
			</AvatarDetails>

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
