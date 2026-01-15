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
import { DIAGRAM_UNDERSTANDING_PROMPT } from '../prompts/diagram-analysis.js';

/**
 * Diagram Analysis service - Analyze technical diagrams
 */
class DiagramAnalysisService extends BaseImageAnalysisService {
  /**
   * Analyze technical diagram
   */
  async analyzeDiagram(
    imageSource: string,
    userPrompt: string,
    diagramType?: string
  ): Promise<string> {
    console.info('Starting diagram analysis', {
      imageSource,
      prompt: userPrompt,
      diagramType
    });

    // Validate prompt
    this.validatePrompt(userPrompt, 'diagram-analysis');

    // If diagram type is provided, enhance the prompt
    let enhancedPrompt = userPrompt;
    if (diagramType && diagramType.trim()) {
      enhancedPrompt = `${userPrompt}\n\n<diagram_type_hint>This is a ${diagramType} diagram.</diagram_type_hint>`;
    }

    // Process image
    const imageContent = await this.processImageSource(imageSource);

    // Execute analysis
    return await this.executeVisionAnalysis(
      DIAGRAM_UNDERSTANDING_PROMPT,
      enhancedPrompt,
      [imageContent],
      'diagram-analysis'
    );
  }
}

/**
 * Register Diagram Analysis tool with MCP server
 */
export function registerDiagramAnalysisTool(server: any): void {
  const service = new DiagramAnalysisService();
  const retryableAnalyze = withRetry(service.analyzeDiagram.bind(service), 2, 1000);

  server.tool(
    'understand_technical_diagram',
    `Analyze and explain technical diagrams including architecture diagrams, flowcharts, UML, ER diagrams.`,
    {
      image_source: z
        .string()
        .min(1, 'Image source cannot be empty')
        .describe('Local file path or remote URL to the technical diagram'),
      prompt: z
        .string()
        .min(1, 'Prompt cannot be empty')
        .describe('What you want to understand or extract from the diagram'),
      diagram_type: z
        .string()
        .optional()
        .describe('Diagram type hint (architecture, flowchart, uml, er-diagram, sequence)')
    },
    async (params: any) => {
      try {
        // Validate parameters
        const validationSchema = CommonSchemas.filePath
          ? z.object({
              image_source: CommonSchemas.filePath,
              prompt: CommonSchemas.nonEmptyString,
              diagram_type: z.string().optional()
            })
          : z.object({
              image_source: CommonSchemas.nonEmptyString,
              prompt: CommonSchemas.nonEmptyString,
              diagram_type: z.string().optional()
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
          validated.data.diagram_type
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
