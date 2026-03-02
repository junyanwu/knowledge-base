---
title: OpenClaw 系统架构
category: ai-tools
tags: [framework, architecture, ai, openclaw]
created: 2026-02-22
updated: 2026-02-22
source: https://docs.openclaw.ai/
---

# OpenClaw 系统架构

> 🦞 **Your AI Assistant Framework** - 模块化、可扩展的 AI 助理系统

---

## 概述

OpenClaw 是一个模块化的 AI 助理框架，支持多渠道消息集成、本地/云端模型混合部署、工具链扩展。

**核心特性**:
- 🔄 多渠道消息 (飞书/Telegram/Discord/微信等)
- 🤖 多模型支持 (本地 LM Studio + 云端 Bailian/OpenRouter)
- 🛠️ 工具链扩展 (Feishu 文档/云空间/知识库等)
- 📝 记忆系统 (MEMORY.md + 会话日志)
- ⏰ 定时任务 (Cron + Heartbeat)

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Channel   │  │   Channel   │  │   Channel   │     │
│  │   (Feishu)  │  │  (Telegram) │  │  (Discord)  │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│                 ┌────────▼────────┐                     │
│                 │  Message Router │                     │
│                 └────────┬────────┘                     │
│                          │                              │
│         ┌────────────────┼────────────────┐             │
│         │                │                │             │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐     │
│  │   Agent     │  │   Tools     │  │   Memory    │     │
│  │  (Qwen3.5)  │  │  (Plugins)  │  │   System    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. Gateway (网关)

**职责**: WebSocket 服务器，消息路由，渠道管理

```bash
# 启动 Gateway
openclaw gateway

# 查看状态
openclaw gateway status

# 重启
openclaw gateway restart
```

**配置文件**: `~/.openclaw/openclaw.json`

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "none"
    }
  },
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "dmPolicy": "open"
    }
  }
}
```

### 2. Channels (渠道)

**支持的渠道**:
- 飞书 (Feishu/Lark)
- Telegram
- Discord
- WhatsApp
- 微信 (通过 wacli)
- iMessage (通过 imsg)

**飞书配置示例**:

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_a91ecf27eeb61cd9",
      "appSecret": "xxx",
      "dmPolicy": "open",
      "allowFrom": ["*"]
    }
  }
}
```

### 3. Models (模型)

**模型管理**:

```bash
# 查看模型状态
openclaw models status

# 添加模型别名
openclaw models aliases add light lmstudio/qwen3-8b

# 设置默认模型
openclaw models set bailian/qwen3.5-plus
```

**模型配置**:

```json
{
  "models": {
    "providers": {
      "lmstudio": {
        "baseUrl": "http://127.0.0.1:1234/v1",
        "apiKey": "lmstudio",
        "api": "openai-responses",
        "models": [
          {
            "id": "qwen3-8b",
            "name": "Qwen3 8B",
            "contextWindow": 4096
          }
        ]
      },
      "bailian": {
        "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "apiKey": "sk-xxx",
        "api": "openai-completions",
        "models": [
          {
            "id": "qwen3.5-plus",
            "name": "Qwen3.5-Plus",
            "contextWindow": 1048576
          }
        ]
      }
    }
  }
}
```

### 4. Tools (工具)

**内置工具**:
- `exec` - 执行 shell 命令
- `read` - 读取文件
- `write` - 写入文件
- `edit` - 编辑文件
- `web_search` - 搜索网络
- `web_fetch` - 抓取网页
- `browser` - 浏览器控制
- `message` - 发送消息
- `feishu_doc` - 飞书文档
- `feishu_wiki` - 飞书知识库
- `feishu_drive` - 飞书云空间
- `feishu_bitable` - 飞书多维表格

**工具调用示例**:

```python
# 读取文件
read(path="~/workspace/file.txt")

# 执行命令
exec(command="ls -la", pty=True)

# 发送飞书消息
message(
    action="send",
    channel="feishu",
    target="user:ou_xxx",
    message="Hello"
)
```

### 5. Memory (记忆)

**记忆系统结构**:

