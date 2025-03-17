type ClassDictionary = Record<string, unknown>;
type ClassArray = ClassValue[];
type ClassValue =
	| ClassArray
	| ClassDictionary
	| string
	| number
	| bigint
	| null
	| boolean
	| undefined;

export function clsx(args: ClassValue[]) {
	let i = 0;
	let tmp: ClassValue = undefined;
	let str = "";
	const len = args.length;
	for (; i < len; i++) {
		// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
		if ((tmp = args[i])) {
			if (typeof tmp === "string") {
				str += (str && " ") + tmp;
			}
		}
	}
	return str;
}

export type Cn = (...args: ClassValue[]) => string;

export const cn: Cn = (...args: ClassValue[]) => clsx(args);
