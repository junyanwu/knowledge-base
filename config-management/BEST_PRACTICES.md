# 配置管理最佳实践指南

## 一、配置分层与组织

### 1.1 配置分层原则

```
优先级从高到低:

┌─────────────────────────────────────────────────────────────┐
│ 1. 命令行参数 / 环境变量                                      │
│    最高优先级，用于临时覆盖和敏感信息                          │
├─────────────────────────────────────────────────────────────┤
│ 2. 分布式配置中心 (Consul/etcd/Vault)                        │
│    动态配置，支持运行时更新                                    │
├─────────────────────────────────────────────────────────────┤
│ 3. 环境配置文件 (config.{env}.yaml)                          │
│    环境特定配置，纳入版本控制                                  │
├─────────────────────────────────────────────────────────────┤
│ 4. 默认配置 (config.default.yaml)                            │
│    应用默认值，安全后备                                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 配置文件组织

```
project/
├── config/
│   ├── default.yaml          # 默认配置
│   ├── development.yaml      # 开发环境
│   ├── staging.yaml          # 预发布环境
│   ├── production.yaml       # 生产环境
│   └── test.yaml             # 测试环境
├── secrets/                  # 敏感配置（加密存储，不入库）
│   ├── development.enc
│   ├── staging.enc
│   └── production.enc
└── .env.example              # 环境变量模板
```

### 1.3 配置命名规范

```yaml
# 好的命名 - 清晰、分层、一致
database:
  host: localhost
  port: 5432
  name: myapp
  connection_pool:
    min: 5
    max: 20

cache:
  redis:
    host: localhost
    port: 6379
    ttl: 3600

features:
  new_checkout:
    enabled: false
    percentage: 10

# 避免 - 扁平、模糊、不一致
DB_HOST: localhost
dbPort: 5432
database_name: myapp
redis_host: localhost
NEW_CHECKOUT_ENABLED: false
```

## 二、特性标志管理

### 2.1 特性标志生命周期

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   创建阶段    │ ──→ │   激活阶段    │ ──→ │   清理阶段    │
└──────────────┘     └──────────────┘     └──────────────┘
        │                   │                    │
        ▼                   ▼                    ▼
  - 定义目标规则      - 灰度发布             - 监控使用率
  - 设置过期时间      - A/B 测试             - 设置删除计划
  - 编写测试用例      - 全量发布             - 移除旧代码路径
  - 文档化影响范围    - 监控指标             - 归档配置
```

### 2.2 特性标志最佳实践

#### ✅ 应该做的

```typescript
// 1. 解耦决策逻辑
const featureDecisions = createFeatureDecisions({
  includeNewCheckout: () => router.isEnabled('new-checkout'),
  getRecommendationEngine: () => router.isEnabled('ml-recommendations') 
    ? new MLEngine() 
    : new RuleEngine()
});

// 2. 设置过期时间
await flagRouter.createFlag({
  id: 'new-checkout-flow',
  category: 'release',
  expiresAt: new Date('2024-03-15'), // 最多存在2个月
  // ...
});

// 3. 使用策略模式替代条件分支
interface PaymentProcessor {
  process(order: Order): Promise<PaymentResult>;
}

class PaymentProcessorFactory {
  create(decisions: FeatureDecisions): PaymentProcessor {
    return decisions.useNewPaymentFlow()
      ? new NewPaymentProcessor()
      : new LegacyPaymentProcessor();
  }
}

// 4. 监控特性标志状态
flagRouter.onChange((event) => {
  metrics.increment(`feature_flag.${event.key}.${event.action}`);
  logger.info('Feature flag changed', { event });
});
```

#### ❌ 避免的做法

```typescript
// 1. 避免在业务代码中直接判断
// ❌ 不好的做法
function processOrder() {
  if (featureFlags.isEnabled('new-checkout')) {
    // 业务逻辑与特性标志耦合
  }
}

// 2. 避免嵌套的特性标志
// ❌ 不好的做法
if (featureFlags.isEnabled('feature-a')) {
  if (featureFlags.isEnabled('feature-b')) {
    // 组合逻辑难以测试和维护
  }
}

// 3. 避免长期保留特性标志
// ❌ 不好的做法 - 没有过期时间的特性标志
await flagRouter.createFlag({
  id: 'legacy-feature',
  category: 'release',
  // 没有 expiresAt，可能永远留在代码中
});
```

### 2.3 灰度发布策略

```typescript
// 百分比灰度
const targeting = {
  percentage: 10  // 10% 用户
};

// 用户分组灰度
const targeting = {
  userGroups: ['beta-testers', 'internal-users']
};

// 组合策略
const targeting = {
  conditions: [
    { type: 'user_attribute', key: 'country', operator: 'in', values: ['US', 'UK'] },
    { type: 'user_attribute', key: 'plan', operator: 'eq', values: ['premium'] }
  ],
  percentage: 50
};
```

