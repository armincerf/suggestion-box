/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import "./index.css";
import { schema } from "./schema";
import { decodeJwt, SignJWT } from "jose";
import { createZero } from "@rocicorp/zero/solid";
import { randID, randomName } from "./rand";

function must<T>(val: T) {
	if (!val) {
		throw new Error("Expected value to be defined");
	}
	return val;
}

const encodedJWT = localStorage.getItem("jwt");
if (!encodedJWT) {
	const randomId = randID();
	const jwt = await new SignJWT({
		sub: randomId,
		iat: Math.floor(Date.now() / 1000),
		name: randomName(),
	})
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("30days")
		.sign(new TextEncoder().encode(must(import.meta.env.VITE_ZERO_AUTH_SECRET)));
	localStorage.setItem("jwt", jwt);
}
const decodedJWT = encodedJWT && decodeJwt(encodedJWT);
const userID = decodedJWT?.sub ? (decodedJWT.sub as string) : "anon";
localStorage.setItem("userIdentifier", userID);

const z = createZero({
	userID,
	auth: () => encodedJWT ?? "anon",
	server: import.meta.env.VITE_PUBLIC_SERVER,
	schema,
	kvStore: "idb",
});

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

render(() => <App z={z} />, root);
