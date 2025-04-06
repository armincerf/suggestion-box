// should be done backend if you want to use some more robust auth
// but for my use case this is fine
const JWT_SECRET = import.meta.env.VITE_ZERO_AUTH_SECRET;
const JWT_EXPIRY_DAYS = 30;

// Define a type for JWT payload
interface JWTPayload {
  sub?: string;
  [key: string]: unknown;
}

/**
 * Create a JWT token with the provided payload
 * @param payload The payload to include in the JWT
 * @returns A promise that resolves to the JWT string
 */
export async function createJWT(payload: JWTPayload): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + JWT_EXPIRY_DAYS * 24 * 60 * 60;
  const fullPayload = { ...payload, iat, exp };

  function base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const unsignedToken = `${encHeader}.${encPayload}`;

  const key = await crypto.subtle.importKey(
    "raw", 
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC", 
    key, 
    new TextEncoder().encode(unsignedToken)
  );
  
  const encSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${unsignedToken}.${encSignature}`;
} 