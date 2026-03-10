/**
 * 配置管理系统使用示例
 */

import {
  FeatureFlagRouter,
  ConfigManager,
  FeatureDecisionFactory,
  InMemoryConfigStore,
  FeatureFlag,
  ToggleContext
} from './index';

import {
  SecretsManager,
  EncryptionManager,
  ConfigValidator,
  SecretDetector
} from './config-security';

// ============================================================================
// 示例 1: 特性标志基础使用
// ============================================================================

async function featureFlagExample() {
  console.log('=== 特性标志基础使用 ===\n');

  // 创建存储和路由器
  const store = new InMemoryConfigStore();
  const router = new FeatureFlagRouter(store);

  // 创建特性标志
  const newCheckoutFlag = await router.createFlag({
    id: 'new-checkout-flow',
    name: '新版结账流程',
    description: '重构后的结账体验',
    category: 'release',
    enabled: true,
    createdBy: 'john@example.com',
    expiresAt: new Date('2024-03-15'),
    targeting: {
      percentage: 50,
      userGroups: ['beta-testers', 'internal-users']
    }
  });

  console.log('创建特性标志:', newCheckoutFlag.name);

  // 检查特性是否启用（普通用户）
  const normalUserContext: ToggleContext = {
    userId: 'user-123',
    userGroups: ['standard']
  };
  const enabledForNormalUser = await router.isEnabled('new-checkout-flow', normalUserContext);
  console.log('普通用户特性启用:', enabledForNormalUser);

  // 检查特性是否启用（Beta用户）
  const betaUserContext: ToggleContext = {
    userId: 'beta-user-456',
    userGroups: ['beta-testers']
  };
  const enabledForBetaUser = await router.isEnabled('new-checkout-flow', betaUserContext);
  console.log('Beta用户特性启用:', enabledForBetaUser);

  // 获取变体（A/B测试）
  const variant = await router.getVariant('new-checkout-flow', betaUserContext);
  console.log('用户变体:', variant?.name);
}

// ============================================================================
// 示例 2: 决策解耦模式
// ============================================================================

async function decisionDecouplingExample() {
  console.log('\n=== 决策解耦模式 ===\n');

  const store = new InMemoryConfigStore();
  const router = new FeatureFlagRouter(store);

  // 创建多个特性标志
  await router.createFlag({
    id: 'new-payment-flow',
    name: '新支付流程',
    description: '简化的支付体验',
    category: 'release',
    enabled: true,
    createdBy: 'team-payment@example.com'
  });

  await router.createFlag({
    id: 'ml-recommendations',
    name: '机器学习推荐',
    description: '基于ML的个性化推荐',
    category: 'experiment',
    enabled: false,
    createdBy: 'data-team@example.com'
  });

  // 创建决策工厂
  const factory = new FeatureDecisionFactory(router);

  // 定义决策接口
  interface AppDecisions {
    useNewPaymentFlow: () => Promise<boolean>;
    useMLRecommendations: () => Promise<boolean>;
    getPaymentProcessor: () => Promise<string>;
  }

  // 创建决策对象
  const decisions = factory.createDecisions<AppDecisions>({
    useNewPaymentFlow: () => router.isEnabled('new-payment-flow'),
    useMLRecommendations: () => router.isEnabled('ml-recommendations'),
    getPaymentProcessor: async () => {
      const enabled = await router.isEnabled('new-payment-flow');
      return enabled ? 'NewPaymentProcessor' : 'LegacyPaymentProcessor';
    }
  });

  // 业务代码使用决策
  async function processPayment(orderId: string) {
    const processor = await decisions.getPaymentProcessor();
    console.log(`处理订单 ${orderId} 使用处理器: ${processor}`);
  }

  await processPayment('order-123');
}

// ============================================================================
// 示例 3: 配置管理
// ============================================================================

