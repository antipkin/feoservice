// frontend/lib/logger.ts

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private prefix: string;

  constructor(prefix: string = 'App') {
    this.prefix = prefix;
  }

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logMessage, data || '');
        }
        break;
    }
    
    // В будущем здесь можно добавить отправку логов на сервер
    // if (level === 'error') sendErrorToServer(logMessage, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
}

export const logger = new Logger('Frontend');