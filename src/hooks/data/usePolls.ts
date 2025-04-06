import { useQuery } from "@rocicorp/zero/solid";
import { type TZero, useZero } from "../../zero/ZeroContext";
import { createMemo, type Accessor, createEffect } from "solid-js";
import {
	QUERY_TTL_SHORT,
	QUERY_TTL_FOREVER,
	DUMMY_QUERY_ID,
} from "../../utils/constants";
import type { Poll, PollVote } from "../../../shared/zero/schema";
import { createLogger } from "../../hyperdx-logger";

const logger = createLogger("suggestion-box:usePolls");

/**
 * Query for the currently active poll in a session.
 * Finds the most recent poll for the session that hasn't ended.
 */
export const activePollQuery = (z: TZero, sessionId: string | undefined) => {
	if (!sessionId) {
		// Return a query that yields nothing if no sessionId
		return z.query.polls.where("id", "=", DUMMY_QUERY_ID).one(); // Ensure it matches the .one() expectation
	}
	return z.query.polls
		.where("sessionId", "=", sessionId)
		.where("endedAt", "IS", null) // Poll is active if endedAt is null
		.orderBy("createdAt", "desc") // Get the most recent one if multiple somehow exist
		.limit(1)
		.related("questions", (q) =>
			q
				.orderBy("order", "asc")
				.related("options", (o) => o.orderBy("order", "asc")),
		) // Get questions and their options, ordered
		.related("creator") // Get user who created the poll
		.one(); // Expect only one active poll at most
};

/**
 * Hook to get the currently active poll for a session.
 * Returns a SolidJS resource: `[Accessor<Poll | null | undefined>, { refetch: () => void }]`
 */
export function useActivePoll(sessionId: Accessor<string | undefined>) {
	const z = useZero();
	// Pass the query *function* to useQuery, it will be re-run when sessionId() changes.
	return useQuery(() => activePollQuery(z, sessionId()), {
		ttl: QUERY_TTL_SHORT,
	});
}

/**
 * Query for all ended polls within a session, ordered by most recently ended.
 * Includes related questions, options, and creator for comprehensive display.
 */
export const endedSessionPollsQuery = (
	z: TZero,
	sessionId: string | undefined,
) => {
	if (!sessionId) return z.query.polls.where("id", "=", DUMMY_QUERY_ID);
	return z.query.polls
		.where("sessionId", "=", sessionId)
		.where("endedAt", "IS NOT", null)
		.orderBy("endedAt", "desc")
		.related("questions", (q) =>
			q
				.orderBy("order", "asc")
				.related("options", (o) => o.orderBy("order", "asc")),
		)
		.related("creator");
};

/**
 * Hook to get all ended polls for a specific session.
 * Returns a SolidJS resource: `[Accessor<Poll[] | undefined>, { refetch: () => void }]`
 */
export function useEndedSessionPolls(sessionId: Accessor<string | undefined>) {
	const z = useZero();
	return useQuery(() => endedSessionPollsQuery(z, sessionId()), {
		ttl: QUERY_TTL_FOREVER,
	});
}

/**
 * Query for a user's poll acknowledgements within a specific session.
 * Used to track which polls a user has seen results for.
 */
export const sessionUserPollAcknowledgementsQuery = (
	z: TZero,
	userId: string | undefined,
	sessionId: string | undefined,
) => {
	if (!userId || !sessionId) {
		return z.query.pollAcknowledgements.where("id", "=", DUMMY_QUERY_ID);
	}
	// Query by both userId and sessionId
	return z.query.pollAcknowledgements
		.where("userId", "=", userId)
		.where("sessionId", "=", sessionId)
		.related("poll");
};

/**
 * Hook to get a user's poll acknowledgements within a session.
 * Returns a SolidJS resource: `[Accessor<PollAcknowledgement[] | undefined>, { refetch: () => void }]`
 */
export function useMySessionPollAcknowledgements(
	userId: Accessor<string | undefined>,
	sessionId: Accessor<string | undefined>,
) {
	const z = useZero();
	return useQuery(
		() => sessionUserPollAcknowledgementsQuery(z, userId(), sessionId()),
		{ ttl: QUERY_TTL_SHORT },
	);
}

/**
 * Query for all votes within a specific session's polls.
 * Note: This is a placeholder that would ideally fetch votes for all polls in a session.
 * In practice, we recommend fetching votes per poll as needed for better performance.
 */
export const sessionPollVotesQuery = (
	z: TZero,
	sessionId: string | undefined,
) => {
	if (!sessionId) {
		return z.query.pollVotes.where("id", "=", DUMMY_QUERY_ID);
	}
	// Since direct filter by poll.sessionId isn't possible in a simple query,
	// in practice you would:
	// 1. First fetch poll IDs for the session
	// 2. Then fetch votes for those polls
	// Or filter client-side using the poll relation

	// For now, we'll need to handle this logic at the component level
	// using multiple usePollVotes hooks for each relevant poll
	return z.query.pollVotes.where("id", "=", DUMMY_QUERY_ID); // Placeholder
};

/**
 * Query for votes related to a specific poll.
 * Useful for calculating results after a poll has ended.
 */
export const pollVotesQuery = (z: TZero, pollId: string | undefined) => {
	if (!pollId) {
		// Return a query that yields an empty array if no pollId
		return z.query.pollVotes.where("id", "=", DUMMY_QUERY_ID);
	}
	return z.query.pollVotes
		.where("pollId", "=", pollId)
		.related("user") // Include user info for votes if needed later
		.related("option"); // Include option info to display results
	// No .all() needed here, useQuery handles executing the query definition
};

