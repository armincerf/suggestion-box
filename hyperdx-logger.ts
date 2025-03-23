// Simple HyperDX logging wrapper
// To use: import { logger } from './hyperdx-logger.ts'

export const HDX_API_KEY = 'a64b47e8-0592-478b-b780-2b0a86ad4112';

// Logger interface definition
export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error | null, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
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
    stack?: string;
  };
  [key: string]: unknown;
}

export function createLogger(serviceName: string): Logger {
  return {
    info: (message: string, data: Record<string, unknown> = {}): void => {
      const logEntry: LogEntry = {
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        service: {
          name: serviceName
        },
        ...data
      };
      console.log(JSON.stringify(logEntry));
    },
    
    error: (message: string, error: Error | null = null, data: Record<string, unknown> = {}): void => {
      const logEntry: LogEntry = {
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        service: {
          name: serviceName
        },
        ...data
      };
      
      if (error) {
        logEntry.error = {
          message: error.message,
          stack: error.stack
        };
      }
      
      console.error(JSON.stringify(logEntry));
    },
    
    warn: (message: string, data: Record<string, unknown> = {}): void => {
      const logEntry: LogEntry = {
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        service: {
          name: serviceName
        },
        ...data
      };
      console.warn(JSON.stringify(logEntry));
    }
  };
}

// Default logger
export const logger = createLogger('suggestion-box'); 