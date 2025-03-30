// Simple HyperDX logging wrapper
// To use: import { logger } from './hyperdx-logger.ts'

import HyperDX from "@hyperdx/browser";
import type { Attributes } from "@opentelemetry/api";

export const HDX_API_KEY = "a64b47e8-0592-478b-b780-2b0a86ad4112";
const SERVICE_NAME = "suggestion-box";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ENABLE_HDX_IN_DEV = true;

// Initialize HyperDX
if (IS_PRODUCTION) {
	HyperDX.init({
		apiKey: HDX_API_KEY,
		service: SERVICE_NAME,
		consoleCapture: true,
		advancedNetworkCapture: true,
		tracePropagationTargets: [/localhost:4848/i, /zero\.agileapp3000\.com/i], // Targets both dev and prod servers
		maskAllInputs: true, // Mask all input fields in session replay for privacy
		disableIntercom: true, // Disable Intercom integration
	});
} else if (ENABLE_HDX_IN_DEV) {
	// Development configuration with reduced features
	HyperDX.init({
		apiKey: HDX_API_KEY,
		service: `${SERVICE_NAME}-dev`,
		consoleCapture: true,
		advancedNetworkCapture: false, // Disable to reduce noise in development
		tracePropagationTargets: [/localhost:4848/i], // Only target local server
		disableReplay: true, // Disable session replay in development
		disableIntercom: true, // Disable Intercom integration
	});
}

// User info interface
interface UserInfo {
	userId: string;
	userEmail?: string;
	userName?: string;
	[key: string]: string | undefined;
}

// Logger interface definition
export interface Logger {
	info(message: string, data?: Record<string, unknown>): void;
	error(
		message: string,
		error?: Error | null,
		data?: Record<string, unknown>,
	): void;
	warn(message: string, data?: Record<string, unknown>): void;
	debug(message: string, data?: Record<string, unknown>): void;
	setUserInfo(userInfo: UserInfo): void;
	trackAction(name: string, data?: Record<string, unknown>): void;
}

// Log entry interface
interface LogEntry {
	level: string;
	message: string;
	timestamp: string;
	service: {
		name: string;
	};
	error?: {
		message: string;
		stack?: string | undefined;
	};
	[key: string]: unknown;
}

// Convert generic data to Attributes for HyperDX
function toAttributes(data: Record<string, unknown>): Attributes {
	// Create a new object with only string values
	const attributes: Attributes = {};

	// Convert any non-string values to strings
	for (const [key, value] of Object.entries(data)) {
		if (value !== undefined && value !== null) {
			attributes[key] =
				typeof value === "string" ? value : JSON.stringify(value);
		}
	}

	return attributes;
}

export function createLogger(serviceName: string): Logger {
	return {
		info: (message: string, data: Record<string, unknown> = {}): void => {
			const logEntry: LogEntry = {
				level: "info",
				message,
				timestamp: new Date().toISOString(),
				service: {
					name: serviceName,
				},
				...data,
			};

			if (IS_PRODUCTION) {
				// In production, we rely on HyperDX consoleCapture
				console.info(JSON.stringify(logEntry));
			} else {
				// In development, we format the log nicely for the console
				console.info("[INFO]", message, data);
			}
		},

		error: (
			message: string,
			error: Error | null = null,
			data: Record<string, unknown> = {},
		): void => {
			const logEntry: LogEntry = {
				level: "error",
				message,
				timestamp: new Date().toISOString(),
				service: {
					name: serviceName,
				},
				...data,
			};

			if (error) {
				logEntry.error = {
					message: error.message,
					stack: error.stack ?? undefined,
				};
			}

			if (IS_PRODUCTION) {
				// In production, rely on HyperDX consoleCapture
				console.error(JSON.stringify(logEntry));

				// Also report the error directly to HyperDX
				if (error) {
					HyperDX.recordException(error, toAttributes(data));
				}
			} else {
				// In development, format nicely for console
				console.error("[ERROR]", message, error, data);
			}
		},

		warn: (message: string, data: Record<string, unknown> = {}): void => {
			const logEntry: LogEntry = {
				level: "warn",
				message,
				timestamp: new Date().toISOString(),
				service: {
					name: serviceName,
				},
				...data,
			};

			if (IS_PRODUCTION) {
				console.warn(JSON.stringify(logEntry));
			} else {
				console.warn("[WARN]", message, data);
			}
		},

		debug: (message: string, data: Record<string, unknown> = {}): void => {
			const logEntry: LogEntry = {
				level: "debug",
				message,
				timestamp: new Date().toISOString(),
				service: {
					name: serviceName,
				},
				...data,
			};

			if (IS_PRODUCTION) {
				console.debug(JSON.stringify(logEntry));
			} else {
				console.debug("[DEBUG]", message, data);
			}
		},

		setUserInfo: (userInfo: UserInfo): void => {
			if (IS_PRODUCTION) {
				// Convert undefined values to empty strings for HyperDX's type requirements
				const hdxUserInfo: Record<string, string> = {};
				for (const [key, value] of Object.entries(userInfo)) {
					hdxUserInfo[key] = value ?? "";
				}

				HyperDX.setGlobalAttributes(hdxUserInfo);
			}
			// In development, we just log the user info
			else {
				console.info("[USER INFO] Setting user info", userInfo);
			}
		},

		trackAction: (name: string, data: Record<string, unknown> = {}): void => {
			if (IS_PRODUCTION) {
				HyperDX.addAction(name, toAttributes(data));
			}
			// In development, we just log the action
			else {
				console.info("[ACTION]", name, data);
			}
		},
	};
}

// Helper to attach to React error boundaries if using React
export const attachToErrorBoundary = (
	ErrorBoundaryComponent: unknown,
): void => {
	if (IS_PRODUCTION) {
		// HyperDX only supports React error boundaries directly
		// For SolidJS, we simply log that this function won't work
		// SolidJS errors are still captured by global error handlers below
		if (ErrorBoundaryComponent) {
			console.warn("HyperDX attachToErrorBoundary: Direct SolidJS ErrorBoundary integration not supported. Global error handlers will still capture unhandled errors.");
		}
	}
};

export const logger = createLogger("suggestion-box:default");

// Global error handler to catch unhandled errors
if (typeof window !== "undefined") {
	window.addEventListener("error", (event) => {
		logger.error("Unhandled error", event.error || new Error(event.message));
		return false;
	});

	window.addEventListener("unhandledrejection", (event) => {
		logger.error(
			"Unhandled promise rejection",
			event.reason instanceof Error
				? event.reason
				: new Error(String(event.reason)),
		);
		return false;
	});
}
