# 配置管理系统

基于行业最佳实践设计的完整配置管理解决方案。

## 📁 目录结构

```
config-management/
├── README.md                 # 本文档
├── SOLUTION.md               # 完整方案文档
├── BEST_PRACTICES.md         # 最佳实践指南
├── src/
│   ├── index.ts              # 核心功能模块
│   ├── config-security.ts    # 安全模块
│   └── examples.ts           # 使用示例
└── examples/
    ├── config.yaml           # 应用配置示例
    └── feature-flags.yaml    # 特性标志配置示例
```

## ✨ 核心功能

### 1. 特性标志管理

```typescript
import { FeatureFlagRouter, InMemoryConfigStore } from './src';

const store = new InMemoryConfigStore();
const router = new FeatureFlagRouter(store);

// 创建特性标志
await router.createFlag({
  id: 'new-feature',
  name: '新功能',
  category: 'release',
  enabled: true,
  createdBy: 'team@example.com'
});

// 检查特性是否启用
const enabled = await router.isEnabled('new-feature', { userId: 'user-123' });
```

### 2. 配置管理

```typescript
import { ConfigManager } from './src';

const manager = new ConfigManager(store);

// 设置配置
await manager.set('database.host', 'localhost', 'admin');

// 获取配置
const host = await manager.get('database.host', 'default');

// 监听变更
manager.watch('database.host', (newValue) => {
  console.log('配置已更新:', newValue);
});
```

### 3. 敏感配置管理

```typescript
import { SecretsManager, EncryptionManager } from './src/config-security';

const encryption = new EncryptionManager(masterKey);
const secrets = new SecretsManager(encryption, 'admin');

// 存储密钥
await secrets.storeSecret('api.key', 'secret-value', {
  rotationPolicy: { enabled: true, intervalDays: 30 }
});

// 获取密钥
const apiKey = await secrets.getSecret('api.key');
```

### 4. 配置验证

```typescript
import { ConfigValidator } from './src/config-security';

const validator = new ConfigValidator();
validator.addRule({
  key: 'database.port',
  type: 'range',
  params: { min: 1, max: 65535 },
  message: '端口必须在有效范围内'
});

const result = validator.validate(config);
```

### 5. 密钥泄露检测

```typescript
import { SecretDetector } from './src/config-security';

const detector = new SecretDetector();
const findings = detector.detect(codeContent);
// 检测 AWS 密钥、API 密钥、密码等敏感信息
```

## 📚 文档

- [完整方案文档](./SOLUTION.md) - 详细的系统设计方案
- [最佳实践指南](./BEST_PRACTICES.md) - 使用指南和最佳实践

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 运行示例
npm run examples
```

## 📋 验证标准

### ✅ 配置版本控制
- [x] GitOps 配置管理
- [x] 配置变更历史追踪
- [x] 配置回滚支持
- [x] 环境配置隔离

### ✅ 配置变更追踪
- [x] 变更审计日志
- [x] 变更通知机制
- [x] 责任人记录
- [x] 变更前后对比

### ✅ 配置安全性
- [x] 敏感配置加密存储
- [x] 访问权限控制
- [x] 密钥轮换策略
- [x] 泄露检测机制

## 🔧 技术栈

- **TypeScript** - 类型安全
- **Node.js** - 运行时环境
- **AES-256-GCM** - 加密算法

## 📄 许可证

MIT License