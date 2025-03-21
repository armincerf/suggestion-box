import { createMemo, createSignal, For } from "solid-js";
import type { User } from "../../schema";
import { AvatarEditorModal } from "../AvatarEditor/AvatarEditorModal";
import { useZero } from "../../context/ZeroContext";
import { useUser } from "../../hooks/useUser";

interface WaitingRoomProps {
	sessionId: string;
	users: User[];
	isSessionLeader: boolean;
	onStartSession: () => void;
}

export function WaitingRoom(props: WaitingRoomProps) {
	const z = useZero();
	const { userIdentifier, displayName, user } = useUser();
	const [showAvatarEditor, setShowAvatarEditor] = createSignal(false);
	const shareUrl = createMemo(
		() => `${window.location.origin}/sessions/${props.sessionId}`,
	);
	const [isCopied, setIsCopied] = createSignal(false);

	const handleUpdateAvatar = async (newAvatarUrl: string) => {
		if (!z || !userIdentifier) return;

		try {
			await z.mutate.user.update({
				id: userIdentifier,
				avatarUrl: newAvatarUrl,
			});
			setShowAvatarEditor(false);
		} catch (error) {
			console.error("Error updating avatar:", error);
		}
	};

	const copyToClipboard = () => {
		navigator.clipboard.writeText(shareUrl());
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<div class="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
			<div class="bg-indigo-600 dark:bg-indigo-800 p-6 text-white">
				<h1 class="text-3xl font-bold mb-2">Waiting Room</h1>
				<p class="opacity-90">Waiting to start retrospective session...</p>
			</div>

			<div class="p-6 dark:text-white">
				{/* Share link section */}
				<div class="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
					<h2 class="text-lg font-medium mb-2">
						Share this link with your team
					</h2>
					<div class="flex gap-2">
						<input
							type="text"
							value={shareUrl()}
							readonly
							class="flex-grow p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
						/>
						<button
							type="button"
							onClick={copyToClipboard}
							class="btn btn-primary btn-sm"
						>
							{isCopied() ? "Copied!" : "Copy"}
						</button>
					</div>
				</div>

				{/* Connected users section */}
				<div class="mb-8">
					<h2 class="text-lg font-medium mb-4">
						Connected Users ({props.users.length})
					</h2>

					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						<For each={props.users}>
							{(user) => (
								<div class="flex items-center p-3 border dark:border-gray-700 rounded-lg dark:bg-gray-700">
									<div class="size-10 rounded-full overflow-hidden mr-3">
										<img
											src={
												user.avatarUrl ||
												`https://api.dicebear.com/6.x/bottts/svg?seed=${user.id}`
											}
											alt={user.displayName}
											class="w-full h-full object-cover"
										/>
									</div>
									<div>
										<p class="font-medium">{user.displayName}</p>
										{user.id === userIdentifier && (
											<span class="text-xs text-indigo-600 dark:text-indigo-400">(You)</span>
										)}
									</div>
								</div>
							)}
						</For>
					</div>
				</div>

				{/* Edit profile section */}
				<div class="border-t dark:border-gray-700 pt-6 mb-8">
					<h2 class="text-lg font-medium mb-4">Your Profile</h2>

					<div class="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
						<div class="size-16 rounded-full overflow-hidden mr-4">
							<img
								src={user()?.avatarUrl || ""}
								alt={displayName()}
								class="w-full h-full object-cover"
							/>
						</div>
						<div class="flex-grow">
							<p class="font-medium text-lg">{displayName()}</p>
							<button
								type="button"
								onClick={() => setShowAvatarEditor(true)}
								class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
							>
								Change Avatar
							</button>
						</div>
					</div>
				</div>

				{/* Start session button (session leader only) */}
				{props.isSessionLeader && (
					<div class="flex justify-center pt-4 border-t dark:border-gray-700">
						<button
							type="button"
							onClick={props.onStartSession}
							class="btn btn-primary btn-lg"
						>
							Start Session
						</button>
					</div>
				)}
			</div>

			{/* Avatar editor modal */}
			<AvatarEditorModal
				isOpen={showAvatarEditor()}
				onClose={() => setShowAvatarEditor(false)}
				onSave={handleUpdateAvatar}
				currentAvatarUrl={user()?.avatarUrl || ""}
				displayName={displayName()}
			/>
		</div>
	);
}
