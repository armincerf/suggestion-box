"use strict";
// Simple HyperDX logging wrapper
// To use: import { logger } from './hyperdx-logger.ts'
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachToErrorBoundary = exports.logger = exports.HDX_API_KEY = void 0;
exports.createLogger = createLogger;
var browser_1 = require("@hyperdx/browser");
exports.HDX_API_KEY = "a64b47e8-0592-478b-b780-2b0a86ad4112";
var SERVICE_NAME = "suggestion-box";
var IS_PRODUCTION = process.env.NODE_ENV === "production";
var ENABLE_HDX_IN_DEV = true;
// Initialize HyperDX
if (IS_PRODUCTION) {
    browser_1.default.init({
        apiKey: exports.HDX_API_KEY,
        service: SERVICE_NAME,
        consoleCapture: true,
        advancedNetworkCapture: true,
        tracePropagationTargets: [/localhost:4848/i, /zero\.agileapp3000\.com/i], // Targets both dev and prod servers
        maskAllInputs: true, // Mask all input fields in session replay for privacy
        disableIntercom: true, // Disable Intercom integration
    });
}
else if (ENABLE_HDX_IN_DEV) {
    // Development configuration with reduced features
    browser_1.default.init({
        apiKey: exports.HDX_API_KEY,
        service: "".concat(SERVICE_NAME, "-dev"),
        consoleCapture: true,
        advancedNetworkCapture: false, // Disable to reduce noise in development
        tracePropagationTargets: [/localhost:4848/i], // Only target local server
        disableReplay: true, // Disable session replay in development
        disableIntercom: true, // Disable Intercom integration
    });
}
// Convert generic data to Attributes for HyperDX
function toAttributes(data) {
    // Create a new object with only string values
    var attributes = {};
    // Convert any non-string values to strings
    for (var _i = 0, _a = Object.entries(data); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (value !== undefined && value !== null) {
            attributes[key] =
                typeof value === "string" ? value : JSON.stringify(value);
        }
    }
    return attributes;
}
function createLogger(serviceName) {
    return {
        info: function (message, data) {
            if (data === void 0) { data = {}; }
            var logEntry = __assign({ level: "info", message: message, timestamp: new Date().toISOString(), service: {
                    name: serviceName,
                } }, data);
            if (IS_PRODUCTION) {
                // In production, we rely on HyperDX consoleCapture
                console.info(JSON.stringify(logEntry));
            }
            else {
                // In development, we format the log nicely for the console
                console.info("[INFO]", message, data);
            }
        },
        error: function (message, error, data) {
            var _a;
            if (error === void 0) { error = null; }
            if (data === void 0) { data = {}; }
            var logEntry = __assign({ level: "error", message: message, timestamp: new Date().toISOString(), service: {
                    name: serviceName,
                } }, data);
            if (error) {
                logEntry.error = {
                    message: error.message,
                    stack: (_a = error.stack) !== null && _a !== void 0 ? _a : undefined,
                };
            }
            if (IS_PRODUCTION) {
                // In production, rely on HyperDX consoleCapture
                console.error(JSON.stringify(logEntry));
                // Also report the error directly to HyperDX
                if (error) {
                    browser_1.default.recordException(error, toAttributes(data));
                }
            }
            else {
                // In development, format nicely for console
                console.error("[ERROR]", message, error, data);
            }
        },
        warn: function (message, data) {
            if (data === void 0) { data = {}; }
            var logEntry = __assign({ level: "warn", message: message, timestamp: new Date().toISOString(), service: {
                    name: serviceName,
                } }, data);
            if (IS_PRODUCTION) {
                console.warn(JSON.stringify(logEntry));
            }
            else {
                console.warn("[WARN]", message, data);
            }
        },
        debug: function (message, data) {
            if (data === void 0) { data = {}; }
            var logEntry = __assign({ level: "debug", message: message, timestamp: new Date().toISOString(), service: {
                    name: serviceName,
                } }, data);
            if (IS_PRODUCTION) {
                console.debug(JSON.stringify(logEntry));
            }
            else {
                console.debug("[DEBUG]", message, data);
            }
        },
        setUserInfo: function (userInfo) {
            if (IS_PRODUCTION) {
                // Convert undefined values to empty strings for HyperDX's type requirements
                var hdxUserInfo = {};
                for (var _i = 0, _a = Object.entries(userInfo); _i < _a.length; _i++) {
                    var _b = _a[_i], key = _b[0], value = _b[1];
                    hdxUserInfo[key] = value !== null && value !== void 0 ? value : "";
                }
                browser_1.default.setGlobalAttributes(hdxUserInfo);
            }
            // In development, we just log the user info
            else {
                console.info("[USER INFO] Setting user info", userInfo);
            }
        },
        trackAction: function (name, data) {
            if (data === void 0) { data = {}; }
            if (IS_PRODUCTION) {
                browser_1.default.addAction(name, toAttributes(data));
            }
            // In development, we just log the action
            else {
                console.info("[ACTION]", name, data);
            }
        },
    };
}
// Default logger
exports.logger = createLogger("suggestion-box");
// Helper to attach to React error boundaries if using React
var attachToErrorBoundary = function (ErrorBoundaryComponent) {
    if (IS_PRODUCTION) {
        // HyperDX only supports React error boundaries directly
        // For SolidJS, we simply log that this function won't work
        // SolidJS errors are still captured by global error handlers below
        if (ErrorBoundaryComponent) {
            console.warn("HyperDX attachToErrorBoundary: Direct SolidJS ErrorBoundary integration not supported. Global error handlers will still capture unhandled errors.");
        }
    }
};
exports.attachToErrorBoundary = attachToErrorBoundary;
// Global error handler to catch unhandled errors
if (typeof window !== "undefined") {
    window.addEventListener("error", function (event) {
        exports.logger.error("Unhandled error", event.error || new Error(event.message));
        return false;
    });
    window.addEventListener("unhandledrejection", function (event) {
        exports.logger.error("Unhandled promise rejection", event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason)));
        return false;
    });
}
