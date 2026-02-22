---
title: 飞书机器人集成
category: integrations
tags: [feishu, lark, bot, integration]
created: 2026-02-22
updated: 2026-02-22
---

# 飞书机器人集成

> 📱 **企业级消息渠道** - 飞书/Lark 机器人完整配置指南

---

## 概述

OpenClaw 通过飞书插件实现与企业IM的集成，支持消息收发、文档管理、知识库等功能。

**核心功能**:
- 💬 消息收发 (私聊/群聊)
- 📄 飞书文档管理
- 📚 知识库操作
- 💾 云空间文件
- 📊 多维表格

---

## 前置准备

### 1. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 点击 "创建企业应用"
3. 填写应用信息:
   - 应用名称：OpenClaw Assistant
   - 应用图标：选择一个图标
   - 应用描述：AI 助理机器人

### 2. 获取凭证

在应用管理页面获取:
- **App ID**: `cli_xxxxxxxxxxxxxxxx`
- **App Secret**: `xxxxxxxxxxxxxxxxxxxxxxxx`

### 3. 配置权限

在 "应用功能" → "权限管理" 中添加:

| 权限 | 用途 |
|------|------|
| `im:message` | 发送消息 |
| `im:message:send` | 发送消息 |
| `contact:contact.base:readonly` | 获取联系人信息 |
| `docx:document` | 文档操作 |

---

## OpenClaw 配置

### 方式 1: 交互式配置

```bash
openclaw channels add --channel feishu
# 按提示输入 App ID 和 App Secret
```

### 方式 2: 命令行配置

```bash
# 设置飞书凭证
openclaw config set "channels.feishu.appId" "cli_a91ecf27eeb61cd9"
openclaw config set "channels.feishu.appSecret" "gdJFG331lCLIGV8Z2epguBT6OaO2dkCi"

# 配置 DM 策略
openclaw config set "channels.feishu.dmPolicy" "open"

# 重启 Gateway
openclaw gateway restart
```

### 配置文件

```json
// ~/.openclaw/openclaw.json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_a91ecf27eeb61cd9",
      "appSecret": "gdJFG331lCLIGV8Z2epguBT6OaO2dkCi",
      "dmPolicy": "open",
      "allowFrom": ["*"]
    }
  }
}
```

---

## DM 策略说明

### open (开放模式)

```json
{"dmPolicy": "open"}
```
- 任何人都可以私聊机器人
- 适合测试环境

### pairing (配对模式)

```json
{"dmPolicy": "pairing"}
```
- 需要配对后才能对话
- 安全性高

### allowlist (白名单模式)

```json
{
  "dmPolicy": "allowlist",
  "allowFrom": ["ou_xxxxxxxx1", "ou_xxxxxxxx2"]
}
```
- 只有白名单用户可以对话
- 推荐生产环境使用

---

## 获取用户 ID

### 方式 1: 从日志获取

```bash
# 查看 Gateway 日志
tail -f /tmp/openclaw/openclaw-*.log | grep "received message"

# 输出示例
# feishu[default]: received message from ou_27a855c705cccd28d935b0d65b1b6551
```

### 方式 2: 飞书 API

```bash
# 获取当前用户信息
curl -X POST https://open.feishu.cn/open-apis/auth/v3/user_info/ \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 方式 3: 机器人@消息

在飞书中@机器人，日志中会显示用户 ID

---

## 消息发送

### OpenClaw 消息工具

```python
# 发送文本消息
message(
    action="send",
    channel="feishu",
    target="user:ou_27a855c705cccd28d935b0d65b1b6551",
    message="你好！我是 AI 助理"
)

# 发送富文本卡片
message(
    action="send",
    channel="feishu",
    target="user:ou_xxx",
    # 卡片内容
)
```

### 消息格式

```python
# 纯文本
message="你好！"

# 带格式 (Markdown)
message="""
**标题**

- 列表项 1
- 列表项 2

[链接](https://example.com)
"""

# 提及用户
message="<at user_id=\"ou_xxx\">用户</at> 你好"
```

---

## WebSocket 配置

### 飞书端配置

1. 在应用管理 → "事件与回调"
2. 订阅方式选择 "使用长连接接收事件/回调"
3. 订阅事件:
   - 接收消息 (im.message.receive_v1)
   - 消息已读 (im.message.read_v1)

### OpenClaw 端

自动处理 WebSocket 连接，无需额外配置

---

## 故障排查

### 常见问题

**Q1: 消息收不到**
- 检查飞书应用权限
- 确认 WebSocket 已连接
- 查看 Gateway 日志

**Q2: 消息发不出**
- 检查 `im:message:send` 权限
- 确认用户 ID 正确
- 查看错误日志

**Q3: 权限错误 99991672**
```
需要开通的权限：[im:message, im:message:send]
```
- 访问权限申请链接
- 开通相应权限
- 重启 Gateway

### 日志查看

```bash
# Gateway 日志
tail -f /tmp/openclaw/openclaw-*.log

# 筛选飞书相关
tail -f /tmp/openclaw/openclaw-*.log | grep feishu

# 错误日志
cat /Users/sigma/.openclaw/logs/gateway.err.log
```

---

## 最佳实践

### 1. 生产环境配置

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "dmPolicy": "allowlist",
      "allowFrom": ["ou_user1", "ou_user2"],
      "groupPolicy": "disabled"
    }
  }
}
```

### 2. 消息频率限制

- 避免短时间内发送大量消息
- 使用消息队列缓冲
- 实现退避重试

### 3. 错误处理

```python
try:
    message(action="send", channel="feishu", ...)
except Exception as e:
    # 记录错误
    # 稍后重试
    pass
```

### 4. 用户通知

```python
# 任务开始通知
message(channel="feishu", target="user:ou_xxx", message="🚀 任务已开始")

# 进度更新
message(channel="feishu", target="user:ou_xxx", message="🔄 进度：50%")

# 完成通知
message(channel="feishu", target="user:ou_xxx", message="✅ 任务完成")
```

---

## 高级功能

### 飞书文档工具

```python
# 读取文档
feishu_doc(action="read", doc_token="ABC123")

# 创建文档
feishu_doc(action="create", title="新文档")

# 更新文档
feishu_doc(action="write", doc_token="ABC123", content="# 内容")
```

### 飞书知识库工具

```python
# 搜索知识库
feishu_wiki(action="search", query="关键词")

# 创建知识节点
feishu_wiki(action="create", title="新页面", space_id="xxx")
```

### 飞书云空间

```python
# 列出文件
feishu_drive(action="list", folder_token="xxx")

# 创建文件夹
feishu_drive(action="create_folder", name="新文件夹")
```

---

## 参考资料

- [飞书开放平台](https://open.feishu.cn/)
- [OpenClaw 飞书文档](https://docs.openclaw.ai/channels/feishu)
- [飞书 API 文档](https://open.feishu.cn/document/ukTMukTMukTM/ugjM14CO2UjLwITN)
