export class Logger {
  private enableLogging: boolean;

  private static instance: Logger;

  private constructor() {
    this.enableLogging = true; // Logging is initially enabled
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLoggingEnabled(enabled: boolean): void {
    this.enableLogging = enabled;
  }

  info(message: string): void {
    if (this.enableLogging) {
      console.log(`[INFO] ${message}`);
    }
  }

  warn(message: string): void {
    if (this.enableLogging) {
      console.warn(`[WARN] ${message}`);
    }
  }

  error(message: string): void {
    if (this.enableLogging) {
      console.error(`[ERROR] ${message}`);
    }
  }

  time(message: string): void {
    if (this.enableLogging) {
      console.time(`[TIME] ${message}`);
    }
  }

  timeEnd(message: string): void {
    if (this.enableLogging) {
      console.timeEnd(`[TIME] ${message}`);
    }
  }
}
