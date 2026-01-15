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
import { DATA_VIZ_ANALYSIS_PROMPT } from '../prompts/data-viz.js';

/**
 * Data Visualization Analysis service - Analyze charts and dashboards
 */
class DataVizAnalysisService extends BaseImageAnalysisService {
  /**
   * Analyze data visualization
   */
  async analyzeDataViz(
    imageSource: string,
    userPrompt: string,
    analysisFocus?: string
  ): Promise<string> {
    console.info('Starting data visualization analysis', {
      imageSource,
      prompt: userPrompt,
      analysisFocus
    });

    // Validate prompt
    this.validatePrompt(userPrompt, 'data-viz-analysis');

    // If analysis focus is provided, enhance the prompt
    let enhancedPrompt = userPrompt;
    if (analysisFocus && analysisFocus.trim()) {
      enhancedPrompt = `${userPrompt}\n\n<analysis_focus>Focus particularly on: ${analysisFocus}.</analysis_focus>`;
    }

    // Process image
    const imageContent = await this.processImageSource(imageSource);

    // Execute analysis
    return await this.executeVisionAnalysis(
      DATA_VIZ_ANALYSIS_PROMPT,
      enhancedPrompt,
      [imageContent],
      'data-viz-analysis'
    );
  }
}

/**
 * Register Data Visualization Analysis tool with MCP server
 */
export function registerDataVizAnalysisTool(server: any): void {
  const service = new DataVizAnalysisService();
  const retryableAnalyze = withRetry(service.analyzeDataViz.bind(service), 2, 1000);

  server.tool(
    'analyze_data_visualization',
    `Analyze data visualizations, charts, graphs, and dashboards to extract insights and trends.`,
    {
      image_source: z
        .string()
        .min(1, 'Image source cannot be empty')
        .describe('Local file path or remote URL to the data visualization'),
      prompt: z
        .string()
        .min(1, 'Prompt cannot be empty')
        .describe('What insights or information you want to extract'),
      analysis_focus: z
        .string()
        .optional()
        .describe('Focus area (trends, anomalies, comparisons, performance metrics)')
    },
    async (params: any) => {
      try {
        // Validate parameters
        const validationSchema = CommonSchemas.filePath
          ? z.object({
              image_source: CommonSchemas.filePath,
              prompt: CommonSchemas.nonEmptyString,
              analysis_focus: z.string().optional()
            })
          : z.object({
              image_source: CommonSchemas.nonEmptyString,
              prompt: CommonSchemas.nonEmptyString,
              analysis_focus: z.string().optional()
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
          validated.data.prompt,
          validated.data.analysis_focus
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
