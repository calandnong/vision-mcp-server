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
import { UI_TO_ARTIFACT_PROMPTS } from '../prompts/ui-to-artifact.js';

/**
 * UI to Artifact service - Convert UI screenshots to various artifacts
 */
class UiToArtifactService extends BaseImageAnalysisService {
  /**
   * Convert UI screenshot to specified artifact type
   */
  async convertUiToArtifact(
    imageSource: string,
    outputType: string,
    userPrompt: string
  ): Promise<string> {
    console.info('Starting UI to artifact conversion', {
      imageSource,
      outputType,
      prompt: userPrompt
    });

    // Validate output type
    const normalizedType = outputType.toLowerCase();
    const systemPrompt = UI_TO_ARTIFACT_PROMPTS[normalizedType as keyof typeof UI_TO_ARTIFACT_PROMPTS];

    if (!systemPrompt) {
      throw new ValidationError(
        `Invalid output_type '${outputType}'. Must be one of: code, prompt, spec, description`
      );
    }

    // Validate prompt
    this.validatePrompt(userPrompt, 'ui-to-artifact');

    // Process image
    const imageContent = await this.processImageSource(imageSource);

    // Execute analysis
    return await this.executeVisionAnalysis(
      systemPrompt,
      userPrompt,
      [imageContent],
      'ui-to-artifact'
    );
  }
}

/**
 * Register UI to Artifact tool with MCP server
 */
export function registerUiToArtifactTool(server: any): void {
  const service = new UiToArtifactService();
  const retryableConvert = withRetry(
    service.convertUiToArtifact.bind(service),
    2,
    1000
  );

  server.tool(
    'ui_to_artifact',
    `Convert UI screenshots into various artifacts: code, prompts, design specifications, or descriptions.

Use this tool ONLY when user wants to:
- Generate frontend code from UI design (output_type='code')
- Create AI prompts for UI generation (output_type='prompt')
- Extract design specifications (output_type='spec')
- Generate UI descriptions (output_type='description')

Supported output types:
- code: Production-ready HTML + CSS with semantic structure
- prompt: Detailed AI prompt for recreating the UI
- spec: Comprehensive design system documentation
- description: Natural language UI analysis`,
    {
      image_source: z
        .string()
        .min(1, 'Image source cannot be empty')
        .describe('Local file path or remote URL to the UI screenshot'),
      output_type: z
        .enum(['code', 'prompt', 'spec', 'description'], {
          message: 'output_type must be one of: code, prompt, spec, description'
        })
        .describe('Type of artifact to generate from the UI'),
      prompt: z
        .string()
        .min(1, 'Prompt cannot be empty')
        .describe('Detailed instructions describing what to generate')
    },
    async (params: any) => {
      try {
        // Validate parameters
        const validationSchema = CommonSchemas.filePath
          ? z.object({
              image_source: CommonSchemas.filePath,
              output_type: z.enum([
                'code',
                'prompt',
                'spec',
                'description'
              ]),
              prompt: CommonSchemas.nonEmptyString
            })
          : z.object({
              image_source: CommonSchemas.nonEmptyString,
              output_type: z.enum([
                'code',
                'prompt',
                'spec',
                'description'
              ]),
              prompt: CommonSchemas.nonEmptyString
            });

        const validated = validationSchema.safeParse(params);
        if (!validated.success) {
          const errorResponse = createErrorResponse(
            `Validation failed: ${validated.error.errors?.map(e => e.message).join(', ')}`
          );
          return formatMcpResponse(errorResponse);
        }

        // Execute conversion
        const result = await retryableConvert(
          validated.data.image_source,
          validated.data.output_type,
          validated.data.prompt
        );

        return formatMcpResponse(createSuccessResponse(result));
      } catch (error) {
        let errorResponse;

        if (error instanceof FileNotFoundError) {
          errorResponse = createErrorResponse(
            `Image file not found: ${error.message}`
          );
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
