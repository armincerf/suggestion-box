// shared/zero/mutators.ts
import type { CustomMutatorDefs, Transaction } from "@rocicorp/zero";
import type { Schema } from "./schema";
import { type AuthData, assertIsLoggedIn } from "./auth";
import { v4 as uuidv4 } from "uuid";

// --- Define Argument Types (Keep or add as needed) ---
export type CreateSuggestionArgs = {
	body: string;
	categoryId: string;
};
export type UpdateSuggestionArgs = {
	id: string;
	body?: string;
	categoryId?: string;
};

export type AddCommentArgs = {
	body: string;
	suggestionId: string;
	parentCommentId?: string | null;
	selectionStart?: number | null;
	selectionEnd?: number | null;
};

export type UpdateCommentArgs = {
	id: string;
	body?: string;
};

// Session mutator arguments
export type CreateSessionArgs = {
	startedBy: string;
	users: string[];
};

export type UpdateSessionArgs = {
	id: string;
	users: string[];
};

// Poll mutator arguments
export type CreatePollArgs = {
	sessionId: string;
	title: string;
};

export type CreatePollQuestionArgs = {
	pollId: string;
	text: string;
	order: number;
};

export type CreatePollOptionArgs = {
	questionId: string;
	text: string;
	order: number;
};

export type CreatePollVoteArgs = {
	pollId: string;
	questionId: string;
	optionId: string;
};

export type AcknowledgePollArgs = {
	pollId: string;
	sessionId: string;
};

