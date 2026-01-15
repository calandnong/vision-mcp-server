import { ToolExecutionError } from './error-handler.js';
import { createMultiModalMessage, createImageContent } from './api-common.js';
import { fileService } from './file-service.js';
import { chatService } from './chat-service.js';
import { MultimodalContent } from './api-common.js';

/**
 * Base image analysis service providing shared functionality
 * for all specialized image analysis tools
 */
export class BaseImageAnalysisService {
  protected chatService = chatService;
  protected fileService = fileService;
  protected MAX_IMAGE_SIZE_MB = 20; // Updated to 20MB for OpenAI

  /**
   * Process image source and validate it
   * @param imageSource Image file path or URL
   * @returns Processed image content for API
   */
  protected async processImageSource(
    imageSource: string
  ): Promise<MultimodalContent> {
    // Validate image source and size
    await this.fileService.validateImageSource(
      imageSource,
      this.MAX_IMAGE_SIZE_MB
    );

    // Handle image source (URL or local file)
    if (this.fileService.isUrl(imageSource)) {
      // For URLs, pass directly without base64 encoding
      return createImageContent(imageSource);
    } else {
      // For local files, encode to base64
      const imageData = await this.fileService.encodeImageToBase64(imageSource);
      return createImageContent(imageData);
    }
  }

  /**
   * Process multiple image sources (for tools like UI diff)
   * @param imageSources Array of image file paths or URLs
   * @returns Array of processed image content objects
   */
  protected async processMultipleImageSources(
    imageSources: string[]
  ): Promise<MultimodalContent[]> {
    const imageContents: MultimodalContent[] = [];
    for (const imageSource of imageSources) {
      const imageContent = await this.processImageSource(imageSource);
      imageContents.push(imageContent);
    }
    return imageContents;
  }

  /**
   * Execute vision analysis with a system prompt
   * @param systemPrompt System-level instructions for AI
   * @param userPrompt User's specific request
   * @param imageContents Array of processed image content
   * @param toolName Name of calling tool (for error context)
   * @returns Analysis result
   */
  protected async executeVisionAnalysis(
    systemPrompt: string,
    userPrompt: string,
    imageContents: MultimodalContent[],
    toolName: string
  ): Promise<string> {
    try {
      // Create multimodal message with system context
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...createMultiModalMessage(imageContents, userPrompt)
      ];

      const result = await this.chatService.visionCompletions(messages);
      console.info(`${toolName} analysis completed successfully`);
      return result;
    } catch (error) {
      console.error(`${toolName} analysis failed`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new ToolExecutionError(
        `${toolName} analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        toolName,
        'EXECUTION_ERROR',
        {
          toolName,
          operation: 'executeVisionAnalysis',
          metadata: { originalError: error }
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate that a prompt is not empty
   * @param prompt Prompt to validate
   * @param toolName Name of calling tool
   */
  protected validatePrompt(prompt: string, toolName: string): void {
    if (!prompt || prompt.trim().length === 0) {
      throw new ToolExecutionError(
        'Prompt is required for image analysis',
        toolName,
        'VALIDATION_ERROR',
        {
          toolName,
          operation: 'validatePrompt'
        }
      );
    }
  }
}
