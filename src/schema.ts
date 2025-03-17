// These data structures define your client-side schema.
// They must be equal to or a subset of the server-side schema.
// Note the "relationships" field, which defines first-class
// relationships between tables.
// See https://github.com/rocicorp/mono/blob/main/apps/zbugs/src/domain/schema.ts
// for more complex examples, including many-to-many.

import {
	createSchema,
	definePermissions,
	type ExpressionBuilder,
	type Row,
	ANYONE_CAN,
	table,
	string,
	relationships,
	number,
	type PermissionsConfig,
	boolean,
} from "@rocicorp/zero";

// Category entity
const category = table("category")
	.columns({
		id: string(),
		name: string(),
		description: string(),
		backgroundColor: string().from("background_color"),
	})
	.primaryKey("id");

// Suggestion entity
const suggestion = table("suggestion")
	.columns({
		id: string(),
		body: string(),
		timestamp: number(),
		userIdentifier: string().from("user_identifier"),
		displayName: string().from("display_name").optional(),
		categoryID: string().from("category_id"),
	})
	.primaryKey("id");

const comment = table("comment")
	.columns({
		id: string(),
		body: string(),
		timestamp: number(),
		suggestionID: string().from("suggestion_id"),
		parentCommentID: string().from("parent_comment_id").optional(),
		isRootComment: boolean().from("is_root_comment"),
		// For selection-based comments
		selectionStart: number().from("selection_start").optional(),
		selectionEnd: number().from("selection_end").optional(),
		userIdentifier: string().from("user_identifier"),
		displayName: string().from("display_name").optional(),
	})
	.primaryKey("id");

// Reaction entity (can be on a suggestion or a comment)
const reaction = table("reaction")
	.columns({
		id: string(),
		suggestionID: string().from("suggestion_id").optional(),
		commentID: string().from("comment_id").optional(),
		emoji: string(),
		userIdentifier: string().from("user_identifier"),
		timestamp: number(),
	})
	.primaryKey("id");

// User entity
const user = table("user")
	.columns({
		id: string(),
		displayName: string().from("display_name"),
		avatarUrl: string().optional().from("avatar_url"),
		createdAt: number().from("created_at"),
	})
	.primaryKey("id");

// Session entity
const session = table("session")
	.columns({
		id: string(),
		startedAt: number().from("started_at"),
		startedBy: string().from("started_by"),
	})
	.primaryKey("id");

// Define relationships
const commentRelationships = relationships(comment, ({ one, many }) => ({
	suggestion: one({
		sourceField: ["suggestionID"],
		destField: ["id"],
		destSchema: suggestion,
	}),
	parentComment: one({
		sourceField: ["parentCommentID"],
		destField: ["id"],
		destSchema: comment,
	}),
	replies: many({
		sourceField: ["id"],
		destField: ["parentCommentID"],
		destSchema: comment,
	}),
}));

const reactionRelationships = relationships(reaction, ({ one }) => ({
	suggestion: one({
		sourceField: ["suggestionID"],
		destField: ["id"],
		destSchema: suggestion,
	}),
	comment: one({
		sourceField: ["commentID"],
		destField: ["id"],
		destSchema: comment,
	}),
}));

const suggestionRelationships = relationships(suggestion, ({ many, one }) => ({
	comments: many({
		sourceField: ["id"],
		destField: ["suggestionID"],
		destSchema: comment,
	}),
	reactions: many({
		sourceField: ["id"],
		destField: ["suggestionID"],
		destSchema: reaction,
	}),
	category: one({
		sourceField: ["categoryID"],
		destField: ["id"],
		destSchema: category,
	}),
}));

const categoryRelationships = relationships(category, ({ many }) => ({
	suggestions: many({
		sourceField: ["id"],
		destField: ["categoryID"],
		destSchema: suggestion,
	}),
}));

// Add relationships for user and session
const userRelationships = relationships(user, ({ many }) => ({
	sessions: many({
		sourceField: ["id"],
		destField: ["startedBy"],
		destSchema: session,
	}),
}));

const sessionRelationships = relationships(session, ({ one }) => ({
	user: one({
		sourceField: ["startedBy"],
		destField: ["id"],
		destSchema: user,
	}),
}));

export const schema = createSchema({
	tables: [suggestion, comment, reaction, category, user, session],
	relationships: [
		commentRelationships,
		reactionRelationships,
		suggestionRelationships,
		categoryRelationships,
		userRelationships,
		sessionRelationships,
	],
});

export type Schema = typeof schema;
export type Suggestion = Row<typeof schema.tables.suggestion> & {
	comments: Readonly<Row<typeof schema.tables.comment>[]>;
	reactions: Readonly<Row<typeof schema.tables.reaction>[]>;
};
export type Comment = Row<typeof schema.tables.comment> & {
	reactions?: Readonly<Row<typeof schema.tables.reaction>[]>;
};
export type Reaction = Row<typeof schema.tables.reaction>;
export type Category = Row<typeof schema.tables.category>;
export type User = Row<typeof schema.tables.user>;
export type Session = Row<typeof schema.tables.session>;

// The contents of your decoded JWT.
type AuthData = {
	sub: string | null;
};

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	// Allow users to only edit their own suggestions
	const allowIfSuggestionCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "suggestion">,
	) => {
		// We're using userIdentifier field to match with localStorage ID
		return cmp("userIdentifier", authData.sub ?? "");
	};

	// Allow users to only delete their own comments
	const allowIfCommentCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "comment">,
	) => {
		return cmp("userIdentifier", authData.sub ?? "");
	};

	// Allow users to only delete their own reactions
	const allowIfReactionCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "reaction">,
	) => {
		return cmp("userIdentifier", authData.sub ?? "");
	};

	// Allow users to only update their own user name
	const allowIfUserCreator = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<Schema, "user">,
	) => {
		return cmp("id", authData.sub ?? "");
	};

	return {
		suggestion: {
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
		comment: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				delete: [allowIfCommentCreator], // Only allow deleting own comments
			},
		},
		reaction: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				delete: [allowIfReactionCreator], // Only allow deleting own reactions
			},
		},
		category: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				// No update or delete permissions for categories
			},
		},
		user: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				update: {
					preMutation: [allowIfUserCreator],
					postMutation: [allowIfUserCreator],
				},
			},
		},
		session: {
			row: {
				insert: ANYONE_CAN,
				select: ANYONE_CAN,
				// No update or delete permissions for sessions
			},
		},
	} satisfies PermissionsConfig<AuthData, Schema>;
});