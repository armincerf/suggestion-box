/* @refresh reload */
import { render } from "solid-js/web";
import { createSignal, onMount } from "solid-js";
import App from "./App";
import "./index.css";
import { schema, type Schema as AppSchema } from "./zero-schema";
import { createZero } from "@rocicorp/zero/solid";
import type { Zero } from "@rocicorp/zero";
import { randID } from "./rand";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ZeroProvider } from "./context/ZeroContext";
import { getNameFromUserId } from "./nameGenerator";
import { cssColorNames } from "./utils/constants";
import { logger, attachToErrorBoundary } from "../hyperdx-logger";
import { ErrorBoundary } from "solid-js";

// Attach SolidJS ErrorBoundary to HyperDX
attachToErrorBoundary(ErrorBoundary);

function must<T>(val: T) {
	if (!val) {
		throw new Error("Expected value to be defined");
	}
	return val;
}

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

// Simple JWT encoding and decoding (HS256 only)
async function createJWT(
	payload: object,
	secret: string,
	expiresInDays = 30,
): Promise<string> {
	const header = { alg: "HS256", typ: "JWT" };
	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + expiresInDays * 24 * 60 * 60;
	const fullPayload = { ...payload, iat, exp };

	function base64UrlEncode(obj: object): string {
		return btoa(JSON.stringify(obj))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
	}

	const encHeader = base64UrlEncode(header);
	const encPayload = base64UrlEncode(fullPayload);

	const unsignedToken = `${encHeader}.${encPayload}`;

	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(unsignedToken),
	);

	const encSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

	return `${unsignedToken}.${encSignature}`;
}

function decodeJWT(token: string) {
	const [, payload] = token.split(".");
	const decodedPayload = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
	return JSON.parse(decodedPayload) as { sub: string };
}

function AppLoader() {
	const [isLoading, setIsLoading] = createSignal(true);
	const [zeroInstance, setZeroInstance] = createSignal<Zero<AppSchema> | null>(
		null,
	);

	onMount(async () => {
		try {
			let encodedJWT = localStorage.getItem("jwt");

			if (!encodedJWT) {
				const randomId = randID();
				encodedJWT = await createJWT(
					{ sub: randomId },
					must(import.meta.env.VITE_ZERO_AUTH_SECRET),
					30,
				);

				localStorage.setItem("jwt", encodedJWT);
			}

			const decodedJWT = encodedJWT && decodeJWT(encodedJWT);
			const userID =
				typeof decodedJWT === "object" && "sub" in decodedJWT
					? decodedJWT.sub
					: "anon";
			localStorage.setItem("userId", userID);

			const z = createZero({
				userID,
				auth: () => encodedJWT ?? "anon",
				server: import.meta.env.VITE_PUBLIC_SERVER,
				schema,
				kvStore: "idb",
			});
			z.query.users.preload();
			z.query.sessions.preload();
			z.query.suggestions.preload();
			z.query.comments.preload();
			z.query.reactions.preload();
			z.query.categories.preload();

			setTimeout(async () => {
				const user = await z.query.users.where("id", userID).one().run();
				logger.info("User data loaded", { user, userId: userID });
				const avatarUrl = `https://api.dicebear.com/6.x/bottts/svg?seed=${userID}`;

				if (!user) {
					z.mutate.users.insert({
						id: userID,
						displayName: getNameFromUserId(userID),
						avatarUrl,
						color:
							cssColorNames[Math.floor(Math.random() * cssColorNames.length)],
						createdAt: Date.now(),
						updatedAt: Date.now(),
					});
					const newUser = await z.query.users.where("id", userID).one().run();

					logger.info("Created new user", { userId: userID, user: newUser });
				}
				const userName = user?.displayName || getNameFromUserId(userID);

				// Set user info for HyperDX
				logger.setUserInfo({
					userId: userID,
					userName,
				});
				localStorage.setItem("username", userName);
				localStorage.setItem("useravatar", user?.avatarUrl || avatarUrl);
			}, 300);

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
				<ZeroProvider zero={zeroInstance() as Zero<AppSchema>}>
					<App />
				</ZeroProvider>
			)}
		</>
	);
}

render(() => <AppLoader />, root);
