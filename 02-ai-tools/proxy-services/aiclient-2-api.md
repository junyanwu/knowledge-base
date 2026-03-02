---
title: AIClient-2-API 代理服务
category: ai-tools
tags: [proxy, api, ai, gateway]
created: 2026-02-22
updated: 2026-02-22
source: https://github.com/justlovemaki/AIClient-2-API
---

# AIClient-2-API 代理服务

> 🔄 **统一 AI 模型接入** - 将客户端独占模型转换为 OpenAI 兼容接口

---

## 概述

AIClient-2-API 是一个 API 代理转发服务，核心功能是：

> 将**仅限客户端使用**的免费大模型（Gemini CLI、Antigravity、Qwen Code、Kiro 等）转换为**标准 OpenAI 兼容接口**，让任何应用都能调用。

**项目信息**:
- **GitHub**: https://github.com/justlovemaki/AIClient-2-API
- **作者**: justlovemaki
- **Stars**: 4,196+ ⭐
- **协议**: GPL-3.0
- **语言**: Node.js

---

## 核心优势

### 1. 统一接入

| 特性 | 说明 |
|------|------|
| 多模型统一接口 | 一次配置，接入 Gemini/Claude/Qwen/Kimi 等 |
| 三协议互转 | OpenAI ↔ Claude ↔ Gemini 智能转换 |
| 零成本迁移 | Cherry-Studio/NextChat/Cline 无需修改 |

### 2. 突破限制

| 优势 | 说明 |
|------|------|
| 绕过官方限制 | 利用 OAuth 突破速率/配额限制 |
| 免费高级模型 | 通过 Kiro 免费用 Claude Opus 4.5 |
| 账号池调度 | 多账号轮询 + 自动故障转移 |

### 3. 企业级特性

- 99.9% 可用性
- 全链路日志记录
- Web UI 管理台
- 容器化部署

---

## 支持的模型

| 协议 | 支持模型 | 说明 |
|------|----------|------|
| **Gemini CLI** | Gemini 3.0 Pro, Gemini 3 Preview | Google 官方客户端 |
| **Kiro** | Claude Opus 4.5, Claude Sonnet 4.5 | Amazon 客户端 |
| **Qwen Code** | Qwen3 Coder Plus | 阿里通义千问 |
| **Antigravity** | Google 内部接口模型 | 特殊渠道 |
| **iFlow** | Qwen/Kimi/DeepSeek/GLM | OAuth 认证 |
| **Ollama** | 本地部署模型 | 自托管 |
| **Codex** | OpenAI Codex | OAuth 访问 |

---

## 快速开始

### 本地安装

```bash
# 克隆仓库
git clone https://github.com/justlovemaki/AIClient-2-API.git
cd AIClient-2-API

# 安装依赖
npm install

# 配置
cp configs/config.json.example configs/config.json
# 编辑 configs/config.json 添加账号

# 启动
npm run start
```

### Docker 部署 (推荐)

```bash
docker run -d \
  -p 3000:3000 \
  -v "./configs:/app/configs" \
  --name aiclient-api \
  justlikemaki/aiclient-2-api
```

### Docker Compose

```yaml
version: '3.8'

services:
  aiclient-api:
    image: justlikemaki/aiclient-2-api:latest
    ports:
      - "3000:3000"
    volumes:
      - ./configs:/app/configs
    restart: unless-stopped
```

---

## 配置说明

### 基础配置 (config.json)

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "providers": {
    "gemini": {
      "enabled": true,
      "accounts": [
        {
          "email": "xxx@gmail.com",
          "refreshToken": "xxx"
        }
      ]
    },
    "kiro": {
      "enabled": true,
      "accounts": [
        {
          "email": "xxx@amazon.com",
          "accessToken": "xxx"
        }
      ]
    }
  },
  "models": {
    "default": "gemini-3-pro",
    "mapping": {
      "gpt-4": "gemini-3-pro",
      "claude-3": "kiro-claude-opus"
    }
  }
}
```

### 账号池配置 (provider_pools.json)

```json
{
  "pools": {
    "gemini": [
      {
        "id": "account-1",
        "email": "xxx@gmail.com",
        "refreshToken": "xxx",
        "weight": 1,
        "enabled": true
      },
      {
        "id": "account-2",
        "email": "yyy@gmail.com",
        "refreshToken": "yyy",
        "weight": 1,
        "enabled": true
      }
    ]
  },
  "strategy": {
    "type": "round-robin",
    "failover": true,
    "healthCheck": true
  }
}
```

---

## API 使用

### OpenAI 兼容接口

```bash
# 标准 OpenAI 格式调用
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gemini-3-pro",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

### Python 调用

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="not-needed"  # 本地运行可省略
)

