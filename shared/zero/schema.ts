import { createZeroSchema } from "drizzle-zero";
import {
	definePermissions,
	type Row,
	ANYONE_CAN,
	type PermissionsConfig,
	type ExpressionBuilder,
} from "@rocicorp/zero";
import * as drizzleSchema from "../../src/db/schema";

// Convert Drizzle schema to Zero schema
export const schema = createZeroSchema(drizzleSchema, {
	tables: {
		categories: {
			id: true,
			name: true,
			description: true,
			backgroundColor: true,
		},
		suggestions: {
			id: true,
			body: true,
			timestamp: true,
			userId: true,
			displayName: true,
			categoryId: true,
			updatedAt: true,
			deletedAt: true,
		},
		actionItems: {
			id: true,
			suggestionId: true,
			body: true,
			completed: true,
			completedAt: true,
			assignedTo: true,
			createdAt: true,
			updatedAt: true,
		},
		comments: {
			id: true,
			body: true,
			timestamp: true,
			suggestionId: true,
			parentCommentId: true,
			selectionStart: true,
			selectionEnd: true,
			userId: true,
			displayName: true,
			isRootComment: true,
		},
		reactions: {
			id: true,
			suggestionId: true,
			commentId: true,
			emoji: true,
			userId: true,
			timestamp: true,
		},
		users: {
			id: true,
			displayName: true,
			avatarUrl: true,
			color: true,
			createdAt: true,
			updatedAt: true,
		},
		sessions: {
			id: true,
			startedAt: true,
			startedBy: true,
			endedAt: true,
			users: true,
			updatedAt: true,
		},
		polls: {
			id: true,
			sessionId: true,
			createdByUserId: true,
			title: true,
			createdAt: true,
			endedAt: true,
		},
		pollQuestions: {
			id: true,
			pollId: true,
			text: true,
			order: true,
		},
		pollOptions: {
			id: true,
			questionId: true,
			text: true,
			order: true,
		},
		pollVotes: {
			id: true,
			optionId: true,
			userId: true,
			questionId: true,
			pollId: true,
			createdAt: true,
		},
		pollAcknowledgements: {
			id: true,
			pollId: true,
			userId: true,
			sessionId: true,
			acknowledgedAt: true,
		},
	},
});

// The contents of your decoded JWT.
type AuthData = {
	sub: string | null;
};

export type Schema = typeof schema;

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	// Allow users to only delete their own comments
	const allowIfCommentCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "comments">,
	) => {
		return cmp("userId", authData.sub ?? "");
	};

	// Allow users to only delete their own reactions
	const allowIfReactionCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "reactions">,
	) => {
		return cmp("userId", authData.sub ?? "");
	};

	// Allow users to only update their own user name
	const allowIfUserCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "users">,
	) => {
		return cmp("id", authData.sub ?? "");
	};

	// Allow users to only create polls
	const allowIfPollCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "polls">,
	) => {
		return cmp("createdByUserId", authData.sub ?? "");
	};

	return {
		suggestions: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: ANYONE_CAN,
					postMutation: ANYONE_CAN,
				},
				delete: ANYONE_CAN,
			},
		},
		actionItems: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: ANYONE_CAN,
					postMutation: ANYONE_CAN,
				},
				delete: ANYONE_CAN,
			},
		},
		comments: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: ANYONE_CAN,
					postMutation: ANYONE_CAN,
				},
				delete: [allowIfCommentCreator],
			},
		},
		reactions: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				delete: [allowIfReactionCreator],
			},
		},
		categories: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: ANYONE_CAN,
					postMutation: ANYONE_CAN,
				},
				delete: ANYONE_CAN,
			},
		},
		users: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: [allowIfUserCreator],
					postMutation: [allowIfUserCreator],
				},
			},
		},
		sessions: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: ANYONE_CAN,
					postMutation: ANYONE_CAN,
				},
			},
		},
		polls: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: [allowIfPollCreator],
					postMutation: [allowIfPollCreator],
				},
			},
		},
		pollQuestions: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
			},
		},
		pollOptions: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
			},
		},
		pollVotes: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
			},
		},
		pollAcknowledgements: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
			},
		},
	} satisfies PermissionsConfig<AuthData, Schema>;
});

export type Category = Row<typeof schema.tables.categories>;
export type Suggestion = Row<typeof schema.tables.suggestions> & {
	comments?: Readonly<Comment[]>;
	reactions?: Readonly<Reaction[]>;
	actionItems?: Readonly<ActionItem[]>;
	category?: Readonly<Category>;
};
export type Comment = Row<typeof schema.tables.comments> & {
	replies?: Readonly<Comment[]>;
	reactions?: Readonly<Reaction[]>;
	parentComment?: Readonly<Comment>;
	suggestion?: Readonly<Suggestion>;
};
export type Reaction = Row<typeof schema.tables.reactions>;
export type User = Row<typeof schema.tables.users> & {
	pollAcknowledgements?: Readonly<PollAcknowledgement[]>;
};
export type Session = Row<typeof schema.tables.sessions> & {
	user?: Readonly<User>;
	polls?: Readonly<Poll[]>;
	pollAcknowledgements?: Readonly<PollAcknowledgement[]>;
};
export type ActionItem = Row<typeof schema.tables.actionItems> & {
	assignedTo?: Readonly<User>;
	suggestion?: Readonly<Suggestion>;
};
export type Poll = Row<typeof schema.tables.polls> & {
	creator?: Readonly<User>;
	session?: Readonly<Session>;
	questions?: Readonly<PollQuestion[]>;
	votes?: Readonly<PollVote[]>;
	acknowledgements?: Readonly<PollAcknowledgement[]>;
};
export type PollQuestion = Row<typeof schema.tables.pollQuestions> & {
	poll?: Readonly<Poll>;
	options?: Readonly<PollOption[]>;
	votes?: Readonly<PollVote[]>;
};
export type PollOption = Row<typeof schema.tables.pollOptions> & {
	question?: Readonly<PollQuestion>;
	votes?: Readonly<PollVote[]>;
};
export type PollVote = Row<typeof schema.tables.pollVotes> & {
	user?: Readonly<User>;
	option?: Readonly<PollOption>;
	question?: Readonly<PollQuestion>;
	poll?: Readonly<Poll>;
};
export type PollAcknowledgement = Row<typeof schema.tables.pollAcknowledgements> & {
	user?: Readonly<User>;
	poll?: Readonly<Poll>;
	session?: Readonly<Session>;
};