async function configManagerExample() {
  console.log('\n=== 配置管理 ===\n');

  const store = new InMemoryConfigStore();
  const manager = new ConfigManager(store);

  // 设置配置
  await manager.set('database.host', 'localhost', 'admin@example.com');
  await manager.set('database.port', 5432, 'admin@example.com');
  await manager.set('cache.ttl', 3600, 'admin@example.com');

  // 获取配置
  const dbHost = await manager.get<string>('database.host', 'default-host');
  const dbPort = await manager.get<number>('database.port', 3306);
  const cacheTTL = await manager.get<number>('cache.ttl', 1800);

  console.log('数据库主机:', dbHost);
  console.log('数据库端口:', dbPort);
  console.log('缓存TTL:', cacheTTL);

  // 监听配置变更
  const unsubscribe = manager.watch('database.host', (newValue) => {
    console.log('数据库主机已变更为:', newValue);
  });

  // 更新配置
  await manager.set('database.host', 'new-db-server', 'admin@example.com');

  // 取消监听
  unsubscribe();
}

// ============================================================================
// 示例 4: 敏感配置管理
// ============================================================================

async function secretsManagerExample() {
  console.log('\n=== 敏感配置管理 ===\n');

  // 创建加密管理器
  const masterKey = EncryptionManager.generateMasterKey();
  const encryption = new EncryptionManager(masterKey);
  const secretsManager = new SecretsManager(encryption, 'admin@example.com');

  // 存储敏感配置
  await secretsManager.storeSecret('database.password', 'super-secret-password', {
    actor: 'admin@example.com',
    rotationPolicy: {
      enabled: true,
      intervalDays: 30
    }
  });

  await secretsManager.storeSecret('api.key', 'ak_live_xxxxxxxxxxxx', {
    actor: 'admin@example.com'
  });

  // 获取敏感配置
  const dbPassword = await secretsManager.getSecret('database.password', {
    reason: '数据库连接'
  });
  console.log('数据库密码:', dbPassword ? '***已获取***' : '未找到');

  // 授予访问权限
  secretsManager.grantAccess('database.password', 'app-service', ['read'], 'admin@example.com');

  // 检查需要轮换的密钥
  const needsRotation = secretsManager.checkRotationNeeded();
  console.log('需要轮换的密钥数量:', needsRotation.length);

  // 查看审计日志
  const auditLogs = secretsManager.getAuditLogs();
  console.log('审计日志数量:', auditLogs.length);
}

// ============================================================================
// 示例 5: 配置验证
// ============================================================================

async function configValidationExample() {
  console.log('\n=== 配置验证 ===\n');

  const validator = new ConfigValidator();

  // 添加验证规则
  validator.addRule({
    key: 'database.host',
    type: 'required',
    message: '数据库主机地址不能为空'
  });

  validator.addRule({
    key: 'database.port',
    type: 'range',
    params: { min: 1, max: 65535 },
    message: '端口号必须在 1-65535 范围内'
  });

  validator.addRule({
    key: 'api.key',
    type: 'format',
    params: { pattern: '^ak_(test|live)_[a-zA-Z0-9]+$' },
    message: 'API密钥格式无效'
  });

  // 验证配置
  const validConfig = {
    'database.host': 'localhost',
    'database.port': 5432,
    'api.key': 'ak_live_abc123xyz'
  };

  const result1 = validator.validate(validConfig);
  console.log('有效配置验证结果:', result1.valid);

  const invalidConfig = {
    'database.host': '',  // 空
    'database.port': 99999,  // 超出范围
    'api.key': 'invalid-key'  // 格式错误
  };

  const result2 = validator.validate(invalidConfig);
  console.log('无效配置验证结果:', result2.valid);
  console.log('错误信息:', result2.errors);
}

// ============================================================================
// 示例 6: 密钥泄露检测
// ============================================================================

