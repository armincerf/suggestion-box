import { createContext, useContext, type ParentProps } from "solid-js";
import type { Zero } from "@rocicorp/zero";
import type { Schema } from "../schema";
import type { CustomMutatorDefs } from "@rocicorp/zero";

const ZeroContext = createContext<
	Zero<Schema, CustomMutatorDefs<Schema>> | undefined
>(undefined);

export function useZero<
	S extends Schema,
	MD extends CustomMutatorDefs<S> | undefined = undefined,
>(): Zero<S, MD> {
	const zero = useContext(ZeroContext);
	if (zero === undefined) {
		throw new Error("useZero must be used within a ZeroProvider");
	}
	return zero as Zero<S, MD>;
}

export function createUseZero<
	S extends Schema,
	MD extends CustomMutatorDefs<S> | undefined = undefined,
>() {
	return () => useZero<S, MD>();
}

export function ZeroProvider<
	S extends Schema,
	MD extends CustomMutatorDefs<S> | undefined = undefined,
>(props: ParentProps<{ zero: Zero<S, MD> }>) {
	return (
		// @ts-expect-error - I don't know typescript well enough to do this properly but it works
		<ZeroContext.Provider value={props.zero}>
			{props.children}
		</ZeroContext.Provider>
	);
}
