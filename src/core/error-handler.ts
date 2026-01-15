import { ApiError, ValidationError } from '../types/index.js';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  API = 'api',
  SYSTEM = 'system',
  BUSINESS = 'business',
  UNKNOWN = 'unknown'
}

/**
 * Error context interface
 */
export interface ErrorContext {
  timestamp: number;
  [key: string]: unknown;
}

/**
 * Base error class
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context: ErrorContext;
  public readonly cause?: Error;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    context: Partial<ErrorContext> = {},
    cause?: Error,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.category = category;
    this.context = {
      timestamp: Date.now(),
      ...context
    };
    this.cause = cause;
    this.recoverable = recoverable;

    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON format
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      context: this.context,
      recoverable: this.recoverable,
      stack: this.stack,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack
          }
        : undefined
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }
}

/**
 * Business logic error
 */
export class BusinessError extends BaseError {
  constructor(
    message: string,
    code: string = 'BUSINESS_ERROR',
    context: Partial<ErrorContext> = {},
    cause?: Error
  ) {
    super(
      message,
      code,
      ErrorSeverity.MEDIUM,
      ErrorCategory.BUSINESS,
      context,
      cause,
      true
    );
  }

  getUserMessage(): string {
    return this.message;
  }
}

/**
 * System error
 */
export class SystemError extends BaseError {
  constructor(
    message: string,
    code: string = 'SYSTEM_ERROR',
    context: Partial<ErrorContext> = {},
    cause?: Error
  ) {
    super(
      message,
      code,
      ErrorSeverity.HIGH,
      ErrorCategory.SYSTEM,
      context,
      cause,
      false
    );
  }

  getUserMessage(): string {
    return 'An internal system error occurred. Please try again later.';
  }
}

/**
 * Network error
 */
export class NetworkError extends BaseError {
  constructor(
    message: string,
    code: string = 'NETWORK_ERROR',
    context: Partial<ErrorContext> = {},
    cause?: Error
  ) {
    super(
      message,
      code,
      ErrorSeverity.MEDIUM,
      ErrorCategory.NETWORK,
      context,
      cause,
      true
    );
  }

  getUserMessage(): string {
    return 'Network connection error. Please check your connection and try again.';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BaseError {
  constructor(
    message: string,
    code: string = 'AUTHENTICATION_ERROR',
    context: Partial<ErrorContext> = {},
    cause?: Error
  ) {
    super(
      message,
      code,
      ErrorSeverity.HIGH,
      ErrorCategory.AUTHENTICATION,
      context,
      cause,
      false
    );
  }

  getUserMessage(): string {
    return 'Authentication failed. Please check your credentials.';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends BaseError {
  constructor(
    message: string,
    code: string = 'AUTHORIZATION_ERROR',
    context: Partial<ErrorContext> = {},
    cause?: Error
  ) {
    super(
      message,
      code,
      ErrorSeverity.HIGH,
      ErrorCategory.AUTHORIZATION,
      context,
      cause,
      false
    );
  }

  getUserMessage(): string {
    return 'Access denied. You do not have permission to perform this action.';
  }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends BaseError {
  constructor(
    message: string,
    public readonly toolName: string,
    code: string = 'TOOL_EXECUTION_ERROR',
    context: Partial<ErrorContext> = {},
    cause?: Error
  ) {
    super(
      message,
      code,
      ErrorSeverity.MEDIUM,
      ErrorCategory.BUSINESS,
      { ...context, toolName },
      cause,
      true
    );
  }

  getUserMessage(): string {
    return `Tool execution failed: ${this.message}`;
  }
}

/**
 * Error handling strategy interface
 */
interface ErrorHandlingStrategy {
  canHandle(error: Error | BaseError): boolean;
  handle(error: Error | BaseError, context: ErrorContext): Promise<BaseError>;
}

/**
 * Default error handling strategy
 */
class DefaultErrorHandlingStrategy implements ErrorHandlingStrategy {
  canHandle(_error: Error | BaseError): boolean {
    return true; // Default strategy handles all errors
  }

  async handle(
    error: Error | BaseError,
    context: ErrorContext
  ): Promise<BaseError> {
    // If already a standardized error, return directly
    if (error instanceof BaseError) {
      return error;
    }

    // Handle known error types
    if (error instanceof ValidationError) {
      return new BusinessError(error.message, 'VALIDATION_ERROR', context, error);
    }

    if (error instanceof ApiError) {
      return new SystemError(error.message, 'API_ERROR', context, error);
    }

    // Handle unknown errors
    return new SystemError(
      error.message || 'An unknown error occurred',
      'UNKNOWN_ERROR',
      context,
      error
    );
  }
}

/**
 * Network error handling strategy
 */
class NetworkErrorHandlingStrategy implements ErrorHandlingStrategy {
  canHandle(error: Error | BaseError): boolean {
    return (
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('connection') ||
      error.name === 'NetworkError'
    );
  }

  async handle(
    error: Error | BaseError,
    context: ErrorContext
  ): Promise<BaseError> {
    return new NetworkError(
      error.message,
      'NETWORK_CONNECTION_ERROR',
      context,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Unified error handler
 */
export class ErrorHandler {
  private strategies: ErrorHandlingStrategy[] = [];

  constructor() {
    // Register strategies in order
    this.addStrategy(new NetworkErrorHandlingStrategy());
    this.addStrategy(new DefaultErrorHandlingStrategy()); // Default strategy goes last
  }

  /**
   * Add error handling strategy
   */
  addStrategy(strategy: ErrorHandlingStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Handle error
   */
  async handleError(
    error: Error | BaseError,
    context: Partial<ErrorContext> = {}
  ): Promise<BaseError> {
    const errorContext: ErrorContext = {
      timestamp: Date.now(),
      ...context
    };

    try {
      // Find appropriate handling strategy
      const strategy = this.strategies.find(s => s.canHandle(error));
      if (!strategy) {
        console.warn('No suitable error handling strategy found', {
          error: error.message
        });
        return new SystemError(
          'No error handler available',
          'NO_HANDLER_ERROR',
          errorContext,
          error instanceof Error ? error : undefined
        );
      }

      // Handle error
      const standardError = await strategy.handle(error, errorContext);

      console.error('Error handled', {
        name: standardError.name,
        message: standardError.message,
        code: standardError.code
      });

      return standardError;
    } catch (handlingError) {
      console.error('Failed to handle error', {
        originalError: error.message,
        handlingError: handlingError instanceof Error ? handlingError.message : String(handlingError)
      });

      return new SystemError(
        'Error handling failed',
        'HANDLING_ERROR',
        errorContext,
        handlingError instanceof Error ? handlingError : undefined
      );
    }
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler();

/**
 * Convenience function to handle errors
 */
export async function handleError(
  error: Error | BaseError,
  context: Partial<ErrorContext> = {}
): Promise<BaseError> {
  return errorHandler.handleError(error, context);
}
