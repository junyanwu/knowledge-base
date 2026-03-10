/**
 * 配置安全模块
 * 
 * 实现敏感配置的安全管理：
 * - 加密存储
 * - 访问控制
 * - 审计日志
 * - 密钥轮换
 */

import crypto from 'crypto';

// ============================================================================
// 类型定义
// ============================================================================

export interface SecretConfig {
  id: string;
  key: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastAccessedAt?: Date;
  rotationPolicy?: SecretRotationPolicy;
}

export interface SecretRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
}

export interface AccessControlEntry {
  principal: string;  // user id or role
  permissions: SecretPermission[];
  grantedAt: Date;
  grantedBy: string;
}

export type SecretPermission = 'read' | 'write' | 'delete' | 'admin';

export interface SecretAccessAuditLog {
  id: string;
  timestamp: Date;
  secretId: string;
  principal: string;
  action: 'read' | 'write' | 'delete' | 'rotate';
  success: boolean;
  ipAddress: string;
  userAgent: string;
  reason?: string;
}

// ============================================================================
// 加密管理器
// ============================================================================

export class EncryptionManager {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor(masterKey: string | Buffer) {
    if (typeof masterKey === 'string') {
      // 从字符串派生密钥
      this.key = crypto.scryptSync(masterKey, 'salt', 32);
    } else {
      this.key = masterKey;
    }
  }
  
  /**
   * 加密敏感值
   */
  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  /**
   * 解密敏感值
   */
  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm, 
      this.key, 
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * 生成新的主密钥
   */
  static generateMasterKey(): Buffer {
    return crypto.randomBytes(32);
  }
}

// ============================================================================
// 密钥管理服务
// ============================================================================

export class SecretsManager {
  private store: Map<string, SecretConfig> = new Map();
  private accessControl: Map<string, AccessControlEntry[]> = new Map();
  private auditLog: SecretAccessAuditLog[] = [];
  private encryption: EncryptionManager;
  private currentPrincipal: string;
  
  constructor(encryption: EncryptionManager, principal: string) {
    this.encryption = encryption;
    this.currentPrincipal = principal;
  }
  
  /**
   * 存储敏感配置
   */
  async storeSecret(
    key: string, 
    value: string, 
    options?: {
      rotationPolicy?: SecretRotationPolicy;
      actor?: string;
    }
  ): Promise<SecretConfig> {
    const now = new Date();
    const encrypted = this.encryption.encrypt(value);
    
    const existing = this.findSecretByKey(key);
    const version = existing ? existing.version + 1 : 1;
    
    const secret: SecretConfig = {
      id: existing?.id || crypto.randomUUID(),
      key,
      encryptedValue: encrypted.encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      version,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      createdBy: existing?.createdBy || options?.actor || this.currentPrincipal,
      rotationPolicy: options?.rotationPolicy
    };
    
    this.store.set(secret.id, secret);
    
    // 记录审计日志
    this.logAccess({
      secretId: secret.id,
      action: 'write',
      success: true
    });
    
    return secret;
  }
  
  /**
   * 获取敏感配置
   */
  async getSecret(key: string, options?: { actor?: string; reason?: string }): Promise<string | null> {
    const secret = this.findSecretByKey(key);
    if (!secret) {
      return null;
    }
    
    // 检查访问权限
    const actor = options?.actor || this.currentPrincipal;
    if (!this.hasPermission(secret.id, actor, 'read')) {
      this.logAccess({
        secretId: secret.id,
        action: 'read',
        success: false,
        reason: 'Access denied'
      });
      throw new Error(`Access denied to secret: ${key}`);
    }
    
    // 解密
    const decrypted = this.encryption.decrypt(
      secret.encryptedValue,
      secret.iv,
      secret.authTag
    );
    
    // 更新最后访问时间
    secret.lastAccessedAt = new Date();
    
    // 记录审计日志
    this.logAccess({
      secretId: secret.id,
      action: 'read',
      success: true,
      reason: options?.reason
    });
    
    return decrypted;
  }
  