/**
 * Hook to get all votes for a specific poll.
 * Returns a SolidJS resource: `[Accessor<PollVote[] | undefined>, { refetch: () => void }]`
 */
export function usePollVotes(pollId: Accessor<string | undefined>) {
	const z = useZero();
	// Pass the query function to useQuery
	return useQuery(() => pollVotesQuery(z, pollId()), { ttl: QUERY_TTL_SHORT });
}

/**
 * Hook to calculate simple poll results (option ID -> count) from vote data.
 * Returns a memoized Map or null.
 */
export function usePollResults(pollId: Accessor<string | undefined>) {
	const [votesData] = usePollVotes(pollId);

	const results = createMemo(() => {
		const votes = votesData();
		if (votes === undefined || votes === null || votes.length === 0) {
			return null;
		}

		const resultsMap = new Map<
			string,
			{ text: string; count: number; questionId: string }
		>();

		// Explicitly type 'vote' here based on the expected schema type with relations
		for (const vote of votes as PollVote[]) {
			if (!vote?.optionId || !vote?.questionId) continue;

			const optionId = vote.optionId;
			// Now access vote.option should be recognized by the type assertion
			const optionText = vote.option?.text ?? "Unknown Option";
			const questionId = vote.questionId;

			const currentResult = resultsMap.get(optionId);
			if (currentResult) {
				currentResult.count++;
			} else {
				// Add new entry if option hasn't been voted for yet
				resultsMap.set(optionId, { text: optionText, count: 1, questionId });
			}
		}
		return resultsMap;
	});

	return results; // Returns the Accessor created by createMemo
}

// Helper type for structured results, mapping question IDs to their text and option results.
export interface PollResultsData {
	[questionId: string]: {
		questionText: string;
		options: {
			[optionId: string]: {
				optionText: string;
				count: number;
			};
		};
		// Optional: Add total votes for this question if needed
		// totalVotes?: number;
	};
}

/**
 * Hook to structure poll results by question, using the full Poll object.
 * Returns a memoized PollResultsData object or null.
 */
export function useStructuredPollResults(
	poll: Accessor<Poll | null | undefined>,
) {
	// Derive pollId reactively from the poll accessor
	const pollId = createMemo(() => poll()?.id);
	const [votesData] = usePollVotes(pollId); // Fetch votes based on the derived pollId

	const structuredResults = createMemo<PollResultsData | null>(() => {
		const currentPoll = poll(); // Get the current value of the poll
		const votes = votesData(); // Get the current value of the votes

		// Need the poll structure (questions/options) and votes to build results
		if (
			!currentPoll ||
			!currentPoll.questions ||
			currentPoll.questions.length === 0 ||
			votes === undefined || // Check for undefined (loading/error state from useQuery)
			votes === null
		) {
			return null; // Not ready or no data
		}

		const results: PollResultsData = {};

		// Initialize results structure based on the poll's questions and options
		for (const question of currentPoll.questions) {
			// Ensure question has an id and text
			if (!question?.id || !question?.text) continue;

			results[question.id] = {
				questionText: question.text,
				options: {},
				// totalVotes: 0, // Initialize if calculating total per question
			};

			// Ensure options exist and iterate safely
			if (question.options) {
				for (const option of question.options) {
					if (!option?.id || !option?.text) continue; // Safety check for option data
					results[question.id].options[option.id] = {
						optionText: option.text,
						count: 0, // Start count at 0
					};
				}
			}
		}

		// Tally votes into the structured results
		for (const vote of votes) {
			// Ensure vote has necessary IDs and exists in our initialized structure
			if (
				!vote?.questionId ||
				!vote?.optionId ||
				!results[vote.questionId]?.options[vote.optionId]
			) {
				continue; // Skip votes that don't match the structure (e.g., old votes for deleted options)
			}
			results[vote.questionId].options[vote.optionId].count++;
			// if (results[vote.questionId].totalVotes !== undefined) {
			//     results[vote.questionId].totalVotes!++;
			// }
		}

		return results;
	});

	return structuredResults; // Returns the Accessor created by createMemo
}

/**
 * Query to get a single poll by ID with all related data.
 */
export const pollByIdQuery = (z: TZero, pollId: string | undefined) => {
	if (!pollId) {
		// Return a query that yields nothing
		return z.query.polls.where("id", "=", DUMMY_QUERY_ID).one();
	}

	logger.debug("pollByIdQuery called", { pollId });

	return z.query.polls
		.where("id", "=", pollId)
		.related("questions", (q) =>
			q
				.orderBy("order", "asc")
				.related("options", (o) => o.orderBy("order", "asc")),
		)
		.related("creator")
		.one();
};

/**
 * Hook to get a poll by ID with all related data.
 * Returns a SolidJS resource: `[Accessor<Poll | null | undefined>, { refetch: () => void }]`
 */
export function usePollById(pollId: Accessor<string | undefined>) {
	const z = useZero();
	const result = useQuery(() => pollByIdQuery(z, pollId()), {
		ttl: QUERY_TTL_SHORT,
	});

	// Debug logging to understand what's happening
	createEffect(() => {
		const poll = result[0]();
		logger.debug("usePollById result", {
			pollIdParam: pollId(),
			hasPoll: !!poll,
			resultPollId: poll?.id,
		});
	});

	return result;
}