## 三、配置安全

### 3.1 敏感信息处理

```
┌──────────────────────────────────────────────────────────────┐
│                    敏感信息分类与处理                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Level 1: 非敏感                                             │
│  ├── 功能开关状态     → 可存入代码仓库                       │
│  ├── 日志级别         → 可存入代码仓库                       │
│  └── 环境标识         → 可存入代码仓库                       │
│                                                              │
│  Level 2: 内部敏感                                           │
│  ├── 数据库连接串     → 存入配置中心，加密存储               │
│  ├── API 端点         → 存入配置中心                         │
│  └── 第三方服务配置   → 存入配置中心，加密存储               │
│                                                              │
│  Level 3: 高度敏感                                           │
│  ├── API 密钥         → 密钥管理系统 (Vault)                 │
│  ├── 数据库密码       → 密钥管理系统                         │
│  └── 加密密钥         → 密钥管理系统 + 访问审计              │
│                                                              │
│  Level 4: 关键凭证                                           │
│  ├── 私钥/证书        → 硬件安全模块 (HSM)                   │
│  └── 根密钥           → 离线存储，多人授权                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 密钥管理最佳实践

```yaml
# 密钥管理检查清单

存储安全:
  - ✅ 永远不要将密钥提交到代码仓库
  - ✅ 使用加密存储敏感配置
  - ✅ 使用专用的密钥管理系统 (HashiCorp Vault, AWS Secrets Manager)
  - ✅ 密钥与配置代码分离

访问控制:
  - ✅ 实施最小权限原则
  - ✅ 按环境隔离访问权限
  - ✅ 记录所有访问审计日志
  - ✅ 定期审查访问权限

密钥轮换:
  - ✅ 制定密钥轮换策略
  - ✅ 自动化轮换流程
  - ✅ 支持多版本密钥（轮换期间的过渡）
  - ✅ 监控异常访问模式

泄露防护:
  - ✅ 在 CI/CD 中集成密钥扫描
  - ✅ 日志中自动脱敏敏感信息
  - ✅ 监控异常访问模式
  - ✅ 制定泄露响应流程
```

### 3.3 环境变量安全

```bash
# .env.example - 模板文件（可提交）
# 敏感值使用占位符
DATABASE_URL=postgresql://user:password@host:5432/db
API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here

# 实际 .env 文件（不提交，加入 .gitignore）
DATABASE_URL=postgresql://admin:xK9#mP2$vL@prod-db:5432/myapp
API_KEY=sk_live_abc123xyz789
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```python
# 应用启动时验证必需的环境变量
required_env_vars = [
    'DATABASE_URL',
    'API_KEY',
    'JWT_SECRET'
]

for var in required_env_vars:
    if not os.environ.get(var):
        raise EnvironmentError(f"Missing required environment variable: {var}")
```

## 四、配置版本控制

### 4.1 GitOps 配置管理

```yaml
# config/features.yaml
apiVersion: config/v1
kind: FeatureFlags
metadata:
  name: feature-flags
  version: "1.2.3"
spec:
  flags:
    - id: new-checkout-flow
      name: 新版结账流程
      description: 重构后的结账体验
      category: release
      enabled: true
      targeting:
        percentage: 50
        userGroups:
          - beta-testers
      audit:
        - timestamp: "2024-01-15T10:00:00Z"
          action: created
          actor: team-checkout
        - timestamp: "2024-01-20T14:00:00Z"
          action: updated
          changes:
            - field: targeting.percentage
              from: 20
              to: 50
          actor: jane@example.com
```

### 4.2 配置变更流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     配置变更工作流                               │
│                                                                 │
│  1. 创建 PR                                                     │
│     └→ 修改配置文件                                              │
│     └→ 填写变更原因                                              │
│                                                                 │
│  2. 自动验证                                                    │
│     └→ 配置格式检查                                              │
│     └→ 敏感信息扫描                                              │
│     └→ 依赖关系检查                                              │
│                                                                 │
│  3. 代码审查                                                    │
│     └→ 同行评审                                                  │
│     └→ 安全团队审核（如需要）                                    │
│                                                                 │
│  4. 合并部署                                                    │
│     └→ 合并到主分支                                              │
│     └→ 触发部署流水线                                            │
│     └→ 推送到配置中心                                            │
│                                                                 │
│  5. 验证监控                                                    │
│     └→ 确认配置生效                                              │
│     └→ 监控相关指标                                              │
│     └→ 记录审计日志                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 配置回滚策略