function secretDetectionExample() {
  console.log('\n=== 密钥泄露检测 ===\n');

  const detector = new SecretDetector();

  // 检测代码中的敏感信息
  const codeContent = `
    const config = {
      database: {
        url: 'postgresql://admin:password123@localhost:5432/mydb'
      },
      api: {
        key: 'ak_live_abc123xyz456def789'
      },
      jwt: {
        secret: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      }
    };
  `;

  const findings = detector.detect(codeContent);
  console.log('检测到敏感信息:');
  findings.forEach(finding => {
    console.log(`- ${finding.name}: ${finding.match.substring(0, 20)}...`);
  });

  // 检测配置对象
  const configObject = {
    'database.url': 'postgresql://user:secret@localhost/db',
    'api.key': 'ghp_1234567890abcdefghijklmnopqrstuv',
    'server.host': 'localhost'
  };

  const configFindings = detector.detectInConfig(configObject);
  console.log('\n配置对象中的敏感信息:');
  for (const [key, findings] of configFindings) {
    console.log(`- ${key}: ${findings.map(f => f.name).join(', ')}`);
  }
}

// ============================================================================
// 示例 7: 完整应用配置管理
// ============================================================================

async function completeExample() {
  console.log('\n=== 完整应用配置管理 ===\n');

  // 初始化
  const store = new InMemoryConfigStore();
  const router = new FeatureFlagRouter(store);
  const manager = new ConfigManager(store);

  const masterKey = EncryptionManager.generateMasterKey();
  const encryption = new EncryptionManager(masterKey);
  const secrets = new SecretsManager(encryption, 'system');

  // 1. 配置应用
  await manager.set('app.name', 'My Application', 'system');
  await manager.set('app.version', '1.0.0', 'system');

  // 2. 配置特性标志
  await router.createFlag({
    id: 'dark-mode',
    name: '深色模式',
    description: '用户界面深色主题',
    category: 'release',
    enabled: true,
    createdBy: 'ui-team@example.com',
    targeting: {
      userGroups: ['beta-testers']
    }
  });

  // 3. 存储敏感配置
  await secrets.storeSecret('jwt.secret', 'super-secret-jwt-key', {
    rotationPolicy: { enabled: true, intervalDays: 90 }
  });

  // 4. 监听配置变更
  router.onChange((event) => {
    console.log(`[变更通知] ${event.type}.${event.key}: ${event.action}`);
  });

  // 5. 应用启动时验证
  const validator = new ConfigValidator();
  validator.addRule({ key: 'app.name', type: 'required', message: '应用名称必需' });
  validator.addRule({ key: 'app.version', type: 'required', message: '版本号必需' });

  const config = {
    'app.name': await manager.get('app.name'),
    'app.version': await manager.get('app.version')
  };

  const validation = validator.validate(config);
  if (!validation.valid) {
    console.error('配置验证失败:', validation.errors);
    return;
  }

  console.log('应用配置验证通过');
  console.log('应用名称:', config['app.name']);
  console.log('版本:', config['app.version']);

  // 6. 运行时检查特性
  const userContext: ToggleContext = {
    userId: 'user-001',
    userGroups: ['beta-testers']
  };

  const darkModeEnabled = await router.isEnabled('dark-mode', userContext);
  console.log('深色模式已启用:', darkModeEnabled);

  // 7. 检查密钥轮换
  const keysToRotate = secrets.checkRotationNeeded();
  if (keysToRotate.length > 0) {
    console.log('警告: 有密钥需要轮换:', keysToRotate.map(k => k.key).join(', '));
  }
}

// ============================================================================
// 运行示例
// ============================================================================

async function main() {
  try {
    await featureFlagExample();
    await decisionDecouplingExample();
    await configManagerExample();
    await secretsManagerExample();
    await configValidationExample();
    secretDetectionExample();
    await completeExample();

    console.log('\n=== 所有示例运行完成 ===');
  } catch (error) {
    console.error('示例运行错误:', error);
  }
}

// 运行
main().catch(console.error);

export {
  featureFlagExample,
  decisionDecouplingExample,
  configManagerExample,
  secretsManagerExample,
  configValidationExample,
  secretDetectionExample,
  completeExample
};
