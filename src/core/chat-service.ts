import { ApiError } from '../types/index.js';
import { configurationService } from './environment.js';
import { EnvironmentService } from './environment.js';

/**
 * OpenAI API request interface
 */
interface OpenAIChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  temperature: number;
  top_p: number;
  max_tokens: number;
  stream: boolean;
}

/**
 * OpenAI API response interface
 */
interface OpenAIChatResponse {
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

/**
 * OpenAI API service implementation
 */
export class ChatService {
  private environmentService: EnvironmentService;

  constructor(environmentService = EnvironmentService.getInstance()) {
    this.environmentService = environmentService;
  }

  /**
   * OpenAI chat completions API for vision analysis
   */
  async visionCompletions(
    messages: OpenAIChatRequest['messages']
  ): Promise<string> {
    const visionConfig = configurationService.getVisionConfig();
    const apiKey = this.environmentService.getApiKey();

    const requestBody: OpenAIChatRequest = {
      model: visionConfig.model,
      messages,
      temperature: visionConfig.temperature,
      top_p: visionConfig.topP,
      max_tokens: visionConfig.maxTokens,
      stream: false
    };

    console.info('Requesting OpenAI chat completions API for vision analysis', {
      model: visionConfig.model,
      messageCount: messages.length
    });

    try {
      const response = await this.chatCompletions(
        visionConfig.url,
        requestBody,
        apiKey
      );
      const result = response.choices?.[0]?.message?.content;

      if (!result) {
        throw new ApiError('Invalid API response: missing content');
      }

      console.info('OpenAI chat completions API request successful');
      return result;
    } catch (error) {
      console.error('OpenAI chat completions API request failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error instanceof ApiError
        ? error
        : new ApiError(`API call failed: ${error}`);
    }
  }

  /**
   * Make HTTP request to OpenAI API with proper headers and error handling
   */
  private async chatCompletions(
    url: string,
    body: OpenAIChatRequest,
    apiKey: string
  ): Promise<OpenAIChatResponse> {
    const apiConfig = configurationService.getVisionConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json() as OpenAIChatResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError(
            `Request timeout after ${apiConfig.timeout}ms when calling ${url}`
          );
        }

        if (error.message.includes('fetch failed')) {
          const causeInfo = error.cause ? ` | Cause: ${error.cause}` : '';
          throw new ApiError(
            `Network error: Failed to connect to ${url}. ` +
              `Original error: ${error.message}${causeInfo}`
          );
        }

        throw new ApiError(`Network error: ${error.message}`);
      }

      throw new ApiError(`Network error: ${String(error)}`);
    }
  }
}

/**
 * OpenAI API chat completions service instance
 */
export const chatService = new ChatService();