```typescript
// 配置快照
interface ConfigSnapshot {
  id: string;
  timestamp: Date;
  version: string;
  environment: string;
  config: Record<string, any>;
  featureFlags: FeatureFlag[];
  metadata: {
    deployedBy: string;
    commitHash: string;
    reason: string;
  };
}

// 回滚命令示例
// config rollback --env production --to v1.2.2 --reason "Critical bug in checkout"

async function rollbackConfig(
  environment: string, 
  targetVersion: string, 
  reason: string,
  actor: string
): Promise<void> {
  // 1. 获取目标版本快照
  const snapshot = await getSnapshot(environment, targetVersion);
  
  // 2. 创建当前版本快照（用于回滚恢复）
  const currentSnapshot = await createSnapshot(environment);
  
  // 3. 应用目标版本配置
  await applyConfig(environment, snapshot.config);
  await applyFeatureFlags(environment, snapshot.featureFlags);
  
  // 4. 记录审计日志
  await auditLog.record({
    action: 'rollback',
    environment,
    fromVersion: currentSnapshot.version,
    toVersion: targetVersion,
    reason,
    actor,
    timestamp: new Date()
  });
  
  // 5. 通知相关团队
  await notifyTeam({
    type: 'config_rollback',
    environment,
    fromVersion: currentSnapshot.version,
    toVersion: targetVersion,
    reason
  });
}
```

## 五、监控与告警

### 5.1 配置监控指标

```yaml
# 关键监控指标

配置变更:
  - 配置变更频率
  - 变更失败率
  - 回滚次数
  - 平均变更时间

特性标志:
  - 标志总数
  - 已启用标志数
  - 即将过期的标志数
  - 已过期但仍存在的标志数

安全:
  - 敏感配置访问次数
  - 异常访问模式
  - 密钥轮换状态
  - 权限变更次数

性能:
  - 配置读取延迟
  - 配置中心响应时间
  - 缓存命中率
```

### 5.2 告警规则

```yaml
# 告警规则示例

alerts:
  - name: feature_flag_expiring
    condition: "days_until_expiry < 7"
    severity: warning
    message: "Feature flag {{flag_id}} will expire in {{days}} days"
    
  - name: feature_flag_expired
    condition: "flag_enabled AND expiry_date < now()"
    severity: critical
    message: "Feature flag {{flag_id}} has expired but is still enabled"
    
  - name: config_change_failed
    condition: "config_apply_status == 'failed'"
    severity: critical
    message: "Config change failed for {{environment}}: {{error}}"
    
  - name: secret_access_anomaly
    condition: "secret_access_count > baseline * 3"
    severity: warning
    message: "Unusual access pattern for secret {{secret_id}}"
```

## 六、测试策略

### 6.1 配置测试

```typescript
describe('Configuration Management', () => {
  
  // 测试配置加载
  it('should load config with correct precedence', async () => {
    process.env.DATABASE_HOST = 'env-host';
    
    const config = await loadConfig();
    
    expect(config.database.host).toBe('env-host'); // 环境变量优先
  });
  
  // 测试必需配置
  it('should fail when required config is missing', async () => {
    delete process.env.DATABASE_URL;
    
    await expect(loadConfig()).rejects.toThrow('Missing required config');
  });
  
  // 测试配置验证
  it('should validate config schema', async () => {
    const invalidConfig = { database: { port: 'not-a-number' } };
    
    const result = validator.validate(invalidConfig);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ key: 'database.port' })
    );
  });
});

describe('Feature Flags', () => {
  
  // 测试特性开关
  it('should toggle feature based on flag', async () => {
    await flagRouter.createFlag({
      id: 'test-feature',
      enabled: true
    });
    
    const result = await flagRouter.isEnabled('test-feature');
    expect(result).toBe(true);
  });
  
  // 测试灰度发布
  it('should respect percentage rollout', async () => {
    await flagRouter.createFlag({
      id: 'percentage-feature',
      enabled: true,
      targeting: { percentage: 50 }
    });
    
    // 模拟多次请求
    const results = await Promise.all(
      Array(100).fill(null).map((_, i) => 
        flagRouter.isEnabled('percentage-feature', { userId: `user-${i}` })
      )
    );
    
    const enabledCount = results.filter(Boolean).length;
    // 允许一定误差
    expect(enabledCount).toBeGreaterThan(40);
    expect(enabledCount).toBeLessThan(60);
  });
  
  // 测试特性标志过期
  it('should disable expired flags', async () => {
    await flagRouter.createFlag({
      id: 'expiring-feature',
      enabled: true,
      expiresAt: new Date(Date.now() - 1000) // 1秒前过期
    });
    
    const result = await flagRouter.isEnabled('expiring-feature');
    expect(result).toBe(false);
  });
});
```

## 七、故障排查

