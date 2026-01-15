import { ApiError } from '../types/index.js';

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
  OPENAI_VISION_MODEL: string;
  OPENAI_MODEL_TEMPERATURE: number;
  OPENAI_MODEL_TOP_P: number;
  OPENAI_MODEL_MAX_TOKENS: number;
  OPENAI_TIMEOUT: number;
  OPENAI_RETRY_COUNT: number;
  SERVER_NAME: string;
  SERVER_VERSION: string;
}

/**
 * Vision configuration interface
 */
interface VisionConfig {
  model: string;
  timeout: number;
  retryCount: number;
  url: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

/**
 * Server configuration interface
 */
interface ServerConfig {
  name: string;
  version: string;
}

/**
 * Environment configuration service using singleton pattern
 */
export class EnvironmentService {
  private static instance: EnvironmentService;
  private config: EnvironmentConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance of EnvironmentService
   */
  static getInstance(): EnvironmentService {
    if (!EnvironmentService.instance) {
      EnvironmentService.instance = new EnvironmentService();
    }
    return EnvironmentService.instance;
  }

  /**
   * Get environment configuration
   */
  getConfig(): EnvironmentConfig {
    if (!this.config) {
      this.config = this.loadEnvironmentConfig();
    }
    return this.config;
  }

  /**
   * Load environment configuration from process.env
   */
  private loadEnvironmentConfig(): EnvironmentConfig {
    const envConfig = { ...process.env };

    // Support both VISION_MCP_* and OPENAI_* environment variable prefixes
    // VISION_MCP_* takes precedence
    const apiKey =
      envConfig.VISION_MCP_API_KEY ||
      envConfig.OPENAI_API_KEY ||
      '';

    // Validate required API Key
    if (!apiKey || apiKey.trim().length === 0) {
      throw new ApiError(
        'VISION_MCP_API_KEY or OPENAI_API_KEY environment variable is required'
      );
    }

    // Detect placeholder API keys
    if (
      apiKey.toLowerCase().includes('your_') ||
      apiKey.toLowerCase().includes('api_key') ||
      apiKey.toLowerCase().includes('sk-your-openai-api-key')
    ) {
      throw new ApiError(
        'API key appears to be a placeholder. Please set your actual API key.'
      );
    }

    const baseUrl =
      envConfig.VISION_MCP_API_URL ||
      envConfig.OPENAI_BASE_URL ||
      'https://api.openai.com/v1';

    const model =
      envConfig.VISION_MCP_MODEL ||
      envConfig.OPENAI_VISION_MODEL ||
      'gpt-4o';

    const temperature = parseFloat(
      envConfig.VISION_MCP_TEMPERATURE ||
      envConfig.OPENAI_MODEL_TEMPERATURE ||
      '0.7'
    );

    const topP = parseFloat(
      envConfig.VISION_MCP_TOP_P ||
      envConfig.OPENAI_MODEL_TOP_P ||
      '1.0'
    );

    const maxTokens = parseInt(
      envConfig.VISION_MCP_MAX_TOKENS ||
      envConfig.OPENAI_MODEL_MAX_TOKENS ||
      '2048'
    );

    const timeout = parseInt(
      envConfig.VISION_MCP_TIMEOUT ||
      envConfig.OPENAI_TIMEOUT ||
      '60000'
    );

    const retryCount = parseInt(
      envConfig.OPENAI_RETRY_COUNT ||
      '1'
    );

    const serverName =
      envConfig.VISION_MCP_SERVER_NAME ||
      envConfig.SERVER_NAME ||
      'vision-mcp-server';

    const serverVersion =
      envConfig.VISION_MCP_SERVER_VERSION ||
      envConfig.SERVER_VERSION ||
      '0.1.0';

    return {
      OPENAI_API_KEY: apiKey,
      OPENAI_BASE_URL: baseUrl,
      OPENAI_VISION_MODEL: model,
      OPENAI_MODEL_TEMPERATURE: temperature,
      OPENAI_MODEL_TOP_P: topP,
      OPENAI_MODEL_MAX_TOKENS: maxTokens,
      OPENAI_TIMEOUT: timeout,
      OPENAI_RETRY_COUNT: retryCount,
      SERVER_NAME: serverName,
      SERVER_VERSION: serverVersion
    };
  }

  /**
   * Get server configuration
   */
  getServerConfig(): ServerConfig {
    const config = this.getConfig();
    return {
      name: config.SERVER_NAME,
      version: config.SERVER_VERSION
    };
  }

  /**
   * Get API configuration for vision analysis
   */
  getVisionConfig(): VisionConfig {
    const config = this.getConfig();
    const baseUrl = config.OPENAI_BASE_URL;

    // Check if the base URL already includes /chat/completions
    // If so, use it directly; otherwise, append it
    const url = baseUrl.includes('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`;

    return {
      model: config.OPENAI_VISION_MODEL,
      timeout: config.OPENAI_TIMEOUT,
      retryCount: config.OPENAI_RETRY_COUNT,
      url,
      temperature: config.OPENAI_MODEL_TEMPERATURE,
      topP: config.OPENAI_MODEL_TOP_P,
      maxTokens: config.OPENAI_MODEL_MAX_TOKENS
    };
  }

  /**
   * Get OpenAI API key from configuration
   */
  getApiKey(): string {
    return this.getConfig().OPENAI_API_KEY;
  }
}

/**
 * Global environment service instance
 */
export const environmentService = EnvironmentService.getInstance();

/**
 * Configuration service instance (for backward compatibility)
 */
export const configurationService = environmentService;
