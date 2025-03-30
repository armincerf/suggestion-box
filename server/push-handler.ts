// server/push-handler.ts
import { PushProcessor, connectionProvider } from "@rocicorp/zero/pg";
import { schema } from "../shared/zero/schema";
import type { PostCommitTask } from "./server-mutators";
import type { AuthData } from "../shared/zero/auth";
import { sql } from "./db"; // Import the initialized postgres client
import { jwtVerify, importSPKI } from "jose"; // For JWT VERIFICATION
import { createMutators } from "../shared/zero/mutators";

const HARDCODED_JWT_SECRET = "zero";

// --- JWT Verification Setup ---
async function getJwtVerificationKey() {
	if (HARDCODED_JWT_SECRET) {
		console.log(
			"Using HARDCODED_JWT_SECRET for verification (symmetric HS256)",
		);
		return new TextEncoder().encode(HARDCODED_JWT_SECRET);
	}

	if (process.env.JWT_PUBLIC_KEY) {
		console.log("Using JWT_PUBLIC_KEY for verification (asymmetric)");
		try {
			const pemKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n").trim();
			return await importSPKI(pemKey, "ES256");
		} catch (e) {
			console.error("Error importing JWT_PUBLIC_KEY (SPKI/PEM):", e);
			throw new Error("Invalid JWT_PUBLIC_KEY format or algorithm mismatch.");
		}
	}

	console.warn(
		"Neither HARDCODED_JWT_SECRET nor JWT_PUBLIC_KEY found. Verification will fail.",
	);
	return null;
}

const jwtVerificationKeyPromise = getJwtVerificationKey();
// --- End JWT Verification Setup ---

// Instantiate the PushProcessor
// Needs the schema and a configured database connection provider
console.log("Initializing Zero PushProcessor...");

const processor = new PushProcessor(schema, connectionProvider(sql));
console.log("Zero PushProcessor initialized.");

// Main function to handle requests to the /api/push endpoint
export async function handleZeroPush(request: Request): Promise<Response> {
	console.log(`Handling request to ${request.url}`);

	if (request.method !== "POST") {
		console.log("Method not allowed:", request.method);
		return new Response("Method Not Allowed", { status: 405 });
	}

	let authData: AuthData | undefined;
	const postCommitTasks: PostCommitTask[] = []; // For Typesense later
	const verificationKey = await jwtVerificationKeyPromise; // Get the imported key

	try {
		// --- Verify Auth Token ---
		const authHeader = request.headers.get("Authorization");
		if (authHeader?.toLowerCase().startsWith("bearer ")) {
			const token = authHeader.substring(7);
			console.log("Authorization header found, attempting JWT verification...");

			if (!verificationKey) {
				console.error("JWT verification key is not configured on the server.");
				console.warn("Proceeding without JWT verification (key missing).");
			} else {
				try {
					const { payload } = await jwtVerify(token, verificationKey, {
						algorithms: ["HS256"],
					});
					console.log("JWT verified successfully. Payload:", payload);

					if (payload && typeof payload.sub === "string") {
						authData = payload as AuthData;
					} else {
						console.warn("JWT payload invalid structure after verification.");
					}
				} catch (err: unknown) {
					console.warn(
						`JWT verification failed: ${err instanceof Error ? err.message : String(err)}. Treating as unauthenticated.`,
					);
				}
			}
		} else {
			console.log(
				"No Authorization header found. Treating as unauthenticated.",
			);
		}
		// --- End Auth Token Verification ---

		// Extract query params and body
		const url = new URL(request.url);
		const queryParams = url.searchParams; // Zero expects URLSearchParams
		const body = await request.json(); // Assumes JSON body

		console.log(`Processing push for user: ${authData?.sub ?? "anonymous"}`, {
			queryParams,
			body,
		});

		const responsePayload = await processor.process(
			createMutators(authData),
			queryParams,
			body,
		);

		console.log("Zero push processed successfully.");

		// --- Execute Post-Commit Tasks ---
		// This loop will be important for Step 4 (Typesense)
		if (postCommitTasks.length > 0) {
			console.log(`Executing ${postCommitTasks.length} post-commit tasks...`);
			// Run tasks concurrently but wait for all, log errors individually
			await Promise.allSettled(
				postCommitTasks.map((task) =>
					task().catch((e) => console.error("Post-commit task failed:", e)),
				),
			);
			console.log("Post-commit tasks finished.");
		}
		// --- End Post-Commit Tasks ---

		// Return the response from the processor
		return new Response(JSON.stringify(responsePayload), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				// Add CORS headers if needed
				"Access-Control-Allow-Origin": "*", // Be more specific in production!
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Authorization, Content-Type",
			},
		});
	} catch (error: unknown) {
		console.error("Error processing push request:", error);
		// Return a generic server error response
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
					// Add CORS headers if needed
					"Access-Control-Allow-Origin": "*", // Be more specific in production!
				},
			},
		);
	}
}
