import { z } from 'zod';
import { ValidationError } from '../types/index.js';

/**
 * Runtime type validator
 */
export class RuntimeValidator {
  /**
   * Validate data against specified Zod schema
   */
  static validate<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    options: {
      throwOnError?: boolean;
      customMessage?: string;
      logErrors?: boolean;
    } = {}
  ): {
    success: boolean;
    data?: T;
    error?: {
      message: string;
      code: string;
    };
  } {
    const { throwOnError = true, customMessage, logErrors = true } = options;

    try {
      const result = schema.parse(data);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const validationErrors = this.parseZodError(error as z.ZodError);

      if (logErrors) {
        console.warn('Validation failed', {
          errors: validationErrors,
          data: this.sanitizeData(data)
        });
      }

      if (throwOnError) {
        const message =
          customMessage ||
          `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`;
        throw new ValidationError(message, { errors: validationErrors });
      }

      return {
        success: false,
        error: {
          message: validationErrors.map(e => e.message).join(', '),
          code: 'VALIDATION_ERROR'
        }
      };
    }
  }

  /**
   * Safe validation, does not throw exceptions
   */
  static safeValidate<T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ): ReturnType<typeof RuntimeValidator.validate<T>> {
    return this.validate(data, schema, { throwOnError: false });
  }

  /**
   * Parse Zod error to standard validation error format
   */
  static parseZodError(error: z.ZodError): Array<{
    message: string;
    field: string;
    code: string;
    expected: string;
    received: string;
  }> {
    return error.issues.map(issue => ({
      message: issue.message,
      field: issue.path.join('.'),
      code: issue.code,
      expected: this.getExpectedType(issue),
      received:
        'received' in issue
          ? String(issue.received)
          : 'unknown'
    }));
  }

  /**
   * Get expected type description
   */
  static getExpectedType(issue: z.ZodIssue): string {
    switch (issue.code) {
      case 'invalid_type':
        return issue.expected;
      case 'too_small':
        return `minimum ${(issue as z.ZodTooSmallIssue).minimum}`;
      case 'too_big':
        return `maximum ${(issue as z.ZodTooBigIssue).maximum}`;
      default:
        return 'valid value';
    }
  }

  /**
   * Sanitize sensitive data for logging
   */
  static sanitizeData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...(data as Record<string, unknown>) };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /** Non-empty string */
  nonEmptyString: z.string().min(1, 'String cannot be empty'),
  /** Positive integer */
  positiveInteger: z.number().int().positive('Must be a positive integer'),
  /** Non-negative integer */
  nonNegativeInteger: z
    .number()
    .int()
    .min(0, 'Must be a non-negative integer'),
  /** URL format */
  url: z.string().url('Must be a valid URL'),
  /** Email format */
  email: z.string().email('Must be a valid email address'),
  /** UUID format */
  uuid: z.string().uuid('Must be a valid UUID'),
  /** File path */
  filePath: z
    .string()
    .min(1)
    .refine(path => !path.includes('..'), 'File path cannot contain ".."'),
  /** Tool name */
  toolName: z
    .string()
    .regex(
      /^[a-z][a-z0-9-]*[a-z0-9]$/,
      'Tool name must be lowercase, start with letter, and contain only letters, numbers, and hyphens'
    )
};

/**
 * Tool parameter validation schema builder
 */
export class ToolSchemaBuilder<T extends Record<string, z.ZodTypeAny>> {
  private schema: Partial<Record<keyof T, z.ZodTypeAny>> = {};

  /**
   * Add required field
   */
  required<K extends keyof T>(
    name: K,
    schema: z.ZodTypeAny
  ): ToolSchemaBuilder<T> {
    this.schema[name] = schema;
    return this;
  }

  /**
   * Add optional field
   */
  optional<K extends keyof T>(
    name: K,
    schema: z.ZodTypeAny
  ): ToolSchemaBuilder<T> {
    this.schema[name] = schema.optional();
    return this;
  }

  /**
   * Add field with default value
   */
  withDefault<K extends keyof T>(
    name: K,
    schema: z.ZodTypeAny,
    defaultValue: z.input<z.ZodTypeAny>
  ): ToolSchemaBuilder<T> {
    this.schema[name] = schema.default(() => defaultValue);
    return this;
  }

  /**
   * Build final validation schema
   */
  build(): z.ZodObject<Record<keyof T, z.ZodTypeAny>> {
    return z.object(this.schema as Record<keyof T, z.ZodTypeAny>);
  }
}
