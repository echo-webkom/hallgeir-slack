import * as log from "@std/log";

// Setup logging configuration with JSON formatting
export function setupLogger(level: log.LevelName = "DEBUG") {
  log.setup({
    handlers: {
      console: new log.ConsoleHandler(level, {
        formatter: (logRecord) => {
          const structured = {
            timestamp: new Date().toISOString(),
            level: logRecord.levelName,
            message: logRecord.msg,
            ...logRecord.args,
          };
          return JSON.stringify(structured);
        },
      }),
    },
    loggers: {
      default: {
        level,
        handlers: ["console"],
      },
    },
  });
}

// Export a default logger instance
export const logger = log.getLogger();

// Helper functions for structured logging with context
export function logInfo(message: string, context?: Record<string, unknown>) {
  logger.info(message, context);
}

export function logError(
  message: string,
  error?: Error | unknown,
  context?: Record<string, unknown>
) {
  const errorContext =
    error instanceof Error
      ? { error: error.message, stack: error.stack, ...context }
      : { error: String(error), ...context };
  logger.error(message, errorContext);
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  logger.warn(message, context);
}

export function logDebug(message: string, context?: Record<string, unknown>) {
  logger.debug(message, context);
}