  /**
   * 轮换密钥
   */
  async rotateSecret(
    key: string, 
    newValue: string, 
    options?: { actor?: string; reason?: string }
  ): Promise<SecretConfig> {
    const existing = this.findSecretByKey(key);
    if (!existing) {
      throw new Error(`Secret not found: ${key}`);
    }
    
    const actor = options?.actor || this.currentPrincipal;
    
    // 检查权限
    if (!this.hasPermission(existing.id, actor, 'write')) {
      throw new Error(`Access denied to rotate secret: ${key}`);
    }
    
    const rotated = await this.storeSecret(key, newValue, {
      actor,
      rotationPolicy: existing.rotationPolicy
    });
    
    // 记录审计日志
    this.logAccess({
      secretId: rotated.id,
      action: 'rotate',
      success: true,
      reason: options?.reason
    });
    
    return rotated;
  }
  
  /**
   * 删除敏感配置
   */
  async deleteSecret(key: string, options?: { actor?: string; reason?: string }): Promise<boolean> {
    const secret = this.findSecretByKey(key);
    if (!secret) {
      return false;
    }
    
    const actor = options?.actor || this.currentPrincipal;
    
    // 检查权限
    if (!this.hasPermission(secret.id, actor, 'delete')) {
      this.logAccess({
        secretId: secret.id,
        action: 'delete',
        success: false,
        reason: 'Access denied'
      });
      throw new Error(`Access denied to delete secret: ${key}`);
    }
    
    this.store.delete(secret.id);
    this.accessControl.delete(secret.id);
    
    // 记录审计日志
    this.logAccess({
      secretId: secret.id,
      action: 'delete',
      success: true,
      reason: options?.reason
    });
    
    return true;
  }
  
  /**
   * 授予访问权限
   */
  grantAccess(
    secretKey: string,
    principal: string,
    permissions: SecretPermission[],
    grantedBy: string
  ): void {
    const secret = this.findSecretByKey(secretKey);
    if (!secret) {
      throw new Error(`Secret not found: ${secretKey}`);
    }
    
    if (!this.accessControl.has(secret.id)) {
      this.accessControl.set(secret.id, []);
    }
    
    const entries = this.accessControl.get(secret.id)!;
    
    // 检查是否已存在
    const existingIndex = entries.findIndex(e => e.principal === principal);
    const newEntry: AccessControlEntry = {
      principal,
      permissions,
      grantedAt: new Date(),
      grantedBy
    };
    
    if (existingIndex >= 0) {
      entries[existingIndex] = newEntry;
    } else {
      entries.push(newEntry);
    }
  }
  
  /**
   * 撤销访问权限
   */
  revokeAccess(secretKey: string, principal: string): void {
    const secret = this.findSecretByKey(secretKey);
    if (!secret) {
      return;
    }
    
    const entries = this.accessControl.get(secret.id);
    if (!entries) {
      return;
    }
    
    const index = entries.findIndex(e => e.principal === principal);
    if (index >= 0) {
      entries.splice(index, 1);
    }
  }
  
