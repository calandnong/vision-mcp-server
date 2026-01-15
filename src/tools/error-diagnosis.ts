import { z } from 'zod';
import { FileNotFoundError, ApiError, ValidationError } from '../types/index.js';
import { CommonSchemas } from '../utils/validation.js';
import {
  formatMcpResponse,
  createSuccessResponse,
  createErrorResponse,
  withRetry
} from '../core/api-common.js';
import { BaseImageAnalysisService } from '../core/base-image-service.js';
import { ERROR_DIAGNOSIS_PROMPT } from '../prompts/error-diagnosis.js';

/**
 * Error Diagnosis service - Analyze error messages and stack traces
 */
class ErrorDiagnosisService extends BaseImageAnalysisService {
  /**
   * Diagnose error from screenshot
   */
  async diagnoseError(
    imageSource: string,
    userPrompt: string,
    context?: string
  ): Promise<string> {
    console.info('Starting error diagnosis', {
      imageSource,
      prompt: userPrompt,
      context
    });

    // Validate prompt
    this.validatePrompt(userPrompt, 'error-diagnosis');

    // If context is provided, enhance the prompt
    let enhancedPrompt = userPrompt;
    if (context && context.trim()) {
      enhancedPrompt = `${userPrompt}\n\n<error_context>This error occurred ${context}.</error_context>`;
    }

    // Process image
    const imageContent = await this.processImageSource(imageSource);

    // Execute analysis
    return await this.executeVisionAnalysis(
      ERROR_DIAGNOSIS_PROMPT,
      enhancedPrompt,
      [imageContent],
      'error-diagnosis'
    );
  }
}

/**
 * Register Error Diagnosis tool with MCP server
 */
export function registerErrorDiagnosisTool(server: any): void {
  const service = new ErrorDiagnosisService();
  const retryableDiagnose = withRetry(service.diagnoseError.bind(service), 2, 1000);

  server.tool(
    'diagnose_error_screenshot',
    `Diagnose and analyze error messages, stack traces, and exception screenshots.`,
    {
      image_source: z
        .string()
        .min(1, 'Image source cannot be empty')
        .describe('Local file path or remote URL to the error screenshot'),
      prompt: z
        .string()
        .min(1, 'Prompt cannot be empty')
        .describe('Description of what you need help with or what error you want diagnosed'),
      context: z
        .string()
        .optional()
        .describe('Additional context about when the error occurred (e.g., "when calling the API", "during deployment")')
    },
    async (params: any) => {
      try {
        // Validate parameters
        const validationSchema = CommonSchemas.filePath
          ? z.object({
              image_source: CommonSchemas.filePath,
              prompt: CommonSchemas.nonEmptyString,
              context: z.string().optional()
            })
          : z.object({
              image_source: CommonSchemas.nonEmptyString,
              prompt: CommonSchemas.nonEmptyString,
              context: z.string().optional()
            });

        const validated = validationSchema.safeParse(params);
        if (!validated.success) {
          const errorResponse = createErrorResponse(
            `Validation failed: ${validated.error.errors?.map(e => e.message).join(', ')}`
          );
          return formatMcpResponse(errorResponse);
        }

        // Execute diagnosis
        const result = await retryableDiagnose(
          validated.data.image_source,
          validated.data.prompt,
          validated.data.context
        );

        return formatMcpResponse(createSuccessResponse(result));
      } catch (error) {
        let errorResponse;

        if (error instanceof FileNotFoundError) {
          errorResponse = createErrorResponse(`Image file not found: ${error.message}`);
        } else if (error instanceof ValidationError) {
          errorResponse = createErrorResponse(`Validation error: ${error.message}`);
        } else if (error instanceof ApiError) {
          errorResponse = createErrorResponse(`API error: ${error.message}`);
        } else {
          errorResponse = createErrorResponse(
            `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        return formatMcpResponse(errorResponse);
      }
    }
  );
}
