declare module 'tmake-core/log' {
  class Log {
    getMessage(...args: any[]): string
    log(...args: any[])
    verbose(...args: any[])
    quiet(...args: any[])
    dev(...args: any[])
    info(...args: any[])
    warn(...args: any[])
    add(...args: any[])
    error(...args: any[])
    throw(...args: any[])
    parse(...args: any[])
  }

  const log: Log;
}