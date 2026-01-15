# Vision MCP Server

A Model Context Protocol (MCP) server that provides image analysis capabilities using OpenAI API.

## Available Tools

The server provides specialized tools for different image analysis tasks:

### Image Analysis Tools

1. **`ui_to_artifact`** - Convert UI screenshots to various artifacts
   - Generate frontend code from design mockups
   - Create AI prompts for UI generation
   - Extract design specification documents
   - Generate natural language descriptions of UIs

2. **`extract_text_from_screenshot`** - OCR text extraction
   - Extract code from screenshots (maintaining correct formatting)
   - Extract terminal output and logs
   - Extract documentation and text content
   - Support programming language hints for improved accuracy

3. **`diagnose_error_screenshot`** - Error diagnosis and troubleshooting
   - Analyze error messages and stack traces
   - Identify root causes
   - Provide actionable solutions
   - Suggest prevention strategies

4. **`understand_technical_diagram`** - Technical diagram analysis
   - Analyze architecture diagrams
   - Understand flowcharts and UML diagrams
   - Explain ER diagrams and sequence diagrams
   - Identify design patterns

5. **`analyze_data_visualization`** - Data visualization insights
   - Extract insights from charts
   - Identify trends and patterns
   - Detect anomalies
   - Provide business impact analysis

6. **`ui_diff_check`** - UI comparison check (visual regression testing)
   - Compare expected vs actual UI implementations
   - Identify visual differences
   - Provide detailed difference reports
   - Prioritize issues by severity

7. **`analyze_image`** - General image analysis (fallback tool)
   - Use when specialized tools are not applicable
   - Flexibly understand any visual content
   - Comprehensive image description and analysis

## Environment Variables

