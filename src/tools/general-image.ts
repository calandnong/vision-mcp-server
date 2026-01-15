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
import { GENERAL_IMAGE_ANALYSIS_PROMPT } from '../prompts/general-image.js';

/**
 * General Image Analysis service - General-purpose image analysis
 */
class GeneralImageAnalysisService extends BaseImageAnalysisService {
  /**
   * Analyze general image
   */
  async analyzeImage(
    imageSource: string,
    userPrompt: string
  ): Promise<string> {
    console.info('Starting general image analysis', {
      imageSource,
      prompt: userPrompt
    });

    // Validate prompt
    this.validatePrompt(userPrompt, 'general-image-analysis');

    // Process image
    const imageContent = await this.processImageSource(imageSource);

    // Execute analysis
    return await this.executeVisionAnalysis(
      GENERAL_IMAGE_ANALYSIS_PROMPT,
      userPrompt,
      [imageContent],
      'general-image-analysis'
    );
  }
}

/**
 * Register General Image Analysis tool with MCP server
 */
export function registerGeneralImageAnalysisTool(server: any): void {
  const service = new GeneralImageAnalysisService();
  const retryableAnalyze = withRetry(service.analyzeImage.bind(service), 2, 1000);

  server.tool(
    'analyze_image',
    `General-purpose image analysis for scenarios not covered by specialized tools.`,
    {
      image_source: z
        .string()
        .min(1, 'Image source cannot be empty')
        .describe('Local file path or remote URL to the image'),
      prompt: z
        .string()
        .min(1, 'Prompt cannot be empty')
        .describe('Detailed description of what you want to analyze')
    },
    async (params: any) => {
      try {
        // Validate parameters
        const validationSchema = CommonSchemas.filePath
          ? z.object({
              image_source: CommonSchemas.filePath,
              prompt: CommonSchemas.nonEmptyString
            })
          : z.object({
              image_source: CommonSchemas.nonEmptyString,
              prompt: CommonSchemas.nonEmptyString
            });

        const validated = validationSchema.safeParse(params);
        if (!validated.success) {
          const errorResponse = createErrorResponse(
            `Validation failed: ${validated.error.errors?.map(e => e.message).join(', ')}`
          );
          return formatMcpResponse(errorResponse);
        }

        // Execute analysis
        const result = await retryableAnalyze(
          validated.data.image_source,
          validated.data.prompt
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
