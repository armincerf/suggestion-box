/* @refresh reload */
import { type MountableElement, render } from "solid-js/web";
import { onCleanup, onMount } from "solid-js";
import { createZero } from "@rocicorp/zero/solid";
import App from "./App";
import "./index.css";
import { ZeroProvider, type TZero } from "./zero/ZeroContext";
import { createLogger } from "./hyperdx-logger";
import { decodeJwt } from "jose";

import { schema, type Schema } from "../shared/zero/schema";
import { createMutators, type Mutators } from "../shared/zero/mutators";
import { type AuthData, assertIsLoggedIn } from "../shared/zero/auth";

const logger = createLogger("suggestion-box:main");

declare global {
	interface Window {
		appReady: () => void;
		appError: (message?: string) => void;
	}
}

const root = document.getElementById("root");
if (!root) {
	console.error("Fatal: Root element not found");
	window.appError?.("Application structure missing.");
	throw new Error("Root element not found");
}

function AppLoader() {
	onMount(async () => {
		console.log("AppLoader mounted. Initializing Zero...");
		let zeroInstance: TZero | null = null;
		let localAuthData: AuthData | undefined;

		try {
			// --- 1. Get Credentials & AuthData ---
			const encodedJWT = localStorage.getItem("jwt");
			const storedUserId = localStorage.getItem("userId");
			const initialColor = localStorage.getItem("color");

			if (!encodedJWT || !initialColor) {
				console.error("Missing auth token or color in localStorage.");
				localStorage.removeItem("jwt");
				localStorage.removeItem("userId");
				localStorage.removeItem("color");
				window.location.reload();
				throw new Error("Authentication details missing.");
			}

			try {
				const decodedPayload = decodeJwt(encodedJWT);

				if (!decodedPayload || typeof decodedPayload.sub !== "string") {
					throw new Error("Invalid JWT payload structure (missing sub).");
				}
				if (decodedPayload.exp && Date.now() / 1000 >= decodedPayload.exp) {
					throw new Error("JWT has expired.");
				}

				localAuthData = decodedPayload as AuthData;

				if (storedUserId && localAuthData.sub !== storedUserId) {
					console.warn(
						`localStorage userId ('${storedUserId}') differs from JWT sub ('${localAuthData.sub}'). Using JWT sub.`,
					);
					localStorage.setItem("userId", localAuthData.sub);
				} else if (!storedUserId) {
					localStorage.setItem("userId", localAuthData.sub);
				}

				console.log(
					`Credentials loaded for userId (from JWT): ${localAuthData.sub}`,
				);
			} catch (jwtError: unknown) {
				if (jwtError instanceof Error) {
					console.error("Failed to decode or validate JWT:", jwtError.message);
					window.appError?.(
						`Session error: ${jwtError.message}. Please log in again.`,
					);
				} else {
					console.error("Failed to decode or validate JWT:", String(jwtError));
				}
				const message =
					jwtError instanceof Error ? jwtError.message : String(jwtError);
				localStorage.removeItem("jwt");
				localStorage.removeItem("userId");
				localStorage.removeItem("color");
				window.location.reload();
				throw new Error(`Invalid JWT: ${message}`);
			}

			assertIsLoggedIn(localAuthData);

			// --- 2. Initialize Zero with Custom Mutators ---
			console.log("Initializing Zero client...");
			const z = createZero({
				userID: localAuthData.sub,
				auth: (error?: "invalid-token") => {
					if (error === "invalid-token") {
						console.error("Zero reported invalid token. Clearing session.");
						localStorage.removeItem("jwt");
						localStorage.removeItem("userId");
						localStorage.removeItem("color");
						window.appError?.(
							"Your session expired or became invalid. Please log in again.",
						);
						window.location.reload();
						return undefined;
					}
					return localStorage.getItem("jwt") ?? undefined;
				},
				server: import.meta.env.VITE_PUBLIC_SERVER,
				schema,
				mutators: createMutators(localAuthData),
				kvStore: "idb",
				logLevel: "info",
			});
			zeroInstance = z;
			console.log("Zero client initialized.");

			// --- 3. Start Preloading Data Immediately ---
			console.log("Starting data preload...");
			if (zeroInstance) {
				zeroInstance.query.users.preload();
				zeroInstance.query.sessions.preload();
				zeroInstance.query.suggestions.preload();
				zeroInstance.query.comments.preload();
				zeroInstance.query.reactions.preload();
				zeroInstance.query.categories.preload();
				zeroInstance.query.polls.preload();
				console.log("Preload commands issued.");
			} else {
				console.error("Zero instance is null, cannot preload data.");
				throw new Error("Zero initialization failed silently.");
			}

			// --- 4. Check/Create User Record ---
			const currentUserId = localAuthData.sub;
			console.log("Ensuring user record for:", currentUserId);
			const color = initialColor || "#FFFFFF";
			const avatarUrl = `https://api.dicebear.com/6.x/bottts/svg?seed=${currentUserId}`;
			let finalUserName = localAuthData.name || currentUserId;
			let finalAvatarUrl = avatarUrl;

			try {
				if (!zeroInstance)
					throw new Error("Zero instance not available for user upsert.");
				await zeroInstance.mutate.users.customUpsert({
					id: currentUserId,
					displayName: finalUserName,
					avatarUrl: avatarUrl,
					color: color,
				});
				console.log("User record upsert successful via direct mutation.");
			} catch (upsertError: unknown) {
				const message =
					upsertError instanceof Error
						? upsertError.message
						: String(upsertError);
				console.warn(
					`Direct user upsert failed (check permissions/schema defaults for 'users' table): ${message}`,
				);
				if (!zeroInstance) {
					console.error("Zero instance not available for user lookup.");
				} else {
					const existingUser = await zeroInstance.query.users
						.where("id", currentUserId)
						.one()
						.run();
					if (existingUser) {
						finalUserName = existingUser.displayName;
						finalAvatarUrl = existingUser.avatarUrl || avatarUrl;
						console.log("Existing user record found after upsert warning.");
					} else {
						console.error(
							"User record could not be created or found. User info might be stale.",
						);
					}
				}
			}

			// --- 5. Configure Logging & Store User Info ---
			logger.setUserInfo({ userId: currentUserId, userName: finalUserName });
			localStorage.setItem("username", finalUserName);
			localStorage.setItem("useravatar", finalAvatarUrl);

			console.log("User info configuration complete.");

			// --- 6. Render the App ---
			if (zeroInstance) {
				render(
					() => (
						// @ts-expect-error do not understand this...
						<ZeroProvider zero={zeroInstance}>
							<App />
						</ZeroProvider>
					),
					root as MountableElement,
				);
				console.log("SolidJS app rendered.");
			} else {
				console.error("Zero instance is null, cannot render the application.");
				window.appError?.("Application failed to load core data connection.");
			}

			// --- 7. Signal App is Ready ---
			if (zeroInstance) {
				window.appReady?.();
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error("Failed to initialize app:", {
				error: errorMessage,
				stack: error instanceof Error ? error.stack : undefined,
			});
			console.error("App initialization failed:", error);
			window.appError?.(`Initialization failed: ${errorMessage}`);
		}
	});
	return null;
}

render(() => <AppLoader />, root);
console.log("Initial AppLoader render triggered.");
