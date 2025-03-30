import { createContext, useContext, type ParentProps } from "solid-js";
import type { Zero } from "@rocicorp/zero";

import type { Schema } from "../../shared/zero/schema";
import type { Mutators } from "../../shared/zero/mutators";

export type TZero = Zero<Schema, Mutators>;

type ZeroContextValue = TZero | undefined;

const ZeroContext = createContext<ZeroContextValue>(undefined);

export function useZero(): TZero {
	const zero = useContext(ZeroContext);
	if (zero === undefined) {
		throw new Error("useZero must be used within a ZeroProvider");
	}
	return zero;
}

export function ZeroProvider(props: ParentProps<{ zero: TZero }>) {
	return (
		<ZeroContext.Provider value={props.zero}>
			{props.children}
		</ZeroContext.Provider>
	);
}
