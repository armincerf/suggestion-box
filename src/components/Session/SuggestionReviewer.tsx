import { createSignal, Show, Index, type Accessor } from "solid-js";
import type { Suggestion, User, Category, Session } from "../../zero/schema";
import { SuggestionItem } from "../SuggestionCard/SuggestionItem";
import { useUser } from "../../hooks/data/useUser";
import { useZero } from "../../zero/ZeroContext";
import { useQuery } from "@rocicorp/zero/solid";
import { SelectUser } from "../UserAvatar";
import { randID } from "../../rand";
import { useCategories } from "../../hooks/data/useCategories";
import { cn } from "../../utils/cn";
import { darkenHexString } from "../../utils/colorUtils";
import Trash2Icon from "lucide-solid/icons/trash-2";

interface SuggestionReviewerProps {
	currentSuggestion: Accessor<Suggestion | undefined>;
	isSessionLeader: boolean;
	isSessionEnded: boolean;
	users: User[];
}

export function SuggestionReviewer(props: SuggestionReviewerProps) {
	const { userId, displayName } = useUser();
	const z = useZero();
	const [categories] = useCategories();

	// Get the current suggestion's category
	const currentCategory = () => {
		const suggestion = props.currentSuggestion();
		if (!suggestion) return undefined;
		return categories().find((cat) => cat.id === suggestion.categoryId);
	};

	// Add action item to the current suggestion
	const addActionItem = (
		suggestionId: string,
		text: string,
		assignedTo?: string,
	) => {
		if (!text.trim()) return;

		z.mutate.actionItems.insert({
			id: suggestionId + randID(),
			suggestionId: suggestionId,
			assignedTo: assignedTo,
			body: text.trim(),
			completed: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
	};

	// Remove action item from the current suggestion
	const removeActionItem = (actionItemId: string) => {
		z.mutate.actionItems.delete({
			id: actionItemId,
		});
	};
	const [actionItems] = useQuery(() =>
		z.query.actionItems.orderBy("createdAt", "desc").related("assignedTo"),
	);

	const hasSuggestionActionItems = (suggestionId: string | undefined) => {
		if (!suggestionId) return false;
		return actionItems().length > 0;
	};

	// Get action items for a suggestion
	const getSuggestionActionItems = (suggestionId: string | undefined) => {
		if (!suggestionId) return [];
		return actionItems().filter((item) => item.suggestionId === suggestionId);
	};
	const currentSuggestion = () => props.currentSuggestion();
	const [actionItemText, setActionItemText] = createSignal("");
	const [actionItemAssignedTo, setActionItemAssignedTo] = createSignal<
		string | undefined
	>(undefined);

	return (
		<div class="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
			<div class="bg-indigo-600 dark:bg-indigo-800 p-6 text-white">
				<h1 class="text-3xl font-bold mb-2">Review Suggestions</h1>
				<p class="opacity-90">
					Review suggestions submitted since the last session
				</p>
			</div>
			<Show when={currentCategory()}>
				{(category) => (
					<div
						class={cn(
							"ml-7 mt-6 inline-flex items-center px-3 py-1 rounded-md text-sm font-medium",
							"border border-opacity-30 border-white",
						)}
						style={{
							"background-color": category().backgroundColor,
							color: darkenHexString(category().backgroundColor, 200),
						}}
					>
						{category().name} - {category().description}
					</div>
				)}
			</Show>

			<div class="p-6 dark:text-white">
				<div class="mb-8">
					<Show
						when={currentSuggestion()}
						fallback={
							<div class="p-4 text-center dark:text-gray-300">
								<p>No suggestions to review.</p>
							</div>
						}
					>
						{(suggestion) => (
							<SuggestionItem
								suggestion={suggestion()}
								userId={userId}
								displayName={displayName()}
								readOnly={props.isSessionEnded}
							/>
						)}
					</Show>
				</div>

				{/* Action Items Section */}
				<Show when={props.currentSuggestion()}>
					<div class="border-t dark:border-gray-700 pt-6 mb-8">
						<h2 class="text-xl font-semibold mb-4">Action Items</h2>

						<div class="space-y-4">
							{/* Action item list */}
							<Show
								when={hasSuggestionActionItems(props.currentSuggestion()?.id)}
								fallback={
									<p class="text-gray-500 dark:text-gray-400">
										No action items yet. Add some below and assign to a user.
									</p>
								}
							>
								<ul class="space-y-2">
									<Index
										each={getSuggestionActionItems(
											props.currentSuggestion()?.id,
										)}
									>
										{(item) => (
											<li class="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
												<span class="flex-grow dark:text-gray-200 flex justify-between gap-2 pr-4">
													<span class="text-sm text-gray-500 dark:text-gray-400">
														{item().body}
													</span>
													<Show when={item().assignedTo}>
														<span class="text-sm text-gray-500 dark:text-gray-400">
															Assigned to {item().assignedTo.displayName}
														</span>
													</Show>
												</span>
												<button
													type="button"
													onClick={() => {
														removeActionItem(item().id);
													}}
													class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
													disabled={props.isSessionEnded}
												>
													Remove
												</button>
											</li>
										)}
									</Index>
								</ul>
							</Show>

							{/* Add action item form */}
							<Show when={!props.isSessionEnded}>
								<div class="flex flex-col gap-2">
									<textarea
										id="new-action-item"
										class="w-full textarea shadow-sm"
										placeholder="Action item..."
										value={actionItemText()}
										onChange={(e) => setActionItemText(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												const id = props.currentSuggestion()?.id;
												if (id) {
													addActionItem(
														id,
														(e.target as HTMLInputElement).value,
														actionItemAssignedTo() ?? undefined,
													);
													(e.target as HTMLInputElement).value = "";
												}
											}
										}}
									/>
									<SelectUser
										userIds={props.users.map((user) => user.id)}
										selectedUserId={actionItemAssignedTo() ?? undefined}
										setSelectedUserId={(userId) => {
											setActionItemAssignedTo(userId);
										}}
										disabled={actionItemText().trim() === ""}
									/>
									<button
										type="button"
										class="btn btn-primary"
										onClick={() => {
											const input = document.getElementById(
												"new-action-item",
											) as HTMLInputElement;
											const id = props.currentSuggestion()?.id;
											if (input && id) {
												addActionItem(id, input.value, actionItemAssignedTo());
												input.value = "";
											}
										}}
									>
										Add
									</button>
								</div>
							</Show>
						</div>
					</div>
				</Show>

				<div class="flex justify-between border-t dark:border-gray-700 pt-6">
					<button
						type="button"
						onClick={() => {
							z.mutate.suggestions.update({
								id: props.currentSuggestion()?.id,
								deletedAt: Date.now(),
							});
						}}
						class="btn btn-outline dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						disabled={false}
					>
						<Trash2Icon class="w-5 h-5" /> Delete
					</button>

					<button
						type="button"
						onClick={() => {
							const suggestionId = props.currentSuggestion()?.id;
							console.log("suggestionId", suggestionId);
							if (!suggestionId) return;
							console.log("updating suggestion");
							z.mutate.suggestions.update({
								id: suggestionId,
								updatedAt: Date.now(),
							});
						}}
						class="btn btn-primary"
					>
						Save
					</button>
				</div>
			</div>
		</div>
	);
}
