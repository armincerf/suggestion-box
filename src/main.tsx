/* @refresh reload */
import { type MountableElement, render } from "solid-js/web";
import { createSignal, onMount, Show } from "solid-js";
import App from "./App";
import "./index.css"; // Keep main app styles
import { schema } from "../shared/zero/schema";
import { createZero } from "@rocicorp/zero/solid";
import { ZeroProvider, type TZero } from "./zero/ZeroContext";
import { createLogger } from "./hyperdx-logger";
import { UserSelection } from "./components/UserSelection";
import { AppLoading } from "./components/AppLoading";
import "solid-devtools";

// Extend window type for our global functions (optional but good practice)
declare global {
	interface Window {
		appReady: () => void;
		appError: (message?: string) => void;
	}
}

// Root element is now managed by our SolidJS code
const root = document.getElementById("root");
if (!root) {
	console.error("Fatal: Root element not found");
	throw new Error("Root element not found");
}

// Types for our application state
type AppState =
	| { status: "loading" }
	| { status: "selecting_user" }
	| { status: "initializing"; userId: string; jwt: string; color: string }
	| { status: "ready"; zero: TZero }
	| { status: "error"; message: string };

function MainApp() {
	const [appState, setAppState] = createSignal<AppState>({ status: "loading" });
	const logger = createLogger("suggestion-box:main");

	onMount(async () => {
		console.log("MainApp mounted. Checking authentication...");

		try {
			// Check if user is already authenticated
			const encodedJWT = localStorage.getItem("jwt");
			const userId = localStorage.getItem("userId");
			const color = localStorage.getItem("color");

			if (encodedJWT && userId && color) {
				// User already authenticated, initialize app
				console.log(`Credentials found for userId: ${userId}`);
				setAppState({ status: "initializing", userId, jwt: encodedJWT, color });
				await initializeApp(userId, encodedJWT, color);
			} else {
				// No credentials found, show user selection
				console.log("No credentials found, showing user selection");
				setAppState({ status: "selecting_user" });
			}
		} catch (error) {
			handleError(error);
		}
	});

	// Function to handle user selection from the UserSelection component
	const handleUserSelected = async (
		userId: string,
		color: string,
		jwt: string,
	) => {
		try {
			console.log(`User selected: ${userId}`);
			setAppState({ status: "initializing", userId, jwt, color });
			await initializeApp(userId, jwt, color);
		} catch (error) {
			handleError(error);
		}
	};

	// Initialize the app with the selected user
	const initializeApp = async (userId: string, jwt: string, color: string) => {
		try {
			console.log("Initializing Zero...");

			// Initialize Zero client
			const z = createZero({
				userID: userId,
				auth: () => jwt,
				server: import.meta.env.VITE_PUBLIC_SERVER,
				schema,
				kvStore: "idb", // Use IndexedDB for persistence
			});

			// Start preloading data
			console.log("Starting data preload...");
			z.query.users.preload();
			z.query.sessions.preload();
			z.query.suggestions.preload();
			z.query.comments.preload();
			z.query.reactions.preload();
			z.query.categories.preload();

			// Check/Create user record
			console.log("Checking/Creating user record...");
			// @ts-expect-error - not sure why this is erroring
			await z.mutate.users.upsert({
				id: userId,
				displayName: userId,
				color: color,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});

			// Set up logging
			logger.setUserInfo({ userId, userName: userId });
			localStorage.setItem("username", userId);

			// App is ready
			console.log("App initialization complete");
			setAppState({ status: "ready", zero: z as TZero });

			// Signal app is ready to the HTML loader
			window.appReady?.();
			localStorage.removeItem("errorState");
		} catch (error) {
			handleError(error);
		}
	};

	// Handle errors consistently
	const handleError = (error: unknown) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("App initialization failed:", error);
		logger.error("Failed to initialize app:", error);

		setAppState({ status: "error", message: errorMessage });
		window.appError?.(`Initialization failed: ${errorMessage}`);

		// Cleanup on fatal errors
		if (!localStorage.getItem("errorState")) {
			localStorage.removeItem("userId");
			localStorage.removeItem("jwt");
			localStorage.removeItem("color");

			// Reload after a short delay to try again
			setTimeout(() => window.location.reload(), 500);
		}

		localStorage.setItem("errorState", "true");
	};

	// Render based on application state
	return (
		<Show
			when={appState().status === "ready"}
			fallback={
				<>
					<Show when={appState().status === "selecting_user"}>
						<UserSelection onUserSelected={handleUserSelected} />
					</Show>

					<Show
						when={
							appState().status === "loading" ||
							appState().status === "initializing"
						}
					>
						<AppLoading />
					</Show>

					<Show when={appState().status === "error"}>
						<div class="fixed inset-0 bg-[var(--bg-color)] flex items-center justify-center z-50">
							<div class="p-6 max-w-md bg-[var(--card-bg-color)] rounded-lg shadow-lg text-center">
								<h2 class="text-xl font-bold mb-4">Error</h2>
								<p class="text-[var(--error-color)] mb-4">
									{(appState() as { message: string }).message}
								</p>
								<button
									type="button"
									class="px-4 py-2 bg-[var(--primary-color)] text-white rounded-md"
									onClick={() => window.location.reload()}
								>
									Retry
								</button>
							</div>
						</div>
					</Show>
				</>
			}
		>
			<ZeroProvider zero={(appState() as { zero: TZero }).zero}>
				<App />
			</ZeroProvider>
		</Show>
	);
}

render(() => <MainApp />, root as MountableElement);