// https://docs.railway.com/guides/logs

type LogLevel = "debug" | "info" | "warn" | "error";

type LogEntry = {
  message: string;
  level: LogLevel;
  timestamp?: string;
  [key: string]: unknown;
};

export class Logger {
  private static log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ) {
    const entry: LogEntry = {
      message,
      level,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Output as single-line JSON for Railway to parse correctly
    console.log(JSON.stringify(entry));
  }

  static debug(message: string, context?: Record<string, unknown>) {
    Logger.log("debug", message, context);
  }

  static info(message: string, context?: Record<string, unknown>) {
    Logger.log("info", message, context);
  }

  static warn(message: string, context?: Record<string, unknown>) {
    Logger.log("warn", message, context);
  }

  static error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
  ) {
    const errorContext = error instanceof Error
      ? { error: error.message, stack: error.stack, ...context }
      : error
      ? { error: String(error), ...context }
      : context;

    Logger.log("error", message, errorContext);
  }
}
