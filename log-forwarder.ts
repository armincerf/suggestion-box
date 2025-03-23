#!/usr/bin/env bun

// Simple log forwarder to HyperDX
// Usage: bun run log-forwarder.ts <service-name> -- <command>
import { spawn } from 'node:child_process';
import { HDX_API_KEY } from './hyperdx-logger.ts';

// Define log level type
type LogLevel = 'info' | 'warn' | 'error';

// Get command line arguments
const args = process.argv.slice(2);
let serviceName = 'suggestion-box';
let cmdArgs = args;

// Extract service name if provided
if (args.length > 2 && args[1] === '--') {
  serviceName = args[0];
  cmdArgs = args.slice(2);
}

// Log forwarder implementation
const forwardLog = async (log: string, level: LogLevel = 'info'): Promise<void> => {
  try {
    const payload = {
      level,
      message: log,
      service: { name: serviceName },
      timestamp: new Date().toISOString(),
      __HDX_API_KEY: HDX_API_KEY
    };
    
    // In a real implementation, you would send to HyperDX API
    // For now, just log to console in a structured format
    console.log(JSON.stringify(payload));
    
    // Direct HTTP implementation to send logs to HyperDX
    try {
      await fetch('https://in-otel.hyperdx.io/v1/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HDX_API_KEY}`
        },
        body: JSON.stringify([payload])
      });
    } catch (err) {
      // Silently fail API calls - don't block the process
      console.error('Failed to send log to HyperDX API:', err);
    }
  } catch (error) {
    console.error('Failed to forward log:', error);
  }
};

// Run the command and forward logs
if (cmdArgs.length > 0) {
  const command = cmdArgs[0];
  const commandArgs = cmdArgs.slice(1);
  
  console.log(`Starting command: ${command} ${commandArgs.join(' ')}`);
  
  const childProcess = spawn(command, commandArgs, {
    stdio: 'pipe',
    shell: true
  });
  
  childProcess.stdout.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      process.stdout.write(data); // Echo to console
      forwardLog(output, 'info');
    }
  });
  
  childProcess.stderr.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      process.stderr.write(data); // Echo to console
      forwardLog(output, 'error');
    }
  });
  
  childProcess.on('close', (code: number | null) => {
    const message = `Command exited with code ${code}`;
    console.log(message);
    forwardLog(message, code === 0 ? 'info' : 'error');
    process.exit(code || 0);
  });
  
  // Handle termination signals
  for (const signal of ['SIGINT', 'SIGTERM'] as NodeJS.Signals[]) {
    process.on(signal, () => {
      childProcess.kill(signal);
    });
  }
} else {
  console.error('No command specified');
  process.exit(1);
} 