### OpenAI API Variables
- `OPENAI_API_KEY` or `VISION_MCP_API_KEY` - Your API key (required)
- `OPENAI_BASE_URL` or `VISION_MCP_API_URL` - API base URL (optional, default: https://api.openai.com/v1)
- `OPENAI_VISION_MODEL` or `VISION_MCP_MODEL` - Vision model name (optional, default: gpt-4o)
- `OPENAI_MODEL_TEMPERATURE` or `VISION_MCP_TEMPERATURE` - Model temperature (optional, default: 0.7)
- `OPENAI_MODEL_TOP_P` or `VISION_MCP_TOP_P` - Top P parameter (optional, default: 1.0)
- `OPENAI_MODEL_MAX_TOKENS` or `VISION_MCP_MAX_TOKENS` - Maximum tokens (optional, default: 2048)
- `OPENAI_TIMEOUT` or `VISION_MCP_TIMEOUT` - Request timeout in ms (optional, default: 60000)
- `OPENAI_RETRY_COUNT` - Retry count (optional, default: 1)

### Server Variables
- `SERVER_NAME` or `VISION_MCP_SERVER_NAME` - Server name (optional, default: vision-mcp-server)
- `SERVER_VERSION` or `VISION_MCP_SERVER_VERSION` - Server version (optional, default: 0.1.0)

Note: `VISION_MCP_*` environment variables take precedence over `OPENAI_*` variables when both are set.

## Installation

### Install from npm

```bash
npm i @vision/mcp-server
```

### Local Development

```bash
# Clone or download project
git clone <repository-url>
cd vision-mcp-server

# Install dependencies
npm install

# Build project
npm run build

# Start server
npm start
```

## Usage

### Using this MCP Server in Claude Code

```shell
claude mcp add vision-mcp-server --env OPENAI_API_KEY=your_api_key -- npx -y "@vision/mcp-server"
```

### Using MCP Inspector for Testing

MCP Inspector is a powerful GUI tool for testing and debugging MCP servers.

#### Start Inspector (Build Mode)

```bash
# First build the project
npm run build

# Start inspector with built version
npm run inspector
```

#### Start Inspector (Development Mode)

```bash
# Start inspector with tsx (watch mode enabled)
npm run inspector:dev
```

#### Configure Environment Variables

Before running inspector, set your OpenAI API key:

```bash
# Option 1: Set directly in terminal
export VISION_MCP_API_KEY="sk-your-openai-api-key"

# Option 2: Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env and add your API key
```

#### Using Inspector

1. Inspector will open in your browser (usually at http://localhost:5173)
2. You'll see all available tools listed on the left panel
3. Click on any tool to see its schema and description
4. Enter parameters in the form fields
5. Click "Call Tool" to execute
6. View results in the response panel

### Environment Variables Configuration

```bash
# For OpenAI API
export VISION_MCP_API_KEY="sk-your-openai-key"
export VISION_MCP_API_URL="https://api.openai.com/v1"
export VISION_MCP_MODEL="gpt-4o"

# For Zhipu AI API (智谱 AI)
export VISION_MCP_API_KEY="your-zhipu-ai-key"
export VISION_MCP_API_URL="https://open.bigmodel.cn/api/paas/v4/chat/completions"
export VISION_MCP_MODEL="glm-4v"

# Start server
npm start
```

Note: You can also use `OPENAI_*` environment variables if you prefer. `VISION_MCP_*` variables take precedence.

## Supported Models

- `gpt-4o` - OpenAI's latest multimodal model (recommended)
- `gpt-4o-mini` - Lightweight multimodal model
- `gpt-4-turbo` - High-performance multimodal model
- `gpt-4-vision-preview` - Vision preview model

## Tech Stack

- Development Language: TypeScript 5.9.2
- Testing Framework: Vitest
- Core Dependencies: @modelcontextprotocol/sdk (1.17.5), zod (3.23.8)
- Node.js Version: >= 18.0.0

## Architecture Design

The project uses a layered architecture design with clear structure:

- **Entry Layer**: index.ts - MCP Server startup entry
- **Core Services Layer** (core/):
  - environment.ts - Environment configuration management (OpenAI format)
  - chat-service.ts - OpenAI API invocation service
  - file-service.ts - File operations service (image only, video methods removed)
  - api-common.ts - API common functions (video function removed)
  - base-image-service.ts - Image analysis base class
  - error-handler.ts - Error handling system
- **Tools Layer** (tools/) - 7 image analysis tools
- **Prompts Layer** (prompts/) - AI prompt templates
- **Utilities Layer** (utils/) - Logging and validation utilities
- **Types Layer** (types/) - Error type definitions

## Development

```bash
# Install dependencies
npm install

# Development mode (with tsx watch)
npm run dev

# Build
npm run build

# Run tests
npm test

# Run tests with coverage report
npm run test:coverage
```

## Project Structure

```
vision-mcp-server/
├── src/
│   ├── index.ts                      # MCP Server entry
│   ├── core/
│   │   ├── environment.ts           # Environment config service (OpenAI)
│   │   ├── chat-service.ts          # OpenAI API invocation
│   │   ├── file-service.ts          # File operations (no video methods)
│   │   ├── api-common.ts            # API common functions (no video function)
│   │   ├── base-image-service.ts    # Image analysis base class
│   │   └── error-handler.ts         # Error handling
│   ├── tools/                       # 7 image analysis tools
│   ├── prompts/                     # Prompt templates
│   ├── types/                       # Type definitions
│   └── utils/                       # Utilities
├── tests/                           # Vitest tests
├── package.json                     # Project configuration
├── tsconfig.json                    # TS configuration
├── vitest.config.ts                # Vitest configuration
└── README.zh-CN.md                   # Chinese documentation
```

## Key Changes from Original Project

1. **Feature Removal**
   - ✅ Removed video analysis tool (`analyze_video`)
   - ✅ Removed all video-related code
   - ✅ Retained 7 image analysis tools

2. **API Transformation**
   - ✅ Transformed from Zhipu AI API to OpenAI API format
   - ✅ Simplified environment variables (OPENAI_* replacing Z_AI_*)
   - ✅ Removed Zhipu-specific request headers and parameters (`thinking`, `X-Title`)
   - ✅ Improved interface compatibility

3. **Architecture Preservation**
   - ✅ Maintained the original excellent architecture design
   - ✅ Maintained code quality and maintainability
   - ✅ Maintained modular design

## License

Apache-2.0

## Contributing

Issues and Pull Requests are welcome!