response = client.chat.completions.create(
    model="gemini-3-pro",
    messages=[
        {"role": "user", "content": "Hello"}
    ]
)

print(response.choices[0].message.content)
```

### 模型切换

```python
# 使用不同模型
response = client.chat.completions.create(
    model="kiro-claude-opus",  # 通过 Kiro 访问 Claude
    messages=[...]
)

response = client.chat.completions.create(
    model="qwen3-coder-plus",  # Qwen Code
    messages=[...]
)
```

---

## 账号获取

### Gemini CLI

1. 安装 Gemini CLI: `npm install -g @anthropic-ai/gemini-cli`
2. 登录 Google 账号
3. 获取 OAuth Token

### Kiro (Claude)

1. 访问 https://kiro.amazon.com
2. 注册/登录 Amazon 账号
3. 新账号赠送 500 credits
4. 获取 Access Token

### Qwen Code

1. 访问 https://tongyi.aliyun.com
2. 登录阿里云账号
3. OAuth 授权获取 Token

---

## 高级功能

### 1. 智能负载均衡

```json
{
  "loadBalancing": {
    "enabled": true,
    "strategy": "round-robin",  // 或 least-connections
    "healthCheck": {
      "enabled": true,
      "interval": 60  // 秒
    }
  }
}
```

### 2. 请求限流

```json
{
  "rateLimit": {
    "enabled": true,
    "requestsPerMinute": 60,
    "tokensPerMinute": 100000
  }
}
```

### 3. 日志记录

```json
{
  "logging": {
    "level": "info",
    "format": "json",
    "output": "file",
    "path": "/var/log/aiclient-api.log"
  }
}
```

### 4. Web UI 管理

访问 `http://localhost:3000/admin` 打开管理台:

- 实时配置管理
- 健康状态监控
- API 测试工具
- 日志查看

---

## 与 OpenClaw 集成

### 配置为 OpenClaw 模型源

```json
// ~/.openclaw/openclaw.json
{
  "models": {
    "providers": {
      "aiclient": {
        "baseUrl": "http://localhost:3000/v1",
        "apiKey": "not-needed",
        "api": "openai-completions",
        "models": [
          {
            "id": "gemini-3-pro",
            "name": "Gemini 3 Pro (via AIClient)"
          },
          {
            "id": "kiro-claude-opus",
            "name": "Claude Opus 4.5 (via Kiro)"
          }
        ]
      }
    }
  }
}
```

### 使用示例

```python
# OpenClaw 中调用
response = await llm.chat(
    model="aiclient/gemini-3-pro",
    messages=[...]
)
```

---

## 优缺点分析

### ✅ 优点

| 优势 | 说明 |
|------|------|
| 免费高级模型 | 无需付费即可使用 Claude Opus 等 |
| 统一接口 | 一次配置，多模型可用 |
| 活跃维护 | 持续更新，支持新模型 |
| 文档完善 | 详细的使用文档和示例 |

### ❌ 缺点

| 风险 | 说明 |
|------|------|
| 账号安全 | OAuth 账号可能被封禁 |
| 服务稳定性 | 依赖第三方客户端接口 |
| 法律合规 | 可能违反某些服务 ToS |
| GPL 协议 | 商用需注意开源合规 |

---

## 最佳实践

### 1. 多账号备份

```json
{
  "accounts": [
    {"id": "primary", "email": "xxx", "weight": 3},
    {"id": "backup1", "email": "yyy", "weight": 1},
    {"id": "backup2", "email": "zzz", "weight": 1}
  ]
}
```

### 2. 监控告警

```bash
# 健康检查脚本
curl -f http://localhost:3000/health || echo "Service down!" | mail -s "Alert" admin@example.com
```

### 3. 定期更新 Token

```bash
# 每月更新 OAuth Token
# 通过 AIClient-2-API Web UI 或配置文件
```

---

## 故障排查

### 常见问题

**Q1: 401 Unauthorized**
- 检查 Token 是否过期
- 重新获取 OAuth Token

**Q2: 429 Too Many Requests**
- 启用账号池轮询
- 降低请求频率

**Q3: 连接超时**
- 检查网络连接
- 确认服务已启动

### 日志查看

```bash
# Docker 日志
docker logs -f aiclient-api

# 本地日志
tail -f /var/log/aiclient-api.log
```

---

## 参考资料

- [GitHub 仓库](https://github.com/justlovemaki/AIClient-2-API)
- [官方文档](https://aiproxy.justlikemaki.vip/)
- [Docker Hub](https://hub.docker.com/r/justlikemaki/aiclient-2-api)
- [DeepWiki 分析](https://deepwiki.com/justlovemaki/AIClient-2-API)
