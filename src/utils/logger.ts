// A simple, configurable logger for client-side debugging.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV === 'development';

class Logger {
  private log(level: LogLevel, message: string, data?: any) {
    if (isDev) {
      const style = `color: ${level === 'error' ? 'red' : level === 'warn' ? 'orange' : 'cyan'}`;
      console.log(`%c[${level.toUpperCase()}] ${message}`, style, data || '');
    }
    // In production, you would send this to an analytics service
    // e.g., analytics.track(message, { level, ...data });
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
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
}

export const logger = new Logger();