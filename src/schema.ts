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
} from "@rocicorp/zero";

// Suggestion entity
const suggestion = table("suggestion")
	.columns({
		id: string(),
		body: string(),
		timestamp: number(),
		userIdentifier: string().from("user_identifier"),
	})
	.primaryKey("id");

// Comment entity (can be on a suggestion or a reply to another comment)
const comment = table("comment")
	.columns({
		id: string(),
		body: string(),
		timestamp: number(),
		suggestionID: string().from("suggestion_id"),
		parentCommentID: string().from("parent_comment_id").optional(),
		// For selection-based comments
		selectionStart: number().from("selection_start").optional(),
		selectionEnd: number().from("selection_end").optional(),
		userIdentifier: string().from("user_identifier"),
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

const suggestionRelationships = relationships(suggestion, ({ many }) => ({
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
}));

export const schema = createSchema({
	tables: [suggestion, comment, reaction],
	relationships: [commentRelationships, reactionRelationships, suggestionRelationships],
});

export type Schema = typeof schema;
export type Suggestion = Row<typeof schema.tables.suggestion>;
export type Comment = Row<typeof schema.tables.comment>;
export type Reaction = Row<typeof schema.tables.reaction>;

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
	} satisfies PermissionsConfig<AuthData, Schema>;
});

export default {
	schema,
	permissions,
};
