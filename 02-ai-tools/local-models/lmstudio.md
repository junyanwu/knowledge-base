---
title: LM Studio 本地模型部署
category: ai-tools
tags: [local-model, lmstudio, deployment, ollama]
created: 2026-02-22
updated: 2026-02-22
---

# LM Studio 本地模型部署

> 🏠 **本地运行大模型** - 隐私、免费、低延迟

---

## 概述

LM Studio 是一个本地大模型运行工具，支持 GGUF 格式模型。

**核心特点**:
- 🔒 完全本地运行，数据不出设备
- 🆓 免费使用，无 API 费用
- ⚡ 低延迟，快速响应
- 📦 支持 GGUF 格式模型

---

## 安装

### macOS

```bash
# 方式 1: Homebrew
brew install --cask lm-studio

# 方式 2: 下载安装
# 访问 https://lmstudio.ai 下载 .dmg
```

### Windows

访问 https://lmstudio.ai 下载安装包

### Linux

```bash
# AppImage
wget https://lmstudio.ai/download/linux -O lm-studio.AppImage
chmod +x lm-studio.AppImage
./lm-studio.AppImage
```

---

## 模型下载

### 通过 LM Studio 下载

1. 打开 LM Studio
2. 搜索模型 (如 "Qwen3 8B")
3. 选择量化版本 (推荐 Q4_K_M 或 Q5_K_M)
4. 点击下载

### 手动下载

```bash
# 从 HuggingFace 下载
wget https://huggingface.co/Qwen/Qwen3-8B-GGUF/resolve/main/qwen3-8b-q4_k_m.gguf

# 移动到 LM Studio 模型目录
mv qwen3-8b-q4_k_m.gguf ~/.cache/lm-studio/models/
```

### 推荐模型

| 模型 | 大小 | 量化 | 用途 |
|------|------|------|------|
| Qwen3-8B | ~5GB | Q4_K_M | 日常对话 |
| Qwen3-14B | ~9GB | Q4_K_M | 复杂推理 |
| Llama-3-8B | ~5GB | Q4_K_M | 通用任务 |
| CodeLlama-7B | ~4GB | Q4_K_M | 代码生成 |

---

## 启动服务

### 本地 API 服务

1. 打开 LM Studio
2. 选择已下载的模型
3. 点击 "Start Server"
4. 默认端口：1234

### API 端点

```
Base URL: http://localhost:1234/v1

端点:
- POST /chat/completions  - 对话
- POST /completions       - 补全
- GET  /models            - 模型列表
```

---

## 与 OpenClaw 集成

### 配置模型

```json
// ~/.openclaw/openclaw.json
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
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 4096,
            "maxTokens": 8192
          },
          {
            "id": "qwen3-14b",
            "name": "Qwen3 14B",
            "contextWindow": 8192,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

### 添加别名

```bash
# 添加 light 别名
openclaw models aliases add light lmstudio/qwen3-8b

# 验证
openclaw models aliases list
```

### 使用示例

```python
# OpenClaw 中使用
# 简单任务用 light 模型
response = await llm.chat(
    model="light",  # 或 lmstudio/qwen3-8b
    messages=[
        {"role": "user", "content": "你好"}
    ]
)

# 复杂任务用云端模型
response = await llm.chat(
    model="bailian/qwen3.5-plus",
    messages=[...]
)
```

---

## 性能优化

### 1. GPU 加速

```bash
# macOS (Metal)
# LM Studio 自动使用 Metal 加速

# 检查 GPU 使用
system_profiler SPDisplaysDataType
```

### 2. 内存管理

| 模型大小 | 推荐内存 | 量化建议 |
|----------|----------|----------|
| 7B-8B | 8GB+ | Q4_K_M |
| 13B-14B | 16GB+ | Q4_K_M |
| 30B+ | 32GB+ | Q3_K_M |

### 3. 上下文长度

```json
{
  "contextWindow": 4096,  // 根据内存调整
  "maxTokens": 2048
}
```

---

## 命令行调用

### curl 调用

```bash
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-8b",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

### Python 调用

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lmstudio"
)

response = client.chat.completions.create(
    model="qwen3-8b",
    messages=[
        {"role": "user", "content": "Hello"}
    ]
)

print(response.choices[0].message.content)
```

---

## 模型对比

### 本地 vs 云端

| 维度 | 本地 (LM Studio) | 云端 (Bailian) |
|------|-----------------|---------------|
| 成本 | 免费 | 按 token 计费 |
| 延迟 | 低 (<1s) | 中 (1-3s) |
| 隐私 | 完全本地 | 数据上传 |
| 能力 | 中等 (8B-14B) | 强大 (72B+) |
| 可用性 | 依赖本地硬件 | 99.9% SLA |

### 使用建议

| 场景 | 推荐 | 说明 |
|------|------|------|
| 简单问答 | 本地 | 快速免费 |
| 复杂推理 | 云端 | 更准确 |
| 代码生成 | 云端 | 专业模型 |
| 敏感数据 | 本地 | 隐私保护 |
| 批量处理 | 本地 | 成本低 |

---

## 故障排查

### 常见问题

**Q1: 服务无法启动**
- 检查端口是否被占用：`lsof -i :1234`
- 重启 LM Studio

**Q2: 模型加载失败**
- 检查内存是否足够
- 尝试更小的量化版本

**Q3: 响应慢**
- 关闭其他占用 GPU 的应用
- 降低上下文长度

### 日志查看

```bash
# LM Studio 日志
# macOS: ~/Library/Logs/LM Studio/
# Windows: %APPDATA%\LM Studio\Logs\
```

---

## 进阶使用

### 1. 多模型切换

```bash
# 列出可用模型
curl http://localhost:1234/v1/models

# 切换模型 (在 LM Studio UI 中选择)
```

### 2. 批处理

```python
from concurrent.futures import ThreadPoolExecutor

def process_item(item):
    response = client.chat.completions.create(
        model="qwen3-8b",
        messages=[{"role": "user", "content": item}]
    )
    return response.choices[0].message.content

# 批量处理
items = ["item1", "item2", "item3"]
with ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(process_item, items))
```

### 3. 流式输出

```python
response = client.chat.completions.create(
    model="qwen3-8b",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

---

## 参考资料

- [LM Studio 官网](https://lmstudio.ai/)
- [GGUF 模型下载](https://huggingface.co/models?library=gguf)
- [OpenClaw 模型配置](https://docs.openclaw.ai/cli/models)
