import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, isNull, count, sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import type { Comment } from "../src/db/schema";

const { Pool } = pg;

interface CommentWithReplies extends Comment {
	replies: CommentWithReplies[];
}

async function main() {
	console.log("Testing nested comments functionality...");
	const pool = new Pool({
		connectionString: process.env.ZERO_UPSTREAM_DB,
	});

	// Check if connection works
	try {
		const client = await pool.connect();
		console.log("Database connection successful!");
		client.release();
	} catch (error) {
		console.error("Failed to connect to database:", error);
		process.exit(1);
	}

	const db = drizzle(pool, { schema });

	try {
		// Fetch root comments (no parent)
		console.log("\nFetching root comments...");
		const rootComments = await db
			.select()
			.from(schema.comments)
			.where(isNull(schema.comments.parentCommentId))
			.limit(5);

		console.log(`Found ${rootComments.length} root comments`);
		console.table(
			rootComments.map((c) => ({
				id: c.id.substring(0, 8),
				body: `${c.body.substring(0, 30)}...`,
				suggestionId: c.suggestionId.substring(0, 8),
				isRootComment: c.isRootComment,
			})),
		);

		if (rootComments.length > 0) {
			// Take the first root comment and find its replies
			const commentWithReplies = rootComments[0];
			console.log(
				`\nFetching replies for comment ${commentWithReplies.id.substring(0, 8)}...`,
			);

			const replies = await db
				.select()
				.from(schema.comments)
				.where(eq(schema.comments.parentCommentId, commentWithReplies.id));

			console.log(`Found ${replies.length} replies`);
			console.table(
				replies.map((c) => ({
					id: c.id.substring(0, 8),
					body: `${c.body.substring(0, 30)}...`,
					parentId: c.parentCommentId?.substring(0, 8),
					isRootComment: c.isRootComment,
				})),
			);

			// Find a suggestion with comments and display them as a tree
			console.log(
				"\nFetching a suggestion with all its comments and parent-child relationships...",
			);

			// Get suggestion IDs that have comments
			const suggestionsWithComments = await db
				.select({
					suggestionId: schema.comments.suggestionId,
					commentCount: count(schema.comments.id),
				})
				.from(schema.comments)
				.groupBy(schema.comments.suggestionId)
				.orderBy(desc(count(schema.comments.id)))
				.limit(1);

			if (suggestionsWithComments.length > 0) {
				const suggestionId = suggestionsWithComments[0].suggestionId;

				// Get the suggestion
				const suggestion = await db.query.suggestions.findFirst({
					where: (suggestions, { eq }) => eq(suggestions.id, suggestionId),
				});

				if (suggestion) {
					console.log(`Suggestion: ${suggestion.id.substring(0, 8)}`);
					console.log(`"${suggestion.body.substring(0, 50)}..."`);

					// Get all comments for this suggestion
					const comments = await db
						.select()
						.from(schema.comments)
						.where(eq(schema.comments.suggestionId, suggestionId));

					console.log(
						`\nTotal comments for this suggestion: ${comments.length}`,
					);

					// Organize comments into a tree structure
					const commentMap = new Map<string, CommentWithReplies>();
					const treeRootComments: CommentWithReplies[] = [];

					// First pass: create a map of all comments
					for (const comment of comments) {
						commentMap.set(comment.id, {
							...comment,
							replies: [],
						});
					}

					// Second pass: build the tree
					for (const comment of comments) {
						if (comment.parentCommentId) {
							const parent = commentMap.get(comment.parentCommentId);
							if (parent) {
								parent.replies.push(
									commentMap.get(comment.id) as CommentWithReplies,
								);
							}
						} else {
							treeRootComments.push(
								commentMap.get(comment.id) as CommentWithReplies,
							);
						}
					}

					// Output the tree
					console.log("\nComment tree:");
					printCommentTree(treeRootComments);
				} else {
					console.log("Could not find suggestion");
				}
			} else {
				console.log("No suggestions with comments found");
			}
		}

		console.log("\nAll nested comment tests completed!");
	} catch (error) {
		console.error("Error testing nested comments:", error);
	} finally {
		await pool.end();
	}
}

// Helper function to print the comment tree
function printCommentTree(comments: CommentWithReplies[], depth = 0) {
	for (const comment of comments) {
		const indent = " ".repeat(depth * 4);
		console.log(
			`${indent}📝 Comment ${comment.id.substring(0, 8)} by User ${comment.userId.substring(0, 6)} - "${comment.body.substring(0, 30)}..."`,
		);

		if (comment.replies.length > 0) {
			printCommentTree(comment.replies, depth + 1);
		}
	}
}

main();