```
~/.openclaw/workspace/
├── MEMORY.md              # 长期记忆 ( curated )
├── memory/
│   ├── 2026-02-22.md      # 每日日志 ( raw )
│   └── 2026-02-23.md
├── SOUL.md                # 人格设定
├── USER.md                # 用户信息
├── IDENTITY.md            # 身份定义
└── HEARTBEAT.md           # 心跳任务
```

**记忆使用**:

```python
# 搜索记忆
memory_search(query="上次讨论的量化策略")

# 获取记忆片段
memory_get(path="MEMORY.md", from=10, lines=5)
```

---

## 工作流程

### 消息处理流程

```
1. 用户发送消息 (飞书/Telegram 等)
         ↓
2. Gateway 接收消息
         ↓
3. 消息路由到 Agent
         ↓
4. Agent 处理:
   - 读取记忆 (memory_search)
   - 调用工具 (exec/read/web_search 等)
   - 生成回复
         ↓
5. 通过原渠道回复用户
```

### 子代理 (Subagent) 流程

```python
# 主代理 spawn 子代理
sessions_spawn(
    task="基于 VeighNa 开发回测系统",
    label="quant-bigA 开发",
    runTimeoutSeconds=3600
)

# 返回
{
    "sessionKey": "agent:main:subagent:xxx",
    "status": "accepted"
}

# 子代理完成后自动通知
```

---

## 配置管理

### 常用命令

```bash
# 查看配置
openclaw config get gateway.port

# 设置配置
openclaw config set gateway.auth.mode none

# 删除配置
openclaw config unset gateway.auth.token

# 完整配置向导
openclaw configure
```

### 配置热重载

```bash
# 配置修改后重启 Gateway
openclaw gateway restart

# 或使用 doctor 自动修复
openclaw doctor --fix
```

---

## 插件系统

### 插件结构

```
extensions/
└── feishu/
    ├── index.ts              # 插件入口
    ├── openclaw.plugin.json  # 插件元数据
    ├── package.json
    └── skills/
        ├── feishu-doc/
        ├── feishu-wiki/
        ├── feishu-drive/
        └── feishu-bitable/
```

### 插件元数据

```json
{
  "id": "feishu",
  "channels": ["feishu"],
  "skills": ["./skills"],
  "configSchema": {
    "type": "object",
    "properties": {}
  }
}
```

---

## 最佳实践

### 1. 模型选择

| 任务类型 | 推荐模型 | 说明 |
|----------|----------|------|
| 简单问答 | light (lmstudio) | 本地快速响应 |
| 复杂推理 | bailian/qwen3.5-plus | 云端强大推理 |
| 代码生成 | bailian/qwen3-coder-plus | 专业代码模型 |
| 长文本 | bailian/qwen3.5-plus | 1M context |

### 2. 记忆管理

- **每日日志**: 记录原始对话和事件
- **MEMORY.md**: 提炼重要决策和上下文
- **定期整理**: 每周回顾并更新长期记忆

### 3. 工具使用

- **文件操作**: 优先使用 read/write/edit
- **命令执行**: 注意安全风险，使用 trash 而非 rm
- **网络请求**: web_search 优先，web_fetch 补充

### 4. 安全配置

```json
{
  "gateway": {
    "auth": {
      "mode": "token"  // 生产环境使用 token 认证
    },
    "bind": "loopback" // 仅本地访问
  },
  "nodes": {
    "denyCommands": [
      "rm -rf",
      "sudo",
      "curl | bash"
    ]
  }
}
```

---

## 故障排查

### Gateway 无法启动

```bash
# 检查端口占用
lsof -i :18789

# 查看日志
tail -f /tmp/openclaw/openclaw-*.log

# 重启
openclaw gateway stop
openclaw gateway start
```

### 渠道消息不响应

```bash
# 检查渠道状态
openclaw channels status

# 查看渠道日志
openclaw channels logs

# 重新配置
openclaw channels add --channel feishu
```

---

## 参考资料

- [OpenClaw 官方文档](https://docs.openclaw.ai/)
- [GitHub 仓库](https://github.com/openclaw/openclaw)
- [社区 Discord](https://discord.com/invite/clawd)
- [技能市场](https://clawhub.com/)
