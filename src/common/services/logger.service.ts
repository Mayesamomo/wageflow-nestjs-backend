import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context: string;
  private logLevel: string;
  private logToConsole: boolean = true;
  private logToFile: boolean = true;
  private logFilePath: string;

  constructor(private configService: ConfigService) {
    this.logLevel = this.configService.get('LOG_LEVEL', 'info');
    this.setupLogFile();
  }

  private setupLogFile(): void {
    if (!this.logToFile) return;

    const logsDir = path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const date = new Date().toISOString().split('T')[0];
    this.logFilePath = path.join(logsDir, `app-${date}.log`);
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, context?: string): void {
    this.writeLog('info', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.writeLog('error', message, context, trace);
  }

  warn(message: string, context?: string): void {
    this.writeLog('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.writeLog('debug', message, context);
  }

  verbose(message: string, context?: string): void {
    this.writeLog('verbose', message, context);
  }

  private writeLog(level: string, message: string, context?: string, trace?: string): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${ctx}] ${message}${trace ? `\n${trace}` : ''}`;

    if (this.logToConsole) {
      this.logToConsoleWithColor(level, logEntry);
    }

    if (this.logToFile) {
      this.appendToLogFile(logEntry);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
    const levelIndex = levels.indexOf(level);
    const configLevelIndex = levels.indexOf(this.logLevel);
    
    return levelIndex <= configLevelIndex;
  }

  private logToConsoleWithColor(level: string, message: string): void {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[35m', // Magenta
      verbose: '\x1b[90m', // Gray
      reset: '\x1b[0m',  // Reset
    };

    const color = colors[level] || colors.reset;
    console.log(`${color}${message}${colors.reset}`);
  }

  private appendToLogFile(logEntry: string): void {
    try {
      fs.appendFileSync(this.logFilePath, `${logEntry}\n`);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}