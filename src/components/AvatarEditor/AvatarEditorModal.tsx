import { createSignal, Show } from "solid-js";
import { Modal } from "../Modal";
import { AvatarDrawer } from "./AvatarDrawer";
import { AvatarUploader } from "./AvatarUploader";
import { RandomAvatarSelector } from "./RandomAvatarSelector";

type EditorTab = "draw" | "upload" | "random";

interface AvatarEditorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (avatarUrl: string) => void;
	currentAvatarUrl: string;
	displayName: string;
}

export function AvatarEditorModal(props: AvatarEditorModalProps) {
	const [activeTab, setActiveTab] = createSignal<EditorTab>("draw");
	const [previewUrl, setPreviewUrl] = createSignal<string>(
		props.currentAvatarUrl,
	);

	const handleSave = () => {
		props.onSave(previewUrl());
	};

	const tabClass = (tab: EditorTab) => {
		return `px-4 py-2 font-medium text-sm rounded-t-lg dark:bg-gray-700 dark:hover:bg-gray-600 ${
			activeTab() === tab
				? "bg-white text-indigo-600 border-b-2 border-indigo-600 dark:bg-gray-700 dark:text-indigo-400 dark:border-indigo-400"
				: "text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
		}`;
	};

	return (
		<Modal
			isOpen={props.isOpen}
			onClose={props.onClose}
			title="Edit Your Avatar"
		>
			<div class="flex flex-col h-full">
				{/* Tabs */}
				<div class="flex space-x-2 mb-4 border-b">
					<button
						type="button"
						class={tabClass("draw")}
						onClick={() => setActiveTab("draw")}
						aria-selected={activeTab() === "draw"}
						role="tab"
					>
						Draw Pixel Art
					</button>
					<button
						type="button"
						class={tabClass("upload")}
						onClick={() => setActiveTab("upload")}
						aria-selected={activeTab() === "upload"}
						role="tab"
					>
						Upload
					</button>
					<button
						type="button"
						class={tabClass("random")}
						onClick={() => setActiveTab("random")}
						aria-selected={activeTab() === "random"}
						role="tab"
					>
						Simple Text + Colour
					</button>
				</div>

				{/* Content */}
				<div class="flex-1 min-h-0">
					<Show when={activeTab() === "draw"}>
						<AvatarDrawer onUpdate={setPreviewUrl} />
					</Show>

					<Show when={activeTab() === "upload"}>
						<AvatarUploader onUpdate={setPreviewUrl} />
					</Show>

					<Show when={activeTab() === "random"}>
						<RandomAvatarSelector
							displayName={props.displayName}
							onUpdate={setPreviewUrl}
						/>
					</Show>
				</div>

				{/* Preview and Actions */}
				<div class="mt-4 flex items-center justify-between">
					<div class="flex items-center space-x-4">
						<div class="text-sm font-medium">Preview:</div>
						<div class="size-12 rounded-full overflow-hidden">
							<img
								src={previewUrl()}
								alt="Avatar preview"
								class="w-full h-full object-cover"
							/>
						</div>
					</div>

					<div class="flex space-x-2">
						<button
							type="button"
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
							onClick={props.onClose}
						>
							Cancel
						</button>
						<button
							type="button"
							class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
							onClick={handleSave}
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
}
