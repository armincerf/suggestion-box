import { createZeroSchema } from "drizzle-zero";
import {
	definePermissions,
	type Row,
	ANYONE_CAN,
	type PermissionsConfig,
	type ExpressionBuilder,
} from "@rocicorp/zero";
import * as drizzleSchema from "./db/schema";

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
	},
});

// The contents of your decoded JWT.
type AuthData = {
	sub: string | null;
};

export type Schema = typeof schema;
export type Category = Row<typeof schema.tables.categories>;
export type Suggestion = Row<typeof schema.tables.suggestions>;
export type Comment = Row<typeof schema.tables.comments>;
export type Reaction = Row<typeof schema.tables.reactions>;
export type User = Row<typeof schema.tables.users>;
export type Session = Row<typeof schema.tables.sessions>;

// Check the schema field names after converter creates them
type SuggestionFields = keyof Suggestion;
type CommentFields = keyof Comment;
type ReactionFields = keyof Reaction;
type UserFields = keyof User;

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	// Allow users to only edit their own suggestions
	const allowIfSuggestionCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "suggestions">,
	) => {
		return cmp("userId", authData.sub ?? "");
	};

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

	return {
		suggestions: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: [allowIfSuggestionCreator],
					postMutation: [allowIfSuggestionCreator],
				},
				// No delete permission for suggestions
			},
		},
		comments: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				delete: [allowIfCommentCreator], // Only allow deleting own comments
			},
		},
		reactions: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				delete: [allowIfReactionCreator], // Only allow deleting own reactions
			},
		},
		categories: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				// No update or delete permissions for categories
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
				// No update or delete permissions for sessions
			},
		},
	} satisfies PermissionsConfig<AuthData, Schema>;
});
