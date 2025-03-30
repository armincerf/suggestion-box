import { createContext, useContext, type ParentProps } from "solid-js";
import type { Zero } from "@rocicorp/zero";
import type { Schema } from "./schema";

// Define a base type for the context value, allowing MD to be potentially undefined
type ZeroContextValue = Zero<Schema> | undefined;

const ZeroContext = createContext<ZeroContextValue>(undefined);

// useZero hook returns the non-nullable context value
export function useZero(): NonNullable<ZeroContextValue> {
	const zero = useContext(ZeroContext);
	if (zero === undefined) {
		throw new Error("useZero must be used within a ZeroProvider");
	}
	return zero;
}

// Provider uses the context value type
export function ZeroProvider(props: ParentProps<{ zero: NonNullable<ZeroContextValue> }>) {
	return (
		<ZeroContext.Provider value={props.zero}>
			{props.children}
		</ZeroContext.Provider>
	);
} 

export type TZero = Zero<Schema>;