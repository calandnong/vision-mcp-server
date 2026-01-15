---
name: vision-mcp-server-implementation-plan
overview: 创建基于 TypeScript 和 Vitest 的 Vision MCP Server，去除视频功能并将智谱 API 改造为 OpenAI API 格式
todos:
  - id: init-project
    content: 创建 TypeScript 项目结构和配置文件（tsconfig.json, vitest.config.ts, package.json）
    status: completed
  - id: transform-environment
    content: 改造 environment.ts 为 OpenAI API 格式（OPENAI_* 环境变量）
    status: completed
    dependencies:
      - init-project
  - id: transform-chat-service
    content: 改造 chat-service.ts 使用标准 OpenAI API 格式
    status: completed
    dependencies:
      - init-project
  - id: transform-file-service
    content: 改造 file-service.ts 删除所有视频相关方法
    status: completed
    dependencies:
      - init-project
  - id: transform-api-common
    content: 改造 api-common.ts 删除 createVideoContent 函数
    status: completed
    dependencies:
      - init-project
  - id: transform-tools
    content: 使用 [subagent:code-explorer] 分析现有工具结构，转换并注册 7 个图像分析工具
    status: completed
    dependencies:
      - transform-file-service
      - transform-api-common
  - id: update-entry
    content: 更新 index.ts 移除视频工具注册和导入
    status: completed
    dependencies:
      - transform-tools
  - id: update-docs
    content: 更新 package.json 和 README 文档
    status: completed
    dependencies:
      - update-entry
---

## Product Overview

基于 TypeScript 和 Vitest 的 Vision MCP Server，移除视频分析功能，将智谱 API 改造为标准 OpenAI API 格式，提供专注的图像分析能力。

## Core Features

- 保留 7 个图像分析工具：UI 转代码、文字提取、错误诊断、图表分析、数据可视化分析、UI 差异检查、通用图像分析
- 移除所有视频分析功能和相关代码
- 使用 OpenAI API（gpt-4o 模型）替代智谱 API
- 简化环境变量配置（OPENAI_ *替代 Z_AI_*）
- 完整的 TypeScript 开发环境和 Vitest 测试框架
- 保持原有的优秀架构设计和代码质量

## Tech Stack

- 开发语言：TypeScript 5.9.2
- 测试框架：Vitest
- 核心依赖：@modelcontextprotocol/sdk (1.17.5), zod (3.23.8)
- Node.js 版本：>= 18.0.0

## Architecture Design

### System Architecture

采用分层架构设计，保持原项目的清晰结构：

- **入口层**：index.ts - MCP Server 启动入口
- **核心服务层**（core/）：
- environment.ts - 环境配置管理（改造为 OpenAI 格式）
- chat-service.ts - OpenAI API 调用服务
- file-service.ts - 文件操作服务（移除视频方法）
- api-common.ts - API 公共函数（移除视频函数）
- base-image-service.ts - 图像分析基类
- error-handler.ts - 错误处理系统
- **工具层**（tools/）- 7 个图像分析工具
- **提示词层**（prompts/）- AI 提示词模板
- **工具函数层**（utils/）- 日志和验证工具
- **类型定义层**（types/）- 错误类型定义

### Data Flow

```
MCP Client -> Tool Call -> Tool Service -> FileService -> ChatService -> OpenAI API
                                                      -> Response -> MCP Client
```

## Implementation Details

### Core Directory Structure

```
vision-mcp-server/
├── src/
│   ├── index.ts                      # MCP Server 入口
│   ├── core/
│   │   ├── environment.ts           # 环境配置服务（OpenAI）
│   │   ├── chat-service.ts          # OpenAI API 调用
│   │   ├── file-service.ts          # 文件操作（移除视频）
│   │   ├── api-common.ts            # API 公共函数（移除视频）
│   │   ├── base-image-service.ts    # 图像分析基类
│   │   └── error-handler.ts         # 错误处理
│   ├── tools/                       # 7 个图像分析工具
│   ├── prompts/                     # 提示词模板
│   ├── types/                       # 类型定义
│   └── utils/                       # 工具函数
├── tests/                           # Vitest 测试
├── package.json                     # 项目配置
├── tsconfig.json                    # TS 配置
├── vitest.config.ts                # Vitest 配置
└── README.md                       # 文档
```

### Key Code Structures

**EnvironmentService 配置接口**：

```typescript
interface EnvironmentConfig {
  OPENAI_API_KEY: string;              // OpenAI API Key
  OPENAI_BASE_URL: string;             // 默认: https://api.openai.com/v1
  OPENAI_VISION_MODEL: string;         // 默认: gpt-4o
  OPENAI_MODEL_TEMPERATURE: number;    // 默认: 0.8
  OPENAI_MODEL_TOP_P: number;          // 默认: 0.6
  OPENAI_MODEL_MAX_TOKENS: number;     // 默认: 32768
  OPENAI_TIMEOUT: number;             // 默认: 300000
  OPENAI_RETRY_COUNT: number;         // 默认: 1
  SERVER_NAME: string;                 // 默认: vision-mcp-server
  SERVER_VERSION: string;             // 默认: 0.1.0
}
```

**OpenAI API 请求格式**：

```typescript
interface OpenAIChatRequest {
  model: string;
  messages: Message[];
  temperature: number;
  top_p: number;
  max_tokens: number;
  stream: boolean;
}
```

**移除的方法**：

- FileService.validateVideoSource()
- FileService.encodeVideoToBase64()
- FileService.getVideoMimeType()
- ApiCommon.createVideoContent()
- video-analysis.ts 工具及其注册

### Technical Implementation Plan

#### 1. TypeScript 项目初始化

- 创建 src/ 目录结构
- 配置 tsconfig.json（ESM 模块，严格类型检查）
- 配置 vitest.config.ts（测试环境设置）

#### 2. 环境配置改造

- 重命名环境变量：Z_AI_ *→ OPENAI_*
- 移除平台模式选择逻辑
- 设置默认值：baseURL=https://api.openai.com/v1, model=gpt-4o
- 添加 API Key 占位符验证

#### 3. ChatService 改造

- 移除智谱特有参数：thinking、X-Title 请求头
- 使用标准 OpenAI API 端点
- 更新错误消息为 OpenAI 相关

#### 4. FileService 改造

- 删除所有视频相关方法
- 保留图像验证、编码、MIME 类型获取方法

#### 5. ApiCommon 改造

- 删除 createVideoContent() 函数
- 保留所有图像相关函数

#### 6. 工具注册更新

- 删除 video-analysis.ts 导入
- 删除 registerVideoAnalysisTool() 调用
- 保留 7 个图像工具注册

#### 7. 测试框架配置

- 配置 Vitest 环境变量 mock
- 编写环境配置、ChatService、FileService 单元测试

## Technical Considerations

### Performance Optimization

- 使用 AbortController 实现请求超时
- 支持图像大小限制（最大 20MB）
- 简化配置加载逻辑，减少初始化时间

### Security Measures

- API Key 占位符检测（防止使用 placeholder key）
- 环境变量验证和类型转换
- 错误信息脱敏，避免泄露敏感数据

### Scalability

- 保持模块化架构，易于添加新工具
- 支持自定义 OpenAI 兼容的 API 端点
- 类型安全的 TypeScript 代码，便于维护

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 用于搜索和分析现有编译后的 JS 代码结构，理解工具实现细节
- Expected outcome: 快速定位需要改造的代码模块，理解工具注册和服务调用关系