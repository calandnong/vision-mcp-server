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
import { UI_DIFF_CHECK_PROMPT } from '../prompts/ui-diff.js';

/**
 * UI Diff Check service - Compare two UI screenshots
 */
class UiDiffCheckService extends BaseImageAnalysisService {
  /**
   * Compare two UI screenshots
   */
  async compareUiScreenshots(
    expectedImageSource: string,
    actualImageSource: string,
    userPrompt: string
  ): Promise<string> {
    console.info('Starting UI diff check', {
      expectedImageSource,
      actualImageSource,
      prompt: userPrompt
    });

    // Validate prompt
    this.validatePrompt(userPrompt, 'ui-diff-check');

    // Enhance the prompt to clarify which is expected vs actual
    const enhancedPrompt = `<images>
The first image is EXPECTED/REFERENCE design (the target).
The second image is ACTUAL/CURRENT implementation (what needs to be checked).
</images>

${userPrompt}`;

    // Process both images
    const imageContents = await this.processMultipleImageSources([
      expectedImageSource,
      actualImageSource
    ]);

    // Execute analysis
    return await this.executeVisionAnalysis(
      UI_DIFF_CHECK_PROMPT,
      enhancedPrompt,
      imageContents,
      'ui-diff-check'
    );
  }
}

/**
 * Register UI Diff Check tool with MCP server
 */
export function registerUiDiffCheckTool(server: any): void {
  const service = new UiDiffCheckService();
  const retryableCompare = withRetry(service.compareUiScreenshots.bind(service), 2, 1000);

  server.tool(
    'ui_diff_check',
    `Compare two UI screenshots to identify visual differences and implementation discrepancies.`,
    {
      expected_image_source: z
        .string()
        .min(1, 'Expected image source cannot be empty')
        .describe('Local file path or remote URL to the expected/reference image'),
      actual_image_source: z
        .string()
        .min(1, 'Actual image source cannot be empty')
        .describe('Local file path or remote URL to the actual implementation image'),
      prompt: z
        .string()
        .min(1, 'Prompt cannot be empty')
        .describe('Instructions for comparison')
    },
    async (params: any) => {
      try {
        // Validate parameters
        const validationSchema = CommonSchemas.filePath
          ? z.object({
              expected_image_source: CommonSchemas.filePath,
              actual_image_source: CommonSchemas.filePath,
              prompt: CommonSchemas.nonEmptyString
            })
          : z.object({
              expected_image_source: CommonSchemas.nonEmptyString,
              actual_image_source: CommonSchemas.nonEmptyString,
              prompt: CommonSchemas.nonEmptyString
            });

        const validated = validationSchema.safeParse(params);
        if (!validated.success) {
          const errorResponse = createErrorResponse(
            `Validation failed: ${validated.error.errors?.map(e => e.message).join(', ')}`
          );
          return formatMcpResponse(errorResponse);
        }

        // Execute comparison
        const result = await retryableCompare(
          validated.data.expected_image_source,
          validated.data.actual_image_source,
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