  /**
   * 获取审计日志
   */
  getAuditLogs(options?: {
    secretId?: string;
    principal?: string;
    action?: SecretAccessAuditLog['action'];
    startDate?: Date;
    endDate?: Date;
  }): SecretAccessAuditLog[] {
    let logs = [...this.auditLog];
    
    if (options?.secretId) {
      logs = logs.filter(l => l.secretId === options.secretId);
    }
    if (options?.principal) {
      logs = logs.filter(l => l.principal === options.principal);
    }
    if (options?.action) {
      logs = logs.filter(l => l.action === options.action);
    }
    if (options?.startDate) {
      logs = logs.filter(l => l.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      logs = logs.filter(l => l.timestamp <= options.endDate!);
    }
    
    return logs;
  }
  
  /**
   * 检查需要轮换的密钥
   */
  checkRotationNeeded(): SecretConfig[] {
    const now = new Date();
    const needsRotation: SecretConfig[] = [];
    
    for (const secret of this.store.values()) {
      if (!secret.rotationPolicy?.enabled) {
        continue;
      }
      
      const lastRotated = secret.rotationPolicy.lastRotatedAt || secret.createdAt;
      const nextRotation = new Date(
        lastRotated.getTime() + secret.rotationPolicy.intervalDays * 24 * 60 * 60 * 1000
      );
      
      if (now >= nextRotation) {
        needsRotation.push(secret);
      }
    }
    
    return needsRotation;
  }
  
  // 私有方法
  
  private findSecretByKey(key: string): SecretConfig | undefined {
    for (const secret of this.store.values()) {
      if (secret.key === key) {
        return secret;
      }
    }
    return undefined;
  }
  
  private hasPermission(secretId: string, principal: string, permission: SecretPermission): boolean {
    const entries = this.accessControl.get(secretId);
    if (!entries) {
      // 如果没有配置访问控制，允许所有访问（开发模式）
      return true;
    }
    
    for (const entry of entries) {
      if (entry.principal === principal || entry.principal === '*') {
        if (entry.permissions.includes(permission) || entry.permissions.includes('admin')) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private logAccess(params: {
    secretId: string;
    action: SecretAccessAuditLog['action'];
    success: boolean;
    reason?: string;
  }): void {
    this.auditLog.push({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      secretId: params.secretId,
      principal: this.currentPrincipal,
      action: params.action,
      success: params.success,
      ipAddress: '127.0.0.1', // 应从请求中获取
      userAgent: 'ConfigSystem/1.0', // 应从请求中获取
      reason: params.reason
    });
  }
}

// ============================================================================
// 配置验证器
// ============================================================================

export interface ValidationRule {
  key: string;
  type: 'required' | 'format' | 'range' | 'enum' | 'custom';
  params?: any;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  key: string;
  rule: string;
  message: string;
}

export class ConfigValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  
  /**
   * 添加验证规则
   */
  addRule(rule: ValidationRule): void {
    if (!this.rules.has(rule.key)) {
      this.rules.set(rule.key, []);
    }
    this.rules.get(rule.key)!.push(rule);
  }
  
  /**
   * 验证配置
   */
  validate(config: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    
    for (const [key, rules] of this.rules) {
      const value = config[key];
      
      for (const rule of rules) {
        const error = this.validateRule(key, value, rule);
        if (error) {
          errors.push(error);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private validateRule(key: string, value: any, rule: ValidationRule): ValidationError | null {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return { key, rule: rule.type, message: rule.message };
        }
        break;
        
      case 'format':
        if (value && !new RegExp(rule.params.pattern).test(String(value))) {
          return { key, rule: rule.type, message: rule.message };
        }
        break;
        
      case 'range':
        if (typeof value === 'number') {
          if (rule.params.min !== undefined && value < rule.params.min) {
            return { key, rule: rule.type, message: rule.message };
          }
          if (rule.params.max !== undefined && value > rule.params.max) {
            return { key, rule: rule.type, message: rule.message };
          }
        }
        break;
        
      case 'enum':
        if (value && !rule.params.values.includes(value)) {
          return { key, rule: rule.type, message: rule.message };
        }
        break;
        
      case 'custom':
        if (rule.params.validator && !rule.params.validator(value)) {
          return { key, rule: rule.type, message: rule.message };
        }
        break;
    }
    
    return null;
  }
}

// ============================================================================
// 密钥泄露检测
// ============================================================================

export class SecretDetector {
  private patterns: Array<{ name: string; pattern: RegExp }> = [
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
    { name: 'AWS Secret Key', pattern: /[A-Za-z0-9/+=]{40}/ },
    { name: 'GitHub Token', pattern: /ghp_[A-Za-z0-9]{36}/ },
    { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/ },
    { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/ },
    { name: 'API Key Generic', pattern: /api[_-]?key\s*[:=]\s*['"]?[A-Za-z0-9]{20,}['"]?/i },
    { name: 'Password in Config', pattern: /password\s*[:=]\s*['"]?[^'"}\s]+['"]?/i },
    { name: 'Database URL', pattern: /(?:mysql|postgres|mongodb|redis):\/\/[^:]+:[^@]+@/ }
  ];
  
  /**
   * 检测内容中的密钥
   */
  detect(content: string): Array<{ name: string; match: string; position: number }> {
    const findings: Array<{ name: string; match: string; position: number }> = [];
    
    for (const { name, pattern } of this.patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        findings.push({
          name,
          match: match[0],
          position: match.index
        });
      }
    }
    
    return findings;
  }
  
  /**
   * 检查配置对象
   */
  detectInConfig(config: Record<string, any>): Map<string, Array<{ name: string; match: string }>> {
    const results = new Map<string, Array<{ name: string; match: string }>>();
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        const findings = this.detect(value);
        if (findings.length > 0) {
          results.set(key, findings.map(f => ({ name: f.name, match: f.match })));
        }
      }
    }
    
    return results;
  }
}

// ============================================================================
// 导出
// ============================================================================

export default {
  EncryptionManager,
  SecretsManager,
  ConfigValidator,
  SecretDetector
};
