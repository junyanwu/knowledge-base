/**
 * 配置管理系统 - 核心实现
 * 
 * 基于最佳实践设计，支持：
 * - 配置版本控制
 * - 特性标志管理
 * - 配置安全
 * - 变更追踪
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface ConfigValue {
  value: any;
  metadata?: {
    version?: string;
    lastModified?: Date;
    modifiedBy?: string;
    encrypted?: boolean;
  };
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  category: 'release' | 'experiment' | 'ops' | 'permission';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  expiresAt?: Date;
  
  // 目标规则
  targeting?: {
    userGroups?: string[];
    percentage?: number;
    conditions?: TargetingCondition[];
  };
  
  // 变体（用于 A/B 测试）
  variants?: Variant[];
  
  // 审计日志
  auditLog?: AuditEntry[];
}

export interface Variant {
  name: string;
  weight: number; // 0-100
  payload?: any;
}

export interface TargetingCondition {
  type: 'user_id' | 'user_group' | 'user_attribute' | 'environment' | 'custom';
  operator: 'eq' | 'ne' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte' | 'matches';
  key?: string;
  values: any[];
}

export interface AuditEntry {
  timestamp: Date;
  action: 'created' | 'enabled' | 'disabled' | 'updated' | 'deleted';
  actor: string;
  changes?: {
    field: string;
    before: any;
    after: any;
  }[];
  reason?: string;
}

export interface ConfigChangeEvent {
  type: 'config' | 'feature_flag' | 'secret';
  key: string;
  action: 'create' | 'update' | 'delete';
  before?: any;
  after?: any;
  timestamp: Date;
  actor: string;
  environment: string;
}

export interface ToggleContext {
  userId?: string;
  userGroups?: string[];
  userAttributes?: Record<string, any>;
  environment?: string;
  customAttributes?: Record<string, any>;
}

// ============================================================================
// 配置存储接口
// ============================================================================

export interface ConfigStore {
  get(key: string): Promise<ConfigValue | undefined>;
  set(key: string, value: ConfigValue): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<ConfigValue[]>;
  watch(key: string, callback: (value: ConfigValue) => void): () => void;
}

// ============================================================================
// 特性标志路由器
// ============================================================================

export class FeatureFlagRouter {
  private flags: Map<string, FeatureFlag> = new Map();
  private store: ConfigStore;
  private listeners: Set<(event: ConfigChangeEvent) => void> = new Set();
  
  constructor(store: ConfigStore) {
    this.store = store;
  }
  
  /**
   * 判断特性是否启用
   */
  async isEnabled(flagId: string, context?: ToggleContext): Promise<boolean> {
    const flag = await this.getFlag(flagId);
    if (!flag || !flag.enabled) {
      return false;
    }
    
    // 检查过期时间
    if (flag.expiresAt && new Date() > flag.expiresAt) {
      this.logWarning(`Feature flag ${flagId} has expired`);
      return false;
    }
    
    // 没有目标规则，直接返回启用状态
    if (!flag.targeting) {
      return true;
    }
    
    // 应用目标规则
    return this.evaluateTargeting(flag.targeting, context);
  }
  
  /**
   * 获取变体（用于 A/B 测试）
   */
  async getVariant(flagId: string, context?: ToggleContext): Promise<Variant | null> {
    const flag = await this.getFlag(flagId);
    if (!flag?.enabled || !flag.variants?.length) {
      return null;
    }
    
    // 首先检查目标规则
    if (flag.targeting && !this.evaluateTargeting(flag.targeting, context)) {
      return null;
    }
    
    // 基于用户ID一致性选择变体
    const hash = this.hashUserId(flagId, context?.userId || 'anonymous');
    const bucket = (hash % 100);
    
    let cumulative = 0;
    for (const variant of flag.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }
    
    return flag.variants[0];
  }
  
  /**
   * 创建特性标志
   */
  async createFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt' | 'auditLog'>): Promise<FeatureFlag> {
    const now = new Date();
    const newFlag: FeatureFlag = {
      ...flag,
      createdAt: now,
      updatedAt: now,
      auditLog: [{
        timestamp: now,
        action: 'created',
        actor: flag.createdBy,
        reason: 'Initial creation'
      }]
    };
    
    await this.store.set(`flags:${flag.id}`, {
      value: newFlag,
      metadata: {
        version: '1',
        lastModified: now,
        modifiedBy: flag.createdBy
      }
    });
    
    this.emitChange({
      type: 'feature_flag',
      key: flag.id,
      action: 'create',
      after: newFlag,
      timestamp: now,
      actor: flag.createdBy,
      environment: process.env.NODE_ENV || 'development'
    });
    
    this.flags.set(flag.id, newFlag);
    return newFlag;
  }
  
  /**
   * 更新特性标志
   */
  async updateFlag(
    flagId: string, 
    updates: Partial<FeatureFlag>, 
    actor: string,
    reason?: string
  ): Promise<FeatureFlag | null> {
    const existing = await this.getFlag(flagId);
    if (!existing) {
      return null;
    }
    
    const now = new Date();
    const changes: AuditEntry['changes'] = [];
    
    for (const [key, newValue] of Object.entries(updates)) {
      const oldValue = (existing as any)[key];
      if (oldValue !== newValue) {
        changes.push({
          field: key,
          before: oldValue,
          after: newValue
        });
      }
    }
    
    const updated: FeatureFlag = {
      ...existing,
      ...updates,
      updatedAt: now,
      auditLog: [
        ...(existing.auditLog || []),
        {
          timestamp: now,
          action: 'updated',
          actor,
          changes,
          reason
        }
      ]
    };
    
    await this.store.set(`flags:${flagId}`, {
      value: updated,
      metadata: {
        version: String(Number(existing.auditLog?.length || 0) + 1),
        lastModified: now,
        modifiedBy: actor
      }
    });
    
    this.emitChange({
      type: 'feature_flag',
      key: flagId,
      action: 'update',
      before: existing,
      after: updated,
      timestamp: now,
      actor,
      environment: process.env.NODE_ENV || 'development'
    });
    
    this.flags.set(flagId, updated);
    return updated;
  }
  
  /**
   * 删除特性标志
   */
  async deleteFlag(flagId: string, actor: string, reason?: string): Promise<boolean> {
    const existing = await this.getFlag(flagId);
    if (!existing) {
      return false;
    }
    
    await this.store.delete(`flags:${flagId}`);
    
    this.emitChange({
      type: 'feature_flag',
      key: flagId,
      action: 'delete',
      before: existing,
      timestamp: new Date(),
      actor,
      environment: process.env.NODE_ENV || 'development'
    });
    
    this.flags.delete(flagId);
    return true;
  }
  
  /**
   * 监听配置变更
   */
  onChange(callback: (event: ConfigChangeEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  // 私有方法
  
  private async getFlag(flagId: string): Promise<FeatureFlag | undefined> {
    if (this.flags.has(flagId)) {
      return this.flags.get(flagId);
    }
    
    const stored = await this.store.get(`flags:${flagId}`);
    if (stored) {
      this.flags.set(flagId, stored.value);
      return stored.value;
    }
    
    return undefined;
  }
  
  private evaluateTargeting(
    targeting: NonNullable<FeatureFlag['targeting']>, 
    context?: ToggleContext
  ): boolean {
    if (!context) {
      return false;
    }
    
    // 检查用户组
    if (targeting.userGroups?.length) {
      const userGroups = context.userGroups || [];
      if (!userGroups.some(g => targeting.userGroups!.includes(g))) {
        return false;
      }
    }
    
    // 检查百分比
    if (targeting.percentage !== undefined) {
      const hash = this.hashUserId('percentage', context.userId || 'anonymous');
      if ((hash % 100) >= targeting.percentage) {
        return false;
      }
    }
    
    // 检查自定义条件
    if (targeting.conditions?.length) {
      for (const condition of targeting.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  private evaluateCondition(condition: TargetingCondition, context: ToggleContext): boolean {
    let value: any;
    
    switch (condition.type) {
      case 'user_id':
        value = context.userId;
        break;
      case 'user_group':
        value = context.userGroups || [];
        break;
      case 'user_attribute':
        value = context.userAttributes?.[condition.key || ''];
        break;
      case 'environment':
        value = context.environment;
        break;
      case 'custom':
        value = context.customAttributes?.[condition.key || ''];
        break;
    }
    
    switch (condition.operator) {
      case 'eq':
        return value === condition.values[0];
      case 'ne':
        return value !== condition.values[0];
      case 'in':
        return condition.values.includes(value);
      case 'not_in':
        return !condition.values.includes(value);
      case 'gt':
        return value > condition.values[0];
      case 'lt':
        return value < condition.values[0];
      case 'gte':
        return value >= condition.values[0];
      case 'lte':
        return value <= condition.values[0];
      case 'matches':
        return new RegExp(condition.values[0]).test(String(value));
      default:
        return false;
    }
  }
  
  private hashUserId(namespace: string, userId: string): number {
    const str = `${namespace}:${userId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  private emitChange(event: ConfigChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in change listener:', error);
      }
    }
  }
  
  private logWarning(message: string): void {
    console.warn(`[FeatureFlagRouter] ${message}`);
  }
}

// ============================================================================
// 配置管理器
// ============================================================================

export class ConfigManager {
  private store: ConfigStore;
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private defaultTTL: number = 60000; // 1分钟缓存
  
  constructor(store: ConfigStore, options?: { defaultTTL?: number }) {
    this.store = store;
    if (options?.defaultTTL) {
      this.defaultTTL = options.defaultTTL;
    }
  }
  
  /**
   * 获取配置值
   */
  async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    // 检查缓存
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    
    // 从存储获取
    const stored = await this.store.get(key);
    if (!stored) {
      return defaultValue as T;
    }
    
    // 更新缓存
    this.cache.set(key, {
      value: stored.value,
      expires: Date.now() + this.defaultTTL
    });
    
    return stored.value;
  }
  
  /**
   * 设置配置值
   */
  async set(key: string, value: any, actor: string): Promise<void> {
    const existing = await this.store.get(key);
    
    await this.store.set(key, {
      value,
      metadata: {
        lastModified: new Date(),
        modifiedBy: actor
      }
    });
    
    // 清除缓存
    this.cache.delete(key);
  }
  
  /**
   * 刷新缓存
   */
  refreshCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * 监听配置变更
   */
  watch(key: string, callback: (value: any) => void): () => void {
    return this.store.watch(key, (stored) => {
      this.cache.set(key, {
        value: stored.value,
        expires: Date.now() + this.defaultTTL
      });
      callback(stored.value);
    });
  }
}

// ============================================================================
// 决策解耦层 (Feature Decisions)
// ============================================================================

/**
 * 特性决策接口
 * 将特性标志的决策逻辑与业务代码解耦
 */
export interface FeatureDecisions {
  [key: string]: () => boolean | Promise<boolean>;
}

export class FeatureDecisionFactory {
  private router: FeatureFlagRouter;
  private context?: ToggleContext;
  
  constructor(router: FeatureFlagRouter, context?: ToggleContext) {
    this.router = router;
    this.context = context;
  }
  
  /**
   * 创建决策对象
   */
  createDecisions<T extends FeatureDecisions>(definitions: {
    [K in keyof T]: string | (() => boolean | Promise<boolean>)
  }): T {
    const decisions = {} as T;
    
    for (const [key, flagIdOrFn] of Object.entries(definitions)) {
      if (typeof flagIdOrFn === 'function') {
        (decisions as any)[key] = flagIdOrFn;
      } else {
        (decisions as any)[key] = () => this.router.isEnabled(flagIdOrFn, this.context);
      }
    }
    
    return decisions;
  }
  
  /**
   * 更新上下文（用于用户特定的决策）
   */
  withContext(context: ToggleContext): FeatureDecisionFactory {
    return new FeatureDecisionFactory(this.router, context);
  }
}

// ============================================================================
// 内存配置存储实现
// ============================================================================

export class InMemoryConfigStore implements ConfigStore {
  private data: Map<string, ConfigValue> = new Map();
  private watchers: Map<string, Set<(value: ConfigValue) => void>> = new Map();
  
  async get(key: string): Promise<ConfigValue | undefined> {
    return this.data.get(key);
  }
  
  async set(key: string, value: ConfigValue): Promise<void> {
    this.data.set(key, value);
    
    // 通知观察者
    const watchers = this.watchers.get(key);
    if (watchers) {
      for (const callback of watchers) {
        callback(value);
      }
    }
  }
  
  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
  
  async list(prefix?: string): Promise<ConfigValue[]> {
    const values: ConfigValue[] = [];
    for (const [key, value] of this.data) {
      if (!prefix || key.startsWith(prefix)) {
        values.push(value);
      }
    }
    return values;
  }
  
  watch(key: string, callback: (value: ConfigValue) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    
    this.watchers.get(key)!.add(callback);
    
    return () => {
      this.watchers.get(key)?.delete(callback);
    };
  }
}

// ============================================================================
// 导出
// ============================================================================

export default {
  FeatureFlagRouter,
  ConfigManager,
  FeatureDecisionFactory,
  InMemoryConfigStore
};
