/* @refresh reload */
import { type MountableElement, render } from "solid-js/web";
import { onMount } from "solid-js";
import App from "./App";
import "./index.css"; // Keep main app styles
import { schema } from "./zero/schema";
import { createZero } from "@rocicorp/zero/solid";
// Removed LoadingSpinner import from here
import { ZeroProvider, type TZero } from "./zero/ZeroContext";
import { createLogger } from "./hyperdx-logger";
const logger = createLogger("suggestion-box:main");

// Extend window type for our global functions (optional but good practice)
declare global {
	interface Window {
		appReady: () => void;
		appError: (message?: string) => void;
	}
}

const root = document.getElementById("root");
if (!root) {
	// Error handling here is tricky as the app hasn't loaded yet.
	// The index.html loader should ideally handle this case.
	console.error("Fatal: Root element not found");
	window.appError?.("Application structure missing."); // Attempt to use global error handler
	throw new Error("Root element not found");
}

function AppLoader() {
	// No internal isLoading or zeroInstance state needed for rendering control here
	// We rely on index.html's loader until the app is fully ready.

	onMount(async () => {
		console.log("AppLoader mounted. Initializing Zero...");
		let zeroInstance: TZero | null = null; // Keep local ref for setup

		try {
			// --- 1. Get Credentials ---
			const encodedJWT = localStorage.getItem("jwt");
			const userId = localStorage.getItem("userId");
			const color = localStorage.getItem("color"); // Get color

			if (!encodedJWT || !userId || !color) {
				// This should ideally not happen if index.html logic is correct
				console.error("Missing auth details in localStorage.");
				throw new Error(
					"Authentication details missing. Please select a user again.",
				);
			}
			console.log(`Credentials loaded for userId: ${userId}`);

			// --- 2. Initialize Zero ---
			const z = createZero({
				userID: userId,
				auth: () => encodedJWT, // Use the retrieved JWT
				server: import.meta.env.VITE_PUBLIC_SERVER,
				schema,
				kvStore: "idb", // Use IndexedDB for persistence
			});
			zeroInstance = z; // Assign to local ref
			console.log("Zero client initialized.");

			// --- 3. Start Preloading Data Immediately ---
			console.log("Starting data preload...");
			z.query.users.preload();
			z.query.sessions.preload();
			z.query.suggestions.preload();
			z.query.comments.preload();
			z.query.reactions.preload();
			z.query.categories.preload();
			console.log("Preload commands issued.");

			// --- 4. Check/Create User Record ---
			console.log("Checking/Creating user record...");
			const avatarUrl = `https://api.dicebear.com/6.x/bottts/svg?seed=${userId}`; // Consistent avatar

			let finalUserName = userId; // Default to userId
			let finalAvatarUrl = avatarUrl;

			await z.mutate.users.upsert({
				id: userId,
				displayName: userId, // Use userId as initial display name
				avatarUrl: avatarUrl,
				color: color, // Use the color from localStorage
				createdAt: Date.now(), // won't apply on update thanks to timestampProtection.ts
				updatedAt: Date.now(),
			});
			finalUserName = userId; // Keep userId as name for new user
			finalAvatarUrl = avatarUrl;

			// --- 5. Configure Logging & Store User Info ---
			logger.setUserInfo({ userId: userId, userName: finalUserName });
			localStorage.setItem("username", finalUserName); // Store potentially updated name
			localStorage.setItem("useravatar", finalAvatarUrl); // Store final avatar URL

			console.log("User check/creation complete.");

			// --- 6. Render the App ---
			// Now that Zero is ready and user exists, render the actual app.
			// The ZeroProvider needs the *initialized* zeroInstance.
			render(
				() => (
					<ZeroProvider zero={zeroInstance as NonNullable<TZero>}>
						<App />
					</ZeroProvider>
				),
				root as MountableElement, // Render directly into the root element
			);
			console.log("SolidJS app rendered.");

			// --- 7. Signal App is Ready ---
			// Call the global function defined in index.html to hide the loader
			window.appReady?.();
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error("Failed to initialize app:", error);
			console.error("App initialization failed:", error);

			// --- 8. Signal App Error ---
			// Use the global error handler
			window.appError?.(`Initialization failed: ${errorMessage}`);

			// Optional: Clean up localStorage if init fails badly?
			// localStorage.removeItem("userId");
			// localStorage.removeItem("jwt");
			// localStorage.removeItem("color");
		}
	});

	// Return null or an empty fragment because rendering is handled inside onMount->render()
	// or controlled by index.html's loader.
	return null;
}

// Render the AppLoader component initially. It won't render UI itself,
// but its onMount hook will drive the initialization process.
render(() => <AppLoader />, root);
console.log("Initial AppLoader render triggered.");
