// shared/zero/auth.ts

// --- Helper Functions (from example, useful later) ---
export function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        // Use console.error or throw a specific error type if preferred
        throw new Error(`Assertion failed: ${message}`);
    }
}

// --- AuthData Definition ---
// !!! IMPORTANT: Adjust this type to match EXACTLY what's in your JWT payload !!!
export type AuthData = {
    /** User ID (Subject) - REQUIRED by Zero initialization */
    sub: string;

    /** User's display name (Optional, but good to have) */
    name?: string;

    /** Example: User role (if you have roles) */
    // role?: 'admin' | 'member';

    /** JWT Expiration Timestamp (Unix epoch seconds) */
    exp?: number;

    /** JWT Issued At Timestamp (Unix epoch seconds) */
    iat?: number;

    // Add any other fields from your JWT payload that might be relevant
    // for authorization checks within mutators later.
};

// --- Basic Auth Checks (for future use in mutators) ---

/** Checks if authData exists and is optionally not expired */
export function assertIsLoggedIn(authData: AuthData | undefined): asserts authData is AuthData {
    assert(authData, 'User must be logged in for this operation');

    // Optional: Check expiry if present in your token
    if (authData.exp && Date.now() / 1000 > authData.exp) {
        // Clear session? Trigger logout? Depends on desired behavior.
        console.error("JWT has expired.");
        // Throwing here will stop the mutation
        throw new Error("Session token has expired.");
    }
}

// Add more assertion functions here later as needed, e.g.:
// export function assertIsAdmin(authData: AuthData): asserts authData is AuthData & { role: 'admin' } { ... }
// export async function assertIsOwner(tx: Transaction<Schema>, authData: AuthData, resourceId: string) { ... }