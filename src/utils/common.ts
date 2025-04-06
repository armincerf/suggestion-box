import type { Accessor, Setter } from "solid-js";
export type { EffectOptions, OnOptions } from "solid-js";

/**
 * Can be single or in an array
 */
export type Many<T> = T | T[];
export type Values<O extends object> = O[keyof O]; // Using 'object' is generally fine, but Record<PropertyKey, unknown> might be stricter if needed

export type Noop = (...a: unknown[]) => void;

export type Directive<P = true> = (el: Element, props: Accessor<P>) => void;

/**
 * Infers the type of the array elements
 */
export type ItemsOf<T> = T extends ReadonlyArray<infer E> ? E : never; // Use ReadonlyArray for broader compatibility
export type ItemsOfMany<T> = T extends ReadonlyArray<unknown> ? ItemsOf<T> : T;

export type SetterParam<T> = Parameters<Setter<T>>[0];

/**
 * T or a reactive/non-reactive function returning T
 */
export type MaybeAccessor<T> = T | Accessor<T>;
/**
 * Accessed value of a MaybeAccessor
 * @example
 * ```ts
 * MaybeAccessorValue<MaybeAccessor<string>>
 * // => string
 * MaybeAccessorValue<MaybeAccessor<() => string>>
 * // => string | (() => string) // Note: This depends on how Accessor<T> is defined; typically () => T
 * MaybeAccessorValue<MaybeAccessor<string> | AnyFunction> // Assuming AnyFunction is defined
 * // => string | unknown // Result depends on AnyFunction's return type (unknown)
 * ```
 */
export type MaybeAccessorValue<T extends MaybeAccessor<unknown>> = // Use unknown instead of any
	T extends () => unknown ? ReturnType<T> : T; // Use unknown instead of any

export type OnAccessEffectFunction<S, Prev, Next extends Prev = Prev> = (
	input: AccessReturnTypes<S>,
	prevInput: AccessReturnTypes<S>,
	v: Prev,
) => Next;

export type AccessReturnTypes<S> = S extends ReadonlyArray<
	MaybeAccessor<unknown>
> // Use ReadonlyArray and unknown
	? {
			[I in keyof S]: AccessReturnTypes<S[I]>;
		}
	: MaybeAccessorValue<S>;

/** Allows to make shallow overwrites to an interface */
export type Modify<T, R> = Omit<T, keyof R> & R;

export type AnyObject = Record<PropertyKey, unknown>; // Use unknown instead of any

/** Makes each property optional and turns each leaf property into unknown, allowing for type overrides by narrowing unknown. */
export type DeepPartialAny<T> = {
	[P in keyof T]?: T[P] extends AnyObject ? DeepPartialAny<T[P]> : unknown; // Use unknown instead of any
};

/** Removes the `[...list]` functionality */
export type NonIterable<T> = T & {
	[Symbol.iterator]: never;
};

/** Get the required keys of an object */
export type RequiredKeys<T> = keyof {
	[K in keyof T as T extends { [_ in K]: unknown } ? K : never]: 0;
};

/** Remove the first item of a tuple [1, 2, 3, 4] => [2, 3, 4] */
export type Tail<T extends unknown[]> = ((...t: T) => void) extends (
	x: unknown, // Use unknown instead of any
	...u: infer U
) => void
	? U
	: never;

/** `A | B => A & B` */
export type UnionToIntersection<U> = (
	U extends unknown // Use unknown instead of any
		? (k: U) => void
		: never
) extends (k: infer I) => void
	? I
	: never;

export type ExtractIfPossible<T, U> = Extract<T, U> extends never
	? U
	: Extract<T, U>;

export type AnyFunction = (...args: unknown[]) => unknown; // Use unknown[] and unknown
export type AnyClass = abstract new (...args: unknown[]) => unknown; // Use unknown[] and unknown

export type AnyStatic = [] | unknown[] | AnyObject; // Use unknown[]

export type PrimitiveValue = PropertyKey | boolean | bigint | null | undefined;

export type FalsyValue = false | 0 | "" | null | undefined;
export type Truthy<T> = Exclude<T, FalsyValue>;
export type Falsy<T> = Extract<T, FalsyValue>;

