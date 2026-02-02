export class Logger {
    static instance;
    DEBUG = true;  // Toggle this for production

    constructor() {}

    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    info(message, ...args) {
        console.log(`[Hover-Extension][INFO] ${message}`, ...args);
    }

    debug(message, ...args) {
        if (this.DEBUG) {
            console.log(`[Hover-Extension][DEBUG] ${message}`, ...args);
        }
    }

    error(message, error) {
        console.error(`[Hover-Extension][ERROR] ${message}`, error);
    }

    warn(message, ...args) {
        console.warn(`[Hover-Extension][WARN] ${message}`, ...args);
    }
}