### 7.1 常见问题与解决

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 配置不生效 | 缓存未刷新 | 清除缓存或重启服务 |
| 特性标志行为异常 | 目标规则配置错误 | 检查 targeting 配置 |
| 密钥无法解密 | 主密钥错误或密钥轮换不完整 | 验证主密钥，检查密钥版本 |
| 配置中心连接失败 | 网络问题或配置中心宕机 | 检查网络，使用本地缓存后备 |
| 配置回滚失败 | 快照损坏或版本不存在 | 验证快照完整性，检查版本历史 |

### 7.2 调试命令

```bash
# 查看当前配置
config show --env production

# 查看特性标志状态
feature-flags list --env production

# 查看配置历史
config history --env production --limit 10

# 比较配置差异
config diff --env staging production

# 查看密钥访问日志
secrets audit --secret-id db-password --last 24h

# 验证配置格式
config validate --file config/production.yaml
```

## 八、团队协作

### 8.1 角色与职责

```
┌──────────────────────────────────────────────────────────────┐
│                      角色与职责矩阵                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  开发者                                                      │
│  ├── 创建和修改应用配置                                       │
│  ├── 设置开发环境配置                                         │
│  └── 提交配置变更 PR                                         │
│                                                              │
│  运维工程师                                                  │
│  ├── 管理生产环境配置                                         │
│  ├── 配置密钥轮换策略                                         │
│  └── 监控配置系统健康                                         │
│                                                              │
│  安全团队                                                    │
│  ├── 审核敏感配置变更                                         │
│  ├── 管理顶级凭证                                           │
│  └── 审计配置访问日志                                         │
│                                                              │
│  产品经理                                                    │
│  ├── 管理特性标志开关                                         │
│  ├── 设置灰度发布策略                                         │
│  └── 分析 A/B 测试结果                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 变更审批流程

```yaml
# 变更审批规则

审批规则:
  - 触发条件: 生产环境配置变更
    审批人: [运维负责人, 安全团队]
    超时: 24小时
    
  - 触发条件: 敏感配置修改
    审批人: [安全团队]
    超时: 12小时
    
  - 触发条件: 特性标志全量发布
    审批人: [产品经理, 技术负责人]
    超时: 4小时
    
  - 触发条件: 密钥轮换
    审批人: [安全团队, 运维负责人]
    超时: 1小时
    自动批准: true  # 定期轮换可自动批准
```

## 九、清单模板

### 9.1 新特性发布清单

```markdown
## 特性发布检查清单

### 发布前
- [ ] 创建特性标志，设置过期时间
- [ ] 配置目标规则（用户组/百分比）
- [ ] 编写自动化测试覆盖新旧代码路径
- [ ] 文档化特性影响范围
- [ ] 设置监控指标和告警

### 发布中
- [ ] 小范围灰度（1-5%）
- [ ] 监控错误率和性能指标
- [ ] 收集用户反馈
- [ ] 逐步扩大灰度比例
- [ ] 确认无问题后全量发布

### 发布后
- [ ] 监控关键指标24小时
- [ ] 移除特性标志代码
- [ ] 清理配置
- [ ] 更新文档
- [ ] 发布总结
```

### 9.2 配置变更清单

```markdown
## 配置变更检查清单

### 变更前
- [ ] 备份当前配置
- [ ] 验证配置格式正确
- [ ] 检查敏感信息不泄露
- [ ] 评估变更影响范围
- [ ] 准备回滚方案

### 变更中
- [ ] 按审批流程获取批准
- [ ] 在测试环境验证
- [ ] 记录变更原因和责任人
- [ ] 按计划执行变更

### 变更后
- [ ] 验证配置生效
- [ ] 监控相关指标
- [ ] 通知相关团队
- [ ] 更新配置文档
```

## 十、参考资源

### 10.1 推荐工具

| 类别 | 工具 | 说明 |
|------|------|------|
| 配置中心 | Consul, etcd, Zookeeper | 分布式配置存储 |
| 密钥管理 | HashiCorp Vault, AWS Secrets Manager | 敏感信息管理 |
| 特性标志 | LaunchDarkly, Unleash, Flagsmith | 特性标志管理平台 |
| 配置验证 | cekit, conftest | 配置策略验证 |
| 密钥扫描 | git-secrets, truffleHog, Gitleaks | 检测代码中的敏感信息 |

### 10.2 延伸阅读

- [The Twelve-Factor App - Config](https://12factor.net/config)
- [Feature Toggles by Martin Fowler](https://martinfowler.com/articles/feature-toggles.html)
- [GitOps Configuration Management](https://www.gitops.tech/)
- [OWASP Configuration Management](https://owasp.org/www-project-web-security-testing-guide/)

---

*本最佳实践指南持续更新中，如有建议请提交 Issue 或 PR。*