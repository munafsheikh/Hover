export class Logger {
    private static instance: Logger;
    private readonly DEBUG: boolean = true;  // Toggle this for production

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    info(message: string, ...args: any[]): void {
        console.log(`[Hover-Extension][INFO] ${message}`, ...args);
    }

    debug(message: string, ...args: any[]): void {
        if (this.DEBUG) {
            console.log(`[Hover-Extension][DEBUG] ${message}`, ...args);
        }
    }

    error(message: string, error?: any): void {
        console.error(`[Hover-Extension][ERROR] ${message}`, error);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[Hover-Extension][WARN] ${message}`, ...args);
    }
} 