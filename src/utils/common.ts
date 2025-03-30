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
    const exceptions: { [key: string]: string } = {
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
    const vowels = 'aeiou';
    if (
        lowerWord.endsWith('y') &&
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