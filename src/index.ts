#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { configurationService } from './core/environment.js';
import { handleError } from './core/error-handler.js';
import { setupConsoleRedirection } from './utils/logger.js';

// Import tool registration functions
import { registerUiToArtifactTool } from './tools/ui-to-artifact.js';
import { registerTextExtractionTool } from './tools/text-extraction.js';
import { registerErrorDiagnosisTool } from './tools/error-diagnosis.js';
import { registerDiagramAnalysisTool } from './tools/diagram-analysis.js';
import { registerDataVizAnalysisTool } from './tools/data-viz.js';
import { registerUiDiffCheckTool } from './tools/ui-diff.js';
import { registerGeneralImageAnalysisTool } from './tools/general-image.js';

/**
 * MCP Server Application class
 */
class McpServerApplication {
  private server: McpServer;

  constructor() {
    this.server = new McpServer(
      {
        name: configurationService.getServerConfig().name,
        version: configurationService.getServerConfig().version
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
    this.setupErrorHandling();
    console.info('MCP Server Application initialized');
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Note: McpServer from @modelcontextprotocol/sdk does not have onerror property
    // Error handling is managed by the server internally

    process.on('SIGINT', () => {
      console.info('Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });
  }

  /**
   * Register all tools
   */
  async registerTools(): Promise<void> {
    try {
      // Register specialized image analysis tools (7 tools)
      registerUiToArtifactTool(this.server);
      registerTextExtractionTool(this.server);
      registerErrorDiagnosisTool(this.server);
      registerDiagramAnalysisTool(this.server);
      registerDataVizAnalysisTool(this.server);
      registerUiDiffCheckTool(this.server);
      registerGeneralImageAnalysisTool(this.server);

      console.info('Successfully registered all image analysis tools (7 tools)');
    } catch (error) {
      const standardError = await handleError(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'tool-registration',
          metadata: { component: 'McpServerApplication' }
        }
      );
      console.error('Failed to register tools', standardError);
      throw standardError;
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      await this.registerTools();

      console.info('Starting Vision MCP Server...', {
        name: configurationService.getServerConfig().name,
        version: configurationService.getServerConfig().version
      });

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.info('Vision MCP Server is running');
    } catch (error) {
      const standardError = await handleError(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'server-start',
          metadata: { component: 'McpServerApplication' }
        }
      );
      console.error('Failed to start server', standardError);
      throw standardError;
    }
  }

  /**
   * Shutdown the server
   */
  private async shutdown(): Promise<void> {
    try {
      await this.server.close();
      console.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown', { error });
      process.exit(1);
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Setup console redirection BEFORE any other code to prevent stdout pollution
  setupConsoleRedirection();

  const app = new McpServerApplication();
  await app.start();
}

// Start the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