// --- Mutator Definitions ---
export function createMutators(authData: AuthData | undefined) {
	return {
		// Your custom mutators
		suggestions: {
			async create(
				tx: Transaction<Schema>,
				args: CreateSuggestionArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				const userId = authData.sub;
				const displayName = authData.name || userId;
				const suggestionId = uuidv4();

				console.log("Executing suggestion.create:", {
					...args,
					userId,
					displayName,
				});

				await tx.mutate.suggestions.insert({
					id: suggestionId,
					body: args.body,
					categoryId: args.categoryId,
					userId: userId,
					displayName: displayName,
					timestamp: Date.now(),
					updatedAt: Date.now(),
				});

				console.log("Suggestion created with ID:", suggestionId);
			},
			async customUpdate(
				tx: Transaction<Schema>,
				args: UpdateSuggestionArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				// TODO: Add permission check if needed

				console.log("Executing suggestion.update:", args);

				await tx.mutate.suggestions.update({
					...args,
					updatedAt: Date.now(),
				});

				console.log("Suggestion updated:", args.id);
			},
			async remove(
				tx: Transaction<Schema>,
				suggestionId: string,
			): Promise<void> {
				assertIsLoggedIn(authData);
				// TODO: Add permission check if needed

				console.log("Executing suggestion.delete (soft):", suggestionId);

				await tx.mutate.suggestions.update({
					id: suggestionId,
					deletedAt: Date.now(),
				});

				console.log("Suggestion soft-deleted:", suggestionId);
			},
		},
		comments: {
			async add(tx: Transaction<Schema>, args: AddCommentArgs): Promise<void> {
				assertIsLoggedIn(authData);
				const userId = authData.sub;
				const displayName = authData.name || userId;
				const commentId = uuidv4();

				console.log("Executing comment.add:", args);

				await tx.mutate.comments.insert({
					id: commentId,
					body: args.body,
					suggestionId: args.suggestionId,
					userId: userId,
					displayName: displayName,
					timestamp: Date.now(),
					parentCommentId: args.parentCommentId || null,
					isRootComment: !args.parentCommentId,
					selectionStart: args.selectionStart || null,
					selectionEnd: args.selectionEnd || null,
				});

				console.log("Comment added:", commentId);
			},
			async customUpdate(
				tx: Transaction<Schema>,
				args: UpdateCommentArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				// TODO: Add permission check if needed

				console.log("Executing comment.update:", args);

				await tx.mutate.comments.update({
					...args,
				});

				console.log("Comment updated:", args.id);
			},
			async remove(tx: Transaction<Schema>, commentId: string): Promise<void> {
				assertIsLoggedIn(authData);
				// TODO: Use the permission rule defined in schema.ts: allowIfCommentCreator

				console.log("Executing comment.delete (soft):", commentId);

				await tx.mutate.comments.update({
					id: commentId,
					deletedAt: Date.now(),
				});

				console.log("Comment soft-deleted:", commentId);
			},
		},
		sessions: {
			async create(
				tx: Transaction<Schema>,
				args: CreateSessionArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				const sessionId = uuidv4();
				const now = Date.now();

				console.log("Executing session.create:", {
					...args,
					id: sessionId,
				});

				await tx.mutate.sessions.insert({
					id: sessionId,
					startedBy: args.startedBy,
					users: args.users,
					startedAt: now,
					updatedAt: now,
					endedAt: null,
				});

				console.log("Session created with ID:", sessionId);
			},
			async customUpdate(
				tx: Transaction<Schema>,
				args: UpdateSessionArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);

				console.log("Executing session.update:", args);

				await tx.mutate.sessions.update({
					id: args.id,
					users: args.users,
					updatedAt: Date.now(),
				});

				console.log("Session updated:", args.id);
			},
			async end(tx: Transaction<Schema>, sessionId: string): Promise<void> {
				assertIsLoggedIn(authData);

				console.log("Executing session.end:", sessionId);

				await tx.mutate.sessions.update({
					id: sessionId,
					endedAt: Date.now(),
				});

				console.log("Session ended:", sessionId);
			},
		},
		polls: {
			async create(
				tx: Transaction<Schema>,
				args: CreatePollArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				const userId = authData.sub;
				const pollId = uuidv4();
				const now = Date.now();

				console.log("Executing poll.create:", {
					...args,
					createdByUserId: userId,
				});

				await tx.mutate.polls.insert({
					id: pollId,
					sessionId: args.sessionId,
					createdByUserId: userId,
					title: args.title,
					createdAt: now,
					endedAt: null,
				});

				console.log("Poll created with ID:", pollId);
			},
			async end(tx: Transaction<Schema>, pollId: string): Promise<void> {
				assertIsLoggedIn(authData);
				// TODO: Add permission check using allowIfPollCreator

				console.log("Executing poll.end:", pollId);

				await tx.mutate.polls.update({
					id: pollId,
					endedAt: Date.now(),
				});

				console.log("Poll ended:", pollId);
			},
		},
		pollQuestions: {
			async create(
				tx: Transaction<Schema>,
				args: CreatePollQuestionArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				const questionId = uuidv4();

				console.log("Executing pollQuestion.create:", {
					...args,
					id: questionId,
				});

				await tx.mutate.pollQuestions.insert({
					id: questionId,
					pollId: args.pollId,
					text: args.text,
					order: args.order,
				});

				console.log("Poll question created with ID:", questionId);
			},
		},
		pollOptions: {
			async create(
				tx: Transaction<Schema>,
				args: CreatePollOptionArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				const optionId = uuidv4();

				console.log("Executing pollOption.create:", {
					...args,
					id: optionId,
				});

				await tx.mutate.pollOptions.insert({
					id: optionId,
					questionId: args.questionId,
					text: args.text,
					order: args.order,
				});

				console.log("Poll option created with ID:", optionId);
			},
		},
		pollVotes: {
			async create(
				tx: Transaction<Schema>,
				args: CreatePollVoteArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				const userId = authData.sub;
				const voteId = uuidv4();
				const now = Date.now();

				console.log("Executing pollVote.create:", {
					...args,
					userId,
				});

				await tx.mutate.pollVotes.insert({
					id: voteId,
					pollId: args.pollId,
					questionId: args.questionId,
					optionId: args.optionId,
					userId: userId,
					createdAt: now,
				});

				console.log("Poll vote created with ID:", voteId);
			},
		},
		pollAcknowledgements: {
			async create(
				tx: Transaction<Schema>,
				args: AcknowledgePollArgs,
			): Promise<void> {
				assertIsLoggedIn(authData);
				const userId = authData.sub;
				const ackId = uuidv4();
				const now = Date.now();

				console.log("Executing pollAcknowledgement.create:", {
					...args,
					userId,
				});

				await tx.mutate.pollAcknowledgements.insert({
					id: ackId,
					pollId: args.pollId,
					userId: userId,
					sessionId: args.sessionId,
					acknowledgedAt: now,
				});

				console.log("Poll acknowledgement created with ID:", ackId);
			},
		},
		users: {
			customUpsert: async (
				tx: Transaction<Schema>,
				{
					id,
					displayName,
					avatarUrl,
					color,
				}: {
					id: string;
					displayName?: string;
					avatarUrl?: string;
					color?: string;
				},
			): Promise<void> => {
				await tx.mutate.users.upsert({
					id,
					displayName: displayName || id,
					avatarUrl:
						avatarUrl || `https://api.dicebear.com/6.x/bottts/svg?seed=${id}`,
					color: color || "#FFFFFF",
					createdAt: Date.now(),
				});

				console.log("User upserted:", id);
			},
			customUpdate: async (
				tx: Transaction<Schema>,
				{
					displayName,
					avatarUrl,
				}: { displayName?: string; avatarUrl?: string },
			): Promise<void> => {
				assertIsLoggedIn(authData);
				const userId = authData.sub;

				console.log("Executing users.update:", { displayName, avatarUrl });

				await tx.mutate.users.update({
					id: userId,
					displayName: displayName || undefined,
					avatarUrl: avatarUrl || undefined,
					updatedAt: Date.now(),
				});

				console.log("User updated:", userId);
			},
		},
	} as const satisfies CustomMutatorDefs<Schema>;
}

// --- Update Mutators Type Export ---
export type Mutators = ReturnType<typeof createMutators>;
