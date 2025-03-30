/* @refresh reload */
import { render } from "solid-js/web";
import { createSignal, onMount } from "solid-js";
import App from "./App";
import "./index.css";
import { schema } from "./zero/schema";
import { createZero } from "@rocicorp/zero/solid";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ZeroProvider, type TZero } from "./zero/ZeroContext";
import { createLogger } from "./hyperdx-logger";
const logger = createLogger("suggestion-box:main");

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

function AppLoader() {
	const [isLoading, setIsLoading] = createSignal(true);
	const [zeroInstance, setZeroInstance] = createSignal<TZero | null>(null);

	onMount(async () => {
		try {
			// Get JWT and userID from localStorage (already set in index.html)
			const encodedJWT = localStorage.getItem("jwt");
			const userID = localStorage.getItem("userId");
			const color = localStorage.getItem("color") || "#3498db"; // Provide default color
			if (!encodedJWT || !userID) {
				throw new Error("JWT or UserID not found in localStorage");
			}

			const z = createZero({
				userID,
				auth: () => encodedJWT,
				server: import.meta.env.VITE_PUBLIC_SERVER,
				schema,
				kvStore: "idb",
			});

			// Preload data in the background
			z.query.users.preload();
			z.query.sessions.preload();
			z.query.suggestions.preload();
			z.query.comments.preload();
			z.query.reactions.preload();
			z.query.categories.preload();

			// Check if user exists directly (no setTimeout)
			const user = await z.query.users.where("id", userID).one().run();
			logger.info("User data lookup done", {
				userExists: !!user,
				userId: userID,
			});
			const avatarUrl = `https://api.dicebear.com/6.x/bottts/svg?seed=${userID}`;

			let finalUserName = userID;
			let finalAvatarUrl = avatarUrl;

			// If user doesn't exist in database yet, create it
			if (!user) {
				logger.info("Creating new user...", { userId: userID });

				await z.mutate.users.insert({
					id: userID,
					displayName: userID, // Use the userID as name
					avatarUrl,
					color,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});

				logger.info("Created new user", { userId: userID });
			} else {
				// Use existing user's data
				finalUserName = user.displayName || userID;
				finalAvatarUrl = user.avatarUrl || avatarUrl;
			}

			// Set user info for HyperDX
			logger.setUserInfo({
				userId: userID,
				userName: finalUserName,
			});

			localStorage.setItem("username", finalUserName);
			localStorage.setItem("useravatar", finalAvatarUrl);

			// Set Zero instance AFTER user is created/loaded
			setZeroInstance(z);
		} catch (error) {
			logger.error(
				"Failed to initialize app",
				error instanceof Error ? error : new Error(String(error)),
			);
		} finally {
			setIsLoading(false);
		}
	});

	return (
		<>
			{isLoading() || !zeroInstance() ? (
				<LoadingSpinner />
			) : (
				<ZeroProvider
					zero={zeroInstance() as NonNullable<ReturnType<typeof zeroInstance>>}
				>
					<App />
				</ZeroProvider>
			)}
		</>
	);
}

render(() => <AppLoader />, root);
