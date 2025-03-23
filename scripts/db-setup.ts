import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { seed, reset } from "drizzle-seed";
import * as schema from "../src/db/schema";
import { randomUUID } from "node:crypto";

const { Pool } = pg;

async function main() {
	console.log("Connecting to database...");
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

	// Reset the database (truncates all tables)
	console.log("Resetting database tables...");
	try {
		await reset(db, schema);
		console.log("Database reset successful!");

		// Seed initial data
		console.log("Seeding database with test data...");

		// First, create default categories
		console.log("Creating default categories...");
		await db.insert(schema.categories).values([
			{
				id: "start",
				name: "Start",
				description: "Things we should start doing",
				backgroundColor: "#BEE1Ce",
			},
			{
				id: "stop",
				name: "Stop",
				description: "Things we should stop doing",
				backgroundColor: "#e4bfcf",
			},
			{
				id: "continue",
				name: "Continue",
				description: "Things we should continue doing",
				backgroundColor: "#c3d2db",
			},
		]);
		console.log("Default categories created!");

		// Now, use a more manual approach to seed related data
		console.log("Generating related data...");

		// Create 10 users
		console.log("Creating users...");
		const userIds: string[] = [];
		for (let i = 0; i < 10; i++) {
			const userId = randomUUID();
			userIds.push(userId);

			await db.insert(schema.users).values({
				id: userId,
				displayName: `User ${i + 1}`,
				avatarUrl: `https://avatar.vercel.sh/${Math.random().toString(36).substring(2, 8)}`,
				color: [
					"#ff5733",
					"#33ff57",
					"#3357ff",
					"#f3ff33",
					"#ff33f3",
					"#33fff3",
				][i % 6],
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		// Create suggestions for each user
		console.log("Creating suggestions...");
		const suggestionIds: string[] = [];
		for (const userId of userIds) {
			// Each user has 1-5 suggestions
			const suggestionCount = Math.floor(Math.random() * 5) + 1;

			for (let i = 0; i < suggestionCount; i++) {
				const suggestionId = randomUUID();
				suggestionIds.push(suggestionId);

				await db.insert(schema.suggestions).values({
					id: suggestionId,
					userId,
					body: `This is suggestion ${i + 1} from user ${userId.substring(0, 6)}. It contains some random text that might be useful for testing the application. We can extend this to simulate real content.`,
					timestamp: new Date(
						Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
					), // Random date in the last 30 days
					categoryId: ["start", "stop", "continue"][
						Math.floor(Math.random() * 3)
					],
					displayName: `User ${i + 1}`,
					updatedAt: new Date(),
				});
			}
		}

		// Create comments for each suggestion
		console.log("Creating comments and reactions...");
		const commentIds: string[] = [];

		for (const suggestionId of suggestionIds) {
			// 70% chance to have comments
			if (Math.random() > 0.3) {
				// 1-10 comments per suggestion
				const commentCount = Math.floor(Math.random() * 10) + 1;

				for (let i = 0; i < commentCount; i++) {
					const commentId = randomUUID();
					commentIds.push(commentId);

					// Determine if we should include text selection (30% chance)
					const hasSelection = Math.random() < 0.3;
					const selectionStart = hasSelection
						? Math.floor(Math.random() * 50)
						: null;
					const selectionEnd = selectionStart
						? selectionStart + Math.floor(Math.random() * 50) + 10
						: null;

					// Random user from our list
					const randomUserId =
						userIds[Math.floor(Math.random() * userIds.length)];

					// The comment is a root comment (not a reply)
					await db.insert(schema.comments).values({
						id: commentId,
						suggestionId,
						userId: randomUserId,
						body: `This is comment ${i + 1} on suggestion ${suggestionId.substring(0, 6)}. It might contain a question, feedback, or observation about the suggestion.`,
						timestamp: new Date(
							Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
						),
						isRootComment: true,
						parentCommentId: null,
						selectionStart,
						selectionEnd,
						displayName: `User ${userIds.indexOf(randomUserId) + 1}`,
					});

					// Add reactions to some comments (50% chance)
					if (Math.random() > 0.5) {
						const reactionCount = Math.floor(Math.random() * 3) + 1;
						const emojis = [
							"👍",
							"👎",
							"❤️",
							"🎉",
							"😄",
							"😕",
							"🚀",
							"👀",
							"🔥",
							"💯",
						];

						for (let j = 0; j < reactionCount; j++) {
							await db.insert(schema.reactions).values({
								id: randomUUID(),
								commentId,
								suggestionId: null,
								userId: userIds[Math.floor(Math.random() * userIds.length)],
								emoji: emojis[Math.floor(Math.random() * emojis.length)],
								timestamp: new Date(),
							});
						}
					}
				}
			}

			// Add reactions to some suggestions (70% chance)
			if (Math.random() > 0.3) {
				const reactionCount = Math.floor(Math.random() * 5) + 1;
				const emojis = [
					"👍",
					"👎",
					"❤️",
					"🎉",
					"😄",
					"😕",
					"🚀",
					"👀",
					"🔥",
					"💯",
				];

				for (let i = 0; i < reactionCount; i++) {
					await db.insert(schema.reactions).values({
						id: randomUUID(),
						commentId: null,
						suggestionId,
						userId: userIds[Math.floor(Math.random() * userIds.length)],
						emoji: emojis[Math.floor(Math.random() * emojis.length)],
						timestamp: new Date(),
					});
				}
			}
		}

		// Create reply comments (nested comments)
		console.log("Creating nested reply comments...");
		for (const commentId of commentIds) {
			// 40% chance to have replies
			if (Math.random() > 0.6) {
				// 1-3 replies per comment
				const replyCount = Math.floor(Math.random() * 3) + 1;

				for (let i = 0; i < replyCount; i++) {
					const replyId = randomUUID();

					// Get the parent comment to access its suggestionId
					const parentComment = await db.query.comments.findFirst({
						where: (comments, { eq }) => eq(comments.id, commentId),
					});

					if (parentComment) {
						const randomUserId =
							userIds[Math.floor(Math.random() * userIds.length)];

						await db.insert(schema.comments).values({
							id: replyId,
							suggestionId: parentComment.suggestionId,
							userId: randomUserId,
							body: `This is a reply to comment ${commentId.substring(0, 6)}. It might agree with, question, or add information to the parent comment.`,
							timestamp: new Date(
								Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000,
							),
							isRootComment: false,
							parentCommentId: commentId,
							selectionStart: null,
							selectionEnd: null,
							displayName: `User ${userIds.indexOf(randomUserId) + 1}`,
						});

						// Add reactions to some replies (30% chance)
						if (Math.random() > 0.7) {
							const reactionCount = Math.floor(Math.random() * 2) + 1;
							const emojis = [
								"👍",
								"👎",
								"❤️",
								"🎉",
								"😄",
								"😕",
								"🚀",
								"👀",
								"🔥",
								"💯",
							];

							for (let j = 0; j < reactionCount; j++) {
								await db.insert(schema.reactions).values({
									id: randomUUID(),
									commentId: replyId,
									suggestionId: null,
									userId: userIds[Math.floor(Math.random() * userIds.length)],
									emoji: emojis[Math.floor(Math.random() * emojis.length)],
									timestamp: new Date(),
								});
							}
						}
					}
				}
			}
		}

		// Create some sessions
		console.log("Creating sessions...");
		for (let i = 0; i < 5; i++) {
			const startedAt = new Date(
				Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
			); // Random date in the last 90 days
			const endedAt = new Date(startedAt);
			// Session lasts between 1 and 24 hours
			endedAt.setHours(
				startedAt.getHours() + Math.floor(Math.random() * 24) + 1,
			);

			// Include 1-5 random users in each session
			const sessionUserCount = Math.floor(Math.random() * 5) + 1;
			const sessionUserIds: string[] = [];
			for (let j = 0; j < sessionUserCount; j++) {
				sessionUserIds.push(
					userIds[Math.floor(Math.random() * userIds.length)],
				);
			}

			// Get a random user to be the session starter
			const startedBy = userIds[Math.floor(Math.random() * userIds.length)];

			await db.insert(schema.sessions).values({
				id: randomUUID(),
				startedAt,
				startedBy,
				endedAt,
				users: sessionUserIds,
				updatedAt: new Date(),
			});
		}

		console.log("Database seeded successfully!");
	} catch (error) {
		console.error("Error setting up database:", error);
		console.error(error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

main();
