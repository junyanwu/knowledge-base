# Knowledge Base - AI 助理知识管理系统

> 🧠 **Second Brain for AI Assistant** — 系统化整理学习到的知识，实现记忆可迁移

---

## 📚 知识体系结构

```
knowledge-base/
├── README.md                 # 本文件
├── 00-index.md               # 知识地图/索引
├── 01-quant-finance/         # 量化金融
│   ├── frameworks/           # 框架与平台
│   ├── strategies/           # 交易策略
│   ├── data-sources/         # 数据源
│   └── backtesting/          # 回测系统
├── 02-ai-tools/              # AI 工具与框架
│   ├── openclaw/             # OpenClaw 系统
│   ├── proxy-services/       # API 代理服务
│   └── local-models/         # 本地模型部署
├── 03-development/           # 开发技术
│   ├── python/               # Python 技术栈
│   ├── nodejs/               # Node.js 技术栈
│   └── devops/               # 部署与运维
├── 04-integrations/          # 集成与渠道
│   ├── feishu/               # 飞书集成
│   ├── messaging/            # 消息渠道
│   └── api/                  # API 设计
├── finance/                  # 金融知识
│   ├── 金融市场基础.md
│   ├── 技术分析详解.md
│   ├── 宏观经济分析框架.md
│   ├── 行业研究方法论.md
│   └── 欧洲央行政策追踪.md
├── world-affairs/            # 世界局势
│   ├── 世界局势分析框架.md
│   ├── 2026年全球热点.md
│   └── 温铁军著作研读计划.md
└── quantitative/             # 量化投资
    ├── 量化投资基础.md
    ├── Python量化编程.md
    └── 风险管理模型.md
```

---

## 🎯 知识管理原则

### 1. **原子化**
- 每个知识点独立成文
- 单一职责，便于复用

### 2. **可检索**
- 统一的标签系统
- 双向链接

### 3. **可迁移**
- Markdown 格式
- Git 版本控制
- 支持导入到其他 AI 助理

### 4. **持续更新**
- 每次学习后更新
- 标注来源和时间

---

## 📖 已整理知识

### 量化金融
- [VeighNa 框架详解](01-quant-finance/frameworks/veighna.md)
- [Z-Score 均值回归策略](01-quant-finance/strategies/zscore-mean-reversion.md)
- [AkShare 数据接口](01-quant-finance/data-sources/akshare.md)

### AI 工具
- [OpenClaw 系统架构](02-ai-tools/openclaw/architecture.md)
- [AIClient-2-API 调研](02-ai-tools/proxy-services/aiclient-2-api.md)
- [LM Studio 本地部署](02-ai-tools/local-models/lmstudio.md)

### 集成开发
- [飞书机器人集成](04-integrations/feishu/bot-setup.md)
- [WebSocket 消息处理](04-integrations/feishu/websocket.md)

### 金融知识
- [金融市场基础](finance/金融市场基础.md)
- [技术分析详解](finance/技术分析详解.md)
- [宏观经济分析框架](finance/宏观经济分析框架.md)
- [行业研究方法论](finance/行业研究方法论.md)
- [欧洲央行政策追踪](finance/欧洲央行政策追踪.md) ✨ 新增

### 世界局势
- [世界局势分析框架](world-affairs/世界局势分析框架.md)
- [2026年全球热点](world-affairs/2026年全球热点.md)
- [温铁军著作研读计划](world-affairs/温铁军著作研读计划.md)

### 量化投资
- [量化投资基础](quantitative/量化投资基础.md)
- [Python量化编程](quantitative/Python量化编程.md)
- [风险管理模型](quantitative/风险管理模型.md)

---

## 🔄 知识迁移

### 导出到其他 AI 助理
```bash
# 打包知识库
tar -czf knowledge-export.tar.gz knowledge-base/

# 或克隆 Git 仓库
git clone https://github.com/junyanwu/knowledge-base.git
```

### 导入新会话
1. 读取 `00-index.md` 了解知识地图
2. 按需加载相关文档
3. 继承已有认知

---

## 📊 知识统计

| 分类 | 文档数 | 最后更新 |
|------|--------|----------|
| 量化金融 | 7 | 2026-02-22 |
| AI 工具 | 4 | 2026-02-22 |
| 开发技术 | 2 | 2026-02-22 |
| 集成开发 | 3 | 2026-02-22 |
| 金融知识 | 5 | 2026-03-02 |
| 世界局势 | 3 | 2026-03-02 |
| 量化投资 | 3 | 2026-03-02 |

---

## 📋 待学习内容

### 高优先级
- [ ] 温铁军著作研读（八次危机、去依附等）
- [ ] 金融衍生品知识
- [ ] 高频交易策略

### 中优先级
- [ ] 区域经济专题
- [ ] 地缘政治深度分析
- [ ] 机器学习在量化中的应用

### 低优先级
- [ ] 行业专题研究
- [ ] 历史经济案例分析

---

## 🚀 使用说明

### 添加新知识
1. 在对应分类下创建 `.md` 文件
2. 添加 frontmatter 元数据
3. 更新 `00-index.md` 索引
4. Git 提交

### 模板
```markdown
---
title: 文档标题
category: 分类
tags: [标签 1, 标签 2]
created: YYYY-MM-DD
updated: YYYY-MM-DD
source: 来源链接 (可选)
---

# 标题

## 概述
...

## 核心概念
...

## 实践指南
...

## 参考资料
...
```

---

## 🔗 外部资源

- [VeighNa 官方文档](https://www.vnpy.com/docs/cn/index.html)
- [AkShare 文档](https://akshare.akfamily.xyz/)
- [OpenClaw 文档](https://docs.openclaw.ai/)
- [AIClient-2-API](https://github.com/justlovemaki/AIClient-2-API)
- [Tushare](https://tushare.pro)
- [聚宽](https://www.joinquant.com)
- [米筐](https://www.ricequant.com)
- [IMF](https://www.imf.org)
- [世界银行](https://www.worldbank.org)

---

**维护者**: AI Assistant  
**License**: MIT  
**版本**: 1.1.0
