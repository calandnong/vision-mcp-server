# Vision MCP Server

一个基于 OpenAI API 提供图像分析能力的模型上下文协议 (MCP) 服务器。

## 可用工具

该服务器提供针对不同图像分析任务的专业工具：

### 图像分析工具

1. **`ui_to_artifact`** - 将 UI 截图转换为各种产物
   - 从设计稿生成前端代码
   - 创建用于 UI 重建的 AI 提示词
   - 提取设计规范文档
   - 生成 UI 的自然语言描述

2. **`extract_text_from_screenshot`** - OCR 文字提取
   - 从截图中提取代码（保持正确格式）
   - 提取终端输出和日志
   - 提取文档和文本内容
   - 支持编程语言提示以提高准确性

3. **`diagnose_error_screenshot`** - 错误诊断和故障排查
   - 分析错误消息和堆栈跟踪
   - 识别根本原因
   - 提供可操作的解决方案
   - 建议预防策略

4. **`understand_technical_diagram`** - 技术图表分析
   - 分析架构图
   - 理解流程图和 UML 图
   - 解释 ER 图和序列图
   - 识别设计模式

5. **`analyze_data_visualization`** - 数据可视化洞察
   - 从图表中提取洞察
   - 识别趋势和模式
   - 检测异常值
   - 提供业务影响分析

6. **`ui_diff_check`** - UI 对比检查（视觉回归测试）
   - 比较预期和实际的 UI 实现
   - 识别视觉差异
   - 提供详细的差异报告
   - 按严重程度排列问题优先级

7. **`analyze_image`** - 通用图像分析（兜底工具）
   - 当专业工具不适用时使用
   - 灵活理解任何视觉内容
   - 全面的图像描述和分析

## 环境变量

- `OPENAI_API_KEY` - 您的 OpenAI API 密钥（必需）
- `OPENAI_BASE_URL` - OpenAI API 基础 URL（可选，默认: https://api.openai.com/v1）
- `OPENAI_VISION_MODEL` - 视觉模型名称（可选，默认: gpt-4o）
- `OPENAI_MODEL_TEMPERATURE` - 模型温度（可选，默认: 0.8）
- `OPENAI_MODEL_TOP_P` - Top P 参数（可选，默认: 0.6）
- `OPENAI_MODEL_MAX_TOKENS` - 最大 tokens（可选，默认: 32768）
- `OPENAI_TIMEOUT` - 请求超时时间 ms（可选，默认: 300000）
- `OPENAI_RETRY_COUNT` - 重试次数（可选，默认: 1）

## 安装

### 从 npm 安装

```bash
npm i @vision/mcp-server
```

### 本地开发

```bash
# 克隆或下载项目
git clone <repository-url>
cd vision-mcp-server

# 安装依赖
npm install

# 编译项目
npm run build

# 启动服务器
npm start
```

## 使用方法

### 在 Claude Code 中使用此 MCP 服务器

```shell
claude mcp add vision-mcp-server --env OPENAI_API_KEY=your_api_key -- npx -y "@vision/mcp-server"
```

### 环境变量配置

```bash
# 设置 OpenAI API Key
export OPENAI_API_KEY="sk-your-openai-key"

# 可选：自定义模型
export OPENAI_VISION_MODEL="gpt-4o"

# 可选：自定义 API 端点
export OPENAI_BASE_URL="https://api.openai.com/v1"

# 启动服务器
npm start
```

## 支持的模型

- `gpt-4o` - OpenAI 最新的多模态模型（推荐）
- `gpt-4o-mini` - 轻量级多模态模型
- `gpt-4-turbo` - 高性能多模态模型
- `gpt-4-vision-preview` - 视觉预览版模型

## 技术栈

- 开发语言：TypeScript 5.9.2
- 测试框架：Vitest
- 核心依赖：@modelcontextprotocol/sdk (1.17.5), zod (3.23.8)
- Node.js 版本：>= 18.0.0

## 架构设计

项目采用分层架构设计，保持清晰的结构：

- **入口层**：index.ts - MCP Server 启动入口
- **核心服务层**（core/）：
  - environment.ts - 环境配置管理（OpenAI 格式）
  - chat-service.ts - OpenAI API 调用服务
  - file-service.ts - 文件操作服务（仅支持图像）
  - api-common.ts - API 公共函数
  - base-image-service.ts - 图像分析基类
  - error-handler.ts - 错误处理系统
- **工具层**（tools/）- 7 个图像分析工具
- **提示词层**（prompts/）- AI 提示词模板
- **工具函数层**（utils/）- 日志和验证工具
- **类型定义层**（types/）- 错误类型定义

## 开发

```bash
# 安装依赖
npm install

# 开发模式（使用 tsx watch）
npm run dev

# 编译
npm run build

# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

## 项目结构

```
vision-mcp-server/
├── src/
│   ├── index.ts                      # MCP Server 入口
│   ├── core/
│   │   ├── environment.ts           # 环境配置服务（OpenAI）
│   │   ├── chat-service.ts          # OpenAI API 调用
│   │   ├── file-service.ts          # 文件操作（移除视频方法）
│   │   ├── api-common.ts            # API 公共函数（移除视频函数）
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
└── README.zh-CN.md                   # 中文文档
```

## 与原项目的主要改动

1. **功能裁剪**
   - ✅ 移除了视频分析工具（`analyze_video`）
   - ✅ 移除了所有视频相关的代码
   - ✅ 保留了 7 个图像分析工具

2. **接口改造**
   - ✅ 将智谱 API 格式改造为 OpenAI API 格式
   - ✅ 简化了环境变量配置（OPENAI_* 替代 Z_AI_*）
   - ✅ 移除了智谱特定的请求头和参数（`thinking`, `X-Title`）
   - ✅ 提高了接口兼容性

3. **架构保持**
   - ✅ 保持了原有的优秀架构设计
   - ✅ 保持了代码质量和可维护性
   - ✅ 保持了模块化设计

## 许可证

Apache-2.0

## 贡献

欢迎提交 Issue 和 Pull Request！
