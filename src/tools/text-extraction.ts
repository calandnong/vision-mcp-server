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
import { TEXT_EXTRACTION_PROMPT } from '../prompts/text-extraction.js';

/**
 * Text Extraction service - OCR text extraction from screenshots
 */
class TextExtractionService extends BaseImageAnalysisService {
  /**
   * Extract text from screenshot
   */
  async extractText(
    imageSource: string,
    userPrompt: string,
    programmingLanguage?: string
  ): Promise<string> {
    console.info('Starting text extraction', {
      imageSource,
      prompt: userPrompt,
      programmingLanguage
    });

    // Validate prompt
    this.validatePrompt(userPrompt, 'text-extraction');

    // If programming language is provided, enhance the prompt
    let enhancedPrompt = userPrompt;
    if (programmingLanguage && programmingLanguage.trim()) {
      enhancedPrompt = `${userPrompt}\n\n<language_hint>The code is in ${programmingLanguage}.</language_hint>`;
    }

    // Process image
    const imageContent = await this.processImageSource(imageSource);

    // Execute analysis
    return await this.executeVisionAnalysis(
      TEXT_EXTRACTION_PROMPT,
      enhancedPrompt,
      [imageContent],
      'text-extraction'
    );
  }
}

/**
 * Register Text Extraction tool with MCP server
 */
export function registerTextExtractionTool(server: any): void {
  const service = new TextExtractionService();
  const retryableExtract = withRetry(service.extractText.bind(service), 2, 1000);

  server.tool(
    'extract_text_from_screenshot',
    `Extract and recognize text from screenshots using advanced OCR capabilities.`,
    {
      image_source: z
        .string()
        .min(1, 'Image source cannot be empty')
        .describe('Local file path or remote URL to the image containing text to extract'),
      prompt: z
        .string()
        .min(1, 'Prompt cannot be empty')
        .describe('Instructions for text extraction - describe what text to extract or any special requirements'),
      programming_language: z
        .string()
        .optional()
        .describe('Optional hint about the programming language in the image (e.g., javascript, python, go)')
    },
    async (params: any) => {
      try {
        // Validate parameters
        const validationSchema = CommonSchemas.filePath
          ? z.object({
              image_source: CommonSchemas.filePath,
              prompt: CommonSchemas.nonEmptyString,
              programming_language: z.string().optional()
            })
          : z.object({
              image_source: CommonSchemas.nonEmptyString,
              prompt: CommonSchemas.nonEmptyString,
              programming_language: z.string().optional()
            });

        const validated = validationSchema.safeParse(params);
        if (!validated.success) {
          const errorResponse = createErrorResponse(
            `Validation failed: ${validated.error.errors?.map(e => e.message).join(', ')}`
          );
          return formatMcpResponse(errorResponse);
        }

        // Execute extraction
        const result = await retryableExtract(
          validated.data.image_source,
          validated.data.prompt,
          validated.data.programming_language
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