export type Position = {
	x: number;
	y: number;
};

export type Size = {
	width: number;
	height: number;
};

/** Unwraps the type definition of an object, making it more readable */
export type Simplify<T> = T extends object ? { [K in keyof T]: T[K] } : T;
/** Unboxes type definition, making it more readable */
export type UnboxLazy<T> = T extends () => infer U ? U : T;

type RawNarrow<T> =
	| (T extends [] ? [] : never)
	| (T extends string | number | bigint | boolean ? T : never)
	| { [K in keyof T]: T[K] extends AnyFunction ? T[K] : RawNarrow<T[K]> }; // Use AnyFunction instead of Function

export type Narrow<T> = T extends [] ? T : RawNarrow<T>;

// Magic type that when used at sites where generic types are inferred from, will prevent those sites from being involved in the inference.
// https://github.com/microsoft/TypeScript/issues/14829
// TypeScript Discord conversation: https://discord.com/channels/508357248330760243/508357248330760249/911266491024949328
export type NoInfer<T> = [T][T extends unknown ? 0 : never]; // Use unknown instead of any

export function pluralize(word: string, count: number): string {
	// Handle the simple case of 1
	if (count === 1) {
		return word;
	}

	// Handle 0 or other non-1 counts as plural
	// You could customize the output for count === 0 if needed,
	// e.g., return `0 ${word}s` or `No ${word}s`

	const lowerWord = word.toLowerCase();

	// --- Add specific exceptions here if needed ---
	// This is useful for highly irregular words if you encounter them often.
	const exceptions: Record<string, string> = {
		// Use Record<string, string> for type safety
		// Example: person: 'people', // uncomment and add if needed
		// Example: child: 'children',
		// Example: mouse: 'mice'
	};
	if (exceptions[lowerWord]) {
		// Note: This returns the predefined plural form.
		// Handling original casing perfectly with irregulars is complex.
		return exceptions[lowerWord];
	}

	// --- Common Rules ---

	// Rule: Ends in 'y' preceded by a consonant -> 'ies' (e.g., reply -> replies, story -> stories)
	// But not if preceded by a vowel (e.g., day -> days, key -> keys)
	const vowels = "aeiou";
	if (
		lowerWord.endsWith("y") &&
		lowerWord.length > 1 &&
		!vowels.includes(lowerWord.charAt(lowerWord.length - 2))
	) {
		// Slice the original word to preserve case, then add 'ies'
		return `${word.slice(0, -1)}ies`;
	}

	// Rule: Ends in 's', 'x', 'z', 'ch', 'sh' -> 'es' (e.g., bus -> buses, box -> boxes, match -> matches)
	if (/[sxz]$/.test(lowerWord) || /[sc]h$/.test(lowerWord)) {
		return `${word}es`;
	}
	// Alternative non-regex check:
	// const esEndings = ['s', 'x', 'z', 'sh', 'ch'];
	// if (esEndings.some(ending => lowerWord.endsWith(ending))) {
	//     return word + 'es';
	// }

	// --- Default Rule ---
	// Add 's' (e.g., button -> buttons, comment -> comments)
	return `${word}s`;
}

// // --- Examples ---
// console.log(`1 ${pluralize('reply', 1)}`);     // Output: 1 reply
// console.log(`2 ${pluralize('reply', 2)}`);     // Output: 2 replies
// console.log(`0 ${pluralize('reply', 0)}`);     // Output: 0 replies

// console.log(`1 ${pluralize('comment', 1)}`); // Output: 1 comment
// console.log(`5 ${pluralize('comment', 5)}`); // Output: 5 comments

// console.log(`1 ${pluralize('box', 1)}`);       // Output: 1 box
// console.log(`3 ${pluralize('box', 3)}`);       // Output: 3 boxes

// console.log(`1 ${pluralize('match', 1)}`);     // Output: 1 match
// console.log(`10 ${pluralize('match', 10)}`);   // Output: 10 matches

// console.log(`1 ${pluralize('Day', 1)}`);       // Output: 1 Day
// console.log(`7 ${pluralize('Day', 7)}`);       // Output: 7 Days (Handles vowel before 'y')