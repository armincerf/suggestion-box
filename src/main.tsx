/* @refresh reload */
import { render } from "solid-js/web";
import { createSignal, onMount } from "solid-js";
import App from "./App";
import "./index.css";
import "./components/ErrorFallback.css";
import { schema } from "./schema";
import { decodeJwt, SignJWT } from "jose";
import { createZero } from "@rocicorp/zero/solid";
import type { Zero } from "@rocicorp/zero";
import type { Schema as AppSchema } from "./schema";
import { randID, randomName } from "./rand";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { suggestionQuery } from "./hooks/useSuggestions";
import { ZeroProvider } from "./context/ZeroContext";
import { userQuery } from "./hooks/useUser";

function must<T>(val: T) {
	if (!val) {
		throw new Error("Expected value to be defined");
	}
	return val;
}

// Get the root element
const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

// Create a component that handles the initialization and displays the app
function AppLoader() {
	const [isLoading, setIsLoading] = createSignal(true);
	const [zeroInstance, setZeroInstance] = createSignal<Zero<AppSchema> | null>(
		null,
	);

	onMount(async () => {
		try {
			// Check for existing JWT
			let encodedJWT = localStorage.getItem("jwt");
			const userExisted = !!encodedJWT;

			// If no JWT exists, create one
			if (!encodedJWT) {
				const randomId = randID();
				encodedJWT = await new SignJWT({
					sub: randomId,
					iat: Math.floor(Date.now() / 1000),
				})
					.setProtectedHeader({ alg: "HS256" })
					.setExpirationTime("30days")
					.sign(
						new TextEncoder().encode(
							must(import.meta.env.VITE_ZERO_AUTH_SECRET),
						),
					);

				localStorage.setItem("jwt", encodedJWT);
			}

			// Decode the JWT to get user ID
			const decodedJWT = encodedJWT && decodeJwt(encodedJWT);
			const userID = decodedJWT?.sub ? (decodedJWT.sub as string) : "anon";
			localStorage.setItem("userIdentifier", userID);

			// Create the Zero instance
			const z = createZero({
				userID,
				auth: () => encodedJWT ?? "anon",
				server: import.meta.env.VITE_PUBLIC_SERVER,
				schema,
				kvStore: "idb",
			});

			if (!userExisted) {
				z.mutate.user.insert({
					id: userID,
					displayName: randomName(),
					avatarUrl: `https://api.dicebear.com/6.x/bottts/svg?seed=${userID}`,
				});
			}
			setTimeout(() => {
				if (z) {
					// for some reason doing this results in all data being sent to the client
					// even if its already cached in idb, but it does at least preload the data
					// and we can put it in a timeout to ensure it's not blocking the main thread.
					// If this becomes a bottleneck because of the amount of data being sent,
					// you should just be able to remove this and let zero load the data normally,
					// though you'll see more spinners when the other pages first load.
					// TODO: figure out why the unecessary data fetching is happening
					suggestionQuery(z).preload();
					userQuery(z).preload();
				}
			}, 0);
			setZeroInstance(z);
		} catch (error) {
			console.error("Failed to initialize app:", error);
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

// Render the app loader
render(() => <AppLoader />, root);
