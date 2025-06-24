const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
        }
        
        return formattedMessage;
    }

    writeToFile(level, message) {
        const logFile = path.join(this.logDir, `${level}.log`);
        const allLogsFile = path.join(this.logDir, 'all.log');
        
        try {
            fs.appendFileSync(logFile, message + '\n');
            fs.appendFileSync(allLogsFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    log(level, message, data = null) {
        const formattedMessage = this.formatMessage(level, message, data);
        
        // Console output with colors
        switch (level) {
            case 'error':
                console.error('\x1b[31m%s\x1b[0m', formattedMessage);
                break;
            case 'warn':
                console.warn('\x1b[33m%s\x1b[0m', formattedMessage);
                break;
            case 'info':
                console.info('\x1b[36m%s\x1b[0m', formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }

        // Write to file
        this.writeToFile(level, formattedMessage);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
            this.log('debug', message, data);
        }
    }
}

module.exports = new Logger();
