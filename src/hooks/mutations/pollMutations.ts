import { type TZero, useZero } from "../../zero/ZeroContext";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../../hyperdx-logger";
// No need to import Poll, PollQuestion, PollOption here as they aren't directly used
// in function signatures beyond what's inferred by z.mutate types.

const logger = createLogger("suggestion-box:pollMutations");

// Type for the poll creation data structure from the form
export interface CreatePollInput {
	title: string;
	questions: {
		text: string;
		options: { text: string }[];
	}[];
}

/**
 * Creates a new poll, its questions, and options in a single logical transaction.
 * Note: While these are separate mutations, they should ideally execute quickly
 * enough to appear atomic to the user. True multi-table transactions aren't
 * directly supported by Zero's basic mutation API.
 */
export async function createPoll(
	sessionId: string,
	userId: string,
	pollData: CreatePollInput,
	z: TZero,
) {
	try {
		const pollId = uuidv4();
		const now = new Date(); // Use Date object for timestamp consistency with Drizzle

		// 1. Create the main poll record
		await z.mutate.polls.insert({
			id: pollId,
			sessionId,
			createdByUserId: userId,
			title: pollData.title,
			createdAt: now.getTime(), // Store as number
			endedAt: null, // Poll starts active
		});

		// 2. Create questions and options sequentially
		// We use Promise.all to run insertions for options within a question concurrently,
		// but wait for each question and its options before moving to the next question.
		for (const [qIndex, questionData] of pollData.questions.entries()) {
			const questionId = uuidv4();
			await z.mutate.pollQuestions.insert({
				id: questionId,
				pollId: pollId,
				text: questionData.text,
				order: qIndex,
			});

			// Create options for the current question
			const optionPromises = questionData.options.map((optionData, oIndex) => {
				const optionId = uuidv4();
				return z.mutate.pollOptions.insert({
					id: optionId,
					questionId: questionId,
					text: optionData.text,
					order: oIndex,
				});
			});
			await Promise.all(optionPromises); // Wait for all options of this question to be inserted
		}

		logger.info("Poll created successfully", { pollId, sessionId, userId });
		return { success: true, data: pollId };
	} catch (error) {
		logger.error("Failed to create poll", {
			error,
			sessionId,
			userId,
			pollDataTitle: pollData.title, // Log minimal data
		});
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Submits a user's vote for a specific option in a poll.
 * Current implementation allows multiple votes per user per option (multi-select).
 * To enforce single-choice per question, deletion of prior votes would be needed here.
 */
export async function submitVote(
	pollId: string,
	questionId: string,
	optionId: string,
	userId: string,
	z: TZero,
) {
	try {
		const voteId = uuidv4(); // Simple ID for the vote record
		const now = new Date();

		// TODO: Add logic here if single-choice voting per question is required:
		// 1. Query z.query.pollVotes.where('userId', '=', userId).andWhere('questionId', '=', questionId).select('id')
		// 2. If existing votes found, map their IDs and call z.mutate.pollVotes.delete(ids)
		// 3. Proceed with the insert below.

		await z.mutate.pollVotes.insert({
			id: voteId,
			pollId,
			questionId,
			optionId,
			userId,
			createdAt: now.getTime(),
		});

		logger.info("Vote submitted successfully", {
			voteId,
			pollId,
			optionId,
			userId,
		});
		return { success: true, data: voteId };
	} catch (error) {
		logger.error("Failed to submit vote", { error, pollId, optionId, userId });
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Ends a poll by setting its endedAt timestamp.
 * Relies on Zero permissions to ensure only the creator can call this successfully.
 */
export async function endPoll(
	pollId: string,
	userId: string, // userId passed for logging/context, permission check is server-side
	z: TZero,
) {
	try {
		await z.mutate.polls.update({
			id: pollId,
			endedAt: new Date().getTime(),
		});

		logger.info("Poll ended successfully", { pollId, endedBy: userId });
		return { success: true, data: true };
	} catch (error) {
		// Log the user who attempted the action, even if permissions fail server-side
		logger.error("Failed to end poll", { error, pollId, attemptedBy: userId });
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Records that a user has acknowledged seeing the results of a poll.
 * This helps track which users have seen completed poll results.
 */
export async function acknowledgePollResults(
	pollId: string,
	userId: string,
	sessionId: string,
	z: TZero,
) {
	try {
		const ackId = uuidv4();
		const now = new Date();

		await z.mutate.pollAcknowledgements.insert({
			id: ackId,
			pollId,
			userId,
			sessionId,
			acknowledgedAt: now.getTime(),
		});

		logger.info("Poll results acknowledged", {
			ackId,
			pollId,
			userId,
			sessionId,
		});
		return { success: true, data: ackId };
	} catch (error) {
		logger.error("Failed to acknowledge poll results", {
			error,
			pollId,
			userId,
			sessionId,
		});
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

// --- Hooks for easy usage in React components ---

/**
 * Hook to get a function for creating a new poll.
 * @returns Function `(sessionId: string, userId: string, pollData: CreatePollInput) => Promise<MutationResult<string>>`
 */
export function useCreatePoll() {
	const z = useZero();
	return (sessionId: string, userId: string, pollData: CreatePollInput) =>
		createPoll(sessionId, userId, pollData, z);
}

/**
 * Hook to get a function for submitting a vote.
 * @returns Function `(pollId: string, questionId: string, optionId: string, userId: string) => Promise<MutationResult<string>>`
 */
export function useSubmitVote() {
	const z = useZero();
	return (
		pollId: string,
		questionId: string,
		optionId: string,
		userId: string,
	) => submitVote(pollId, questionId, optionId, userId, z);
}

/**
 * Hook to get a function for ending a poll.
 * @returns Function `(pollId: string, userId: string) => Promise<MutationResult<boolean>>`
 */
export function useEndPoll() {
	const z = useZero();
	return (pollId: string, userId: string) => endPoll(pollId, userId, z);
}

/**
 * Hook to get a function for acknowledging poll results.
 * @returns Function `(pollId: string, userId: string, sessionId: string) => Promise<MutationResult<string>>`
 */
export function useAcknowledgePollResults() {
	const z = useZero();
	return (pollId: string, userId: string, sessionId: string) =>
		acknowledgePollResults(pollId, userId, sessionId, z);
}
