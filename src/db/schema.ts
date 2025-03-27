import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	integer,
	boolean,
	jsonb,
} from "drizzle-orm/pg-core";

// Category table
export const categories = pgTable("category", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	backgroundColor: text("background_color").notNull(),
});

// Suggestion table
export const suggestions = pgTable("suggestion", {
	id: text("id").primaryKey(),
	body: text("body").notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
	userId: text("user_id").notNull(),
	displayName: text("display_name"),
	categoryId: text("category_id")
		.notNull()
		.references(() => categories.id, { onDelete: "cascade" }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const actionItems = pgTable("action_item", {
	id: text("id").primaryKey(),
	suggestionId: text("suggestion_id")
		.notNull()
		.references(() => suggestions.id, { onDelete: "cascade" }),
	body: text("body").notNull(),
	completed: boolean("completed").notNull().default(false),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	assignedTo: text("assigned_to").references(() => users.id, {
		onDelete: "cascade",
	}),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// Comment table - handling self-reference
export const comments = pgTable("comment", {
	id: text("id").primaryKey(),
	body: text("body").notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
	suggestionId: text("suggestion_id")
		.notNull()
		.references(() => suggestions.id, { onDelete: "cascade" }),
	parentCommentId: text("parent_comment_id"),
	selectionStart: integer("selection_start"),
	selectionEnd: integer("selection_end"),
	userId: text("user_id").notNull(),
	displayName: text("display_name"),
	isRootComment: boolean("is_root_comment").notNull().default(false),
});

// Reaction table
export const reactions = pgTable("reaction", {
	id: text("id").primaryKey(),
	suggestionId: text("suggestion_id").references(() => suggestions.id, {
		onDelete: "cascade",
	}),
	commentId: text("comment_id").references(() => comments.id, {
		onDelete: "cascade",
	}),
	emoji: text("emoji").notNull(),
	userId: text("user_id").notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

// User table - using quotes because "user" is a reserved keyword
export const users = pgTable("user", {
	id: text("id").primaryKey(),
	displayName: text("display_name").notNull(),
	avatarUrl: text("avatar_url"),
	color: text("color"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// Session table
export const sessions = pgTable("session", {
	id: text("id").primaryKey(),
	startedAt: timestamp("started_at", { withTimezone: true }),
	startedBy: text("started_by")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	endedAt: timestamp("ended_at", { withTimezone: true }),
	users: jsonb("users").$type<string[]>(),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// Define relationships
export const categoriesRelations = relations(categories, ({ many }) => ({
	suggestions: many(suggestions),
}));

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
	suggestion: one(suggestions, {
		fields: [actionItems.suggestionId],
		references: [suggestions.id],
	}),
	assignedTo: one(users, {
		fields: [actionItems.assignedTo],
		references: [users.id],
	}),
}));

export const suggestionsRelations = relations(suggestions, ({ one, many }) => ({
	category: one(categories, {
		fields: [suggestions.categoryId],
		references: [categories.id],
	}),
	comments: many(comments),
	reactions: many(reactions, { relationName: "suggestionReactions" }),
	actionItems: many(actionItems),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	suggestion: one(suggestions, {
		fields: [comments.suggestionId],
		references: [suggestions.id],
	}),
	parentComment: one(comments, {
		fields: [comments.parentCommentId],
		references: [comments.id],
		relationName: "commentReplies",
	}),
	replies: many(comments, {
		relationName: "commentReplies",
	}),
	reactions: many(reactions, { relationName: "commentReactions" }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
	suggestion: one(suggestions, {
		fields: [reactions.suggestionId],
		references: [suggestions.id],
		relationName: "suggestionReactions",
	}),
	comment: one(comments, {
		fields: [reactions.commentId],
		references: [comments.id],
		relationName: "commentReactions",
	}),
}));

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.startedBy],
		references: [users.id],
	}),
}));
