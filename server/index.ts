// server/index.ts
import { handleZeroPush } from "./push-handler";

const port = Number.parseInt(process.env.PORT || process.env.BUN_PORT || "3001", 10);

console.log(`Starting Bun server on port ${port}...`);

const server = Bun.serve({
	port: port,
	hostname: "0.0.0.0", // Listen on all interfaces

	// Define routes
	async fetch(req) {
		const url = new URL(req.url);

		// --- CORS Preflight ---
		// Basic OPTIONS handler for CORS
		if (req.method === "OPTIONS") {
			console.log(`Handling OPTIONS request for ${url.pathname}`);
			return new Response(null, {
				status: 204, // No Content
				headers: {
					"Access-Control-Allow-Origin": "*", // Be more specific in production!
					"Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allow POST for push, GET for health
					"Access-Control-Allow-Headers": "Authorization, Content-Type", // Headers client sends
					"Access-Control-Max-Age": "86400", // Cache preflight for 1 day
				},
			});
		}

		// --- Zero Push Endpoint ---
		if (url.pathname === "/api/push" && req.method === "POST") {
			return handleZeroPush(req); // Delegate to the push handler
		}

		// --- Health Check ---
		if (url.pathname === "/health" || url.pathname === "/") {
			console.log("Handling /health request");
			return new Response("OK", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
					"Access-Control-Allow-Origin": "*", // Also allow CORS for health check if needed
				},
			});
		}

		// --- Not Found ---
		console.log(`404 Not Found: ${req.method} ${url.pathname}`);
		return new Response("Not Found", {
			status: 404,
			headers: {
				"Content-Type": "text/plain",
				"Access-Control-Allow-Origin": "*",
			},
		});
	},

	// Global error handler
	error(error: Error) {
		console.error("Unhandled server error:", error);
		return new Response("Internal Server Error", {
			status: 500,
			headers: {
				"Content-Type": "text/plain",
				"Access-Control-Allow-Origin": "*",
			},
		});
	},
});

console.log(
	` Bun server listening at http://${server.hostname}:${server.port}`,
);

// Optional: Handle graceful shutdown
process.on("SIGINT", () => {
	console.log("\nReceived SIGINT, stopping server...");
	server.stop(true); // Force stop immediately
	process.exit(0);
});
process.on("SIGTERM", () => {
	console.log("Received SIGTERM, stopping server...");
	server.stop(true);
	process.exit(0);
});
