# 日志管理系统方案 - 2026

## 一、网上学习总结

### 1.1 现代日志管理系统核心要素

#### **ELK Stack 架构最佳实践**

**Elasticsearch 核心**
- **分布式存储引擎**：支持大规模日志数据存储和实时检索
- **数据流架构**：使用 data streams 管理时序日志数据
- **索引生命周期管理(ILM)**：自动管理日志保留期和存储优化
- **关键配置项**：
  - `cluster.name`: 集群命名规范
  - `node.name`: 节点可读标识
  - `network.host`: 生产环境绑定地址
  - `discovery.seed_hosts`: 集群发现配置
  - `cluster.initial_master_nodes`: 初始主节点选举

**Logstash 数据管道**
- **三阶段处理流程**：
  1. **Inputs**: 数据采集(file, syslog, redis, beats)
  2. **Filters**: 数据处理(grok, mutate, drop, clone, geoip)
  3. **Outputs**: 数据输出(elasticsearch, file, graphite, statsd)
- **Codecs**: 流编解码(json, multiline, plain)
- **性能优化**：管道批处理、工作线程配置

**Kibana 可视化**
- **Discover**: 交互式日志搜索和过滤
- **Visualize**: 图表和可视化构建(Lens 拖拽式)
- **Dashboard**: 综合监控仪表板
- **Alerting**: 日志事件告警规则
- **AI Assistant**: 智能日志分析助手

#### **Grafana Loki 轻量级方案**

**核心优势**
- **低存储成本**：仅索引元数据(labels)，日志内容压缩存储
- **与 Prometheus 兼容**：使用相同的标签体系
- **对象存储友好**：支持 S3、GCS 等低成本存储
- **适合中小规模**：日志量 < 1TB/day 的场景

**架构特点**
```
Promtail → Loki → Grafana
  ↓
日志采集 → 标签索引+压缩存储 → 可视化查询
```

#### **OpenTelemetry 统一可观测性**

**日志规范**
- **结构化日志**：定义稳定的 schema 和类型化字段
- **半结构化日志**：key=value 格式，需标准化处理
- **非结构化日志**：纯文本，需解析提取信息

**最佳实践**
- 使用标准日志库 + OpenTelemetry Bridge
- 自动关联 Traces、Metrics、Logs
- Collector 处理：receivers → processors → exporters
- 支持 filelogreceiver 处理混合格式

### 1.2 日志聚合模式

#### **模式 1: Agent → Centralized Storage**
```
应用 → Filebeat/Fluentd → Elasticsearch/Loki
         ↓
      本地缓存
```
- 优点：集中管理、统一查询
- 缺点：网络依赖、单点故障风险

#### **模式 2: Agent → Queue → Storage**
```
应用 → Filebeat → Kafka → Logstash → Elasticsearch
                   ↓
                消息队列缓冲
```
- 优点：削峰填谷、高可用、解耦
- 缺点：架构复杂、延迟增加

#### **模式 3: Sidecar Pattern**
```
Pod → 应用容器
    → Log Sidecar → Centralized Storage
```
- 优点：容器化环境友好、应用透明
- 缺点：资源消耗高、管理成本

### 1.3 日志分析技术

#### **结构化日志最佳实践**

**字段设计**
```json
{
  "timestamp": "2024-08-04T12:34:56.789Z",
  "level": "INFO",
  "service": "user-authentication",
  "environment": "production",
  "message": "User login successful",
  "context": {
    "userId": "12345",
    "username": "johndoe",
    "ipAddress": "192.168.1.1"
  },
  "traceId": "abc-def-ghi",
  "spanId": "123-456"
}
```

**字段规范**
- `timestamp`: ISO 8601 格式，时区标准化
- `level`: INFO/WARN/ERROR/DEBUG
- `service`: 服务标识
- `environment`: 运行环境
- `message`: 人类可读消息
- `context`: 业务上下文
- `traceId`/`spanId`: 分布式追踪 ID

#### **日志查询技巧**

**Elasticsearch Query DSL**
```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"level": "ERROR"}},
        {"range": {"timestamp": {"gte": "now-1h"}}}
      ],
      "filter": [
        {"term": {"service": "api-gateway"}}
      ]
    }
  }
}
```

**LogQL (Loki)**
```logql
{service="api-gateway", level="ERROR"}
| >= now() - 1h
| json
| line_format "{{.timestamp}} {{.message}}"
```

### 1.4 指标命名最佳实践 (Prometheus)

**命名规范**
- 应用前缀：`prometheus_notifications_total`
- 单位后缀：`http_request_duration_seconds`
- 基本单位：seconds, bytes, meters, celsius
- 累积计数：`_total` 后缀

**标签设计**
- 区分特征：`operation="create|update|delete"`
- 避免高基数：不使用 userId, email 等无界值
- 每个唯一标签组合 = 新时间序列

## 二、当前日志系统分析

### 2.1 现状梳理

#### **现有日志文件**
```
/workspace/quantitative/
├── cta-strategy/
│   ├── monitor.log                    # 策略监控日志
│   └── notification_log.json          # JSON格式通知日志
├── logs/
│   ├── api.log                        # API日志(空)
│   ├── risk_monitor_test.log         # 风险监控日志
│   └── test_alert.log                # 测试告警日志
├── production/logs/
│   ├── paper_trading_20260306.log     # 模拟交易日志
│   └── paper_trading_state.json       # 交易状态
└── quant-bigA/
    └── complete_data_download.log     # 数据下载日志
```

### 2.2 问题诊断

#### **问题 1: 日志分散,无统一管理**
- 日志文件散落在多个目录
- 缺乏统一的日志采集和聚合
- 查询需要逐个文件 grep

#### **问题 2: 格式不统一**
- 文本格式: `[2026-03-06 17:14:40] [INFO] [DATA_UPDATE] 数据更新`
- JSON格式: `notification_log.json` 有结构但无标准 schema
- 缺少关联 ID(traceId/spanId)

#### **问题 3: 重复日志严重**
```
[2026-03-07 13:47:43] [WARNING] [DRAWDOWN_WARNING] 回撤预警...
[2026-03-07 13:47:43] [WARNING] [DRAWDOWN_WARNING] 回撤预警...
[2026-03-07 13:47:43] [WARNING] [DRAWDOWN_WARNING] 回撤预警...
[2026-03-07 13:47:43] [WARNING] [DRAWDOWN_WARNING] 回撤预警...
```
同一事件被记录 4 次,造成日志冗余

#### **问题 4: 缺少日志轮转**
- `paper_trading_20260306.log` 按日期命名但无自动清理
- 无日志大小限制
- 无压缩归档机制

#### **问题 5: 缺少告警和监控**
- 仅记录日志,无实时告警
- 无日志异常检测
- 无可视化仪表板

### 2.3 优势分析

#### **优势 1: 已有结构化日志尝试**
- `notification_log.json` 采用 JSON 格式
- 包含 timestamp, type, name, message 字段

#### **优势 2: 日志级别明确**
- 使用 INFO/WARNING/ERROR 级别
- 便于按级别过滤

#### **优势 3: 业务日志分类清晰**
- 风险监控: `DRAWDOWN_WARNING`, `VAR_BREACH`
- 数据更新: `DATA_UPDATE`
- 交易执行: `订单创建`, `订单成交`, `订单拒绝`

## 三、优化方案设计

### 3.1 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Applications)                      │
│  策略引擎 | 风险监控 | 数据服务 | 交易系统 | API服务           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓ 结构化日志 (JSON)
┌─────────────────────────────────────────────────────────────┐
│              日志采集层 (Log Collection)                      │
│  Filebeat/Fluent Bit → 本地缓存 + 实时转发                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            数据处理层 (Processing Pipeline)                   │
│  Logstash/Vector → 解析、过滤、富化、去重                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            存储层 (Storage & Indexing)                        │
│  Elasticsearch (热数据) + S3/MinIO (冷数据归档)               │
│  或者 Grafana Loki (低成本方案)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            可视化与分析层 (Visualization)                     │
│  Kibana/Grafana → 仪表板 + 告警 + AI 分析                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 技术选型

#### **方案 A: 轻量级方案 (推荐初期)**
```
Filebeat → Loki → Grafana
```
- **优点**: 部署简单、资源消耗低、成本低
- **适用**: 日志量 < 10GB/day
- **成本**: 约 2核4G 服务器 1 台

#### **方案 B: 企业级方案 (长期目标)**
```
Fluent Bit → Kafka → Logstash → Elasticsearch → Kibana
```
- **优点**: 高可用、可扩展、功能强大
- **适用**: 日志量 > 50GB/day, 多服务架构
- **成本**: 约 4核16G 服务器 3-5 台

### 3.3 实施路径

#### **阶段 1: 标准化 (1-2周)**
- [x] 统一日志格式为 JSON
- [x] 添加 traceId/spanId 字段
- [x] 实现日志去重
- [x] 配置日志轮转

#### **阶段 2: 集中化 (2-3周)**
- [ ] 部署 Filebeat/Fluent Bit
- [ ] 配置 Loki/Elasticsearch
- [ ] 创建 Grafana/Kibana 仪表板
- [ ] 设置基础告警规则

#### **阶段 3: 智能化 (持续优化)**
- [ ] 实现日志异常检测
- [ ] 配置 AI 日志分析
- [ ] 建立日志驱动的自动化
- [ ] 优化存储成本

## 四、实施配置

### 4.1 Python 结构化日志配置

#### **统一日志格式定义**

```python
# /workspace/quantitative/config/logging_config.py
import logging
import json
import uuid
from datetime import datetime, timezone
from pythonjsonlogger import jsonlogger
from loguru import logger
import sys

class StructuredFormatter(jsonlogger.JsonFormatter):
    """结构化日志格式化器"""
    
    def add_fields(self, log_record, record, message_dict):
        super(StructuredFormatter, self).add_fields(log_record, record, message_dict)
        
        # 基础字段
        log_record['timestamp'] = datetime.now(timezone.utc).isoformat()
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        
        # 追踪字段
        log_record['traceId'] = getattr(record, 'traceId', str(uuid.uuid4()))
        log_record['spanId'] = getattr(record, 'spanId', str(uuid.uuid4())[:16])
        
        # 业务字段
        log_record['service'] = 'quantitative-trading'
        log_record['environment'] = 'production'  # 从环境变量读取
        log_record['hostname'] = socket.gethostname()
        
        # 位置字段
        log_record['file'] = f"{record.filename}:{record.lineno}"
        log_record['function'] = record.funcName

def setup_logging(log_level='INFO', log_dir='logs'):
    """
    配置结构化日志系统
    
    Args:
        log_level: 日志级别 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: 日志目录
    """
    import os
    import socket
    
    # 创建日志目录
    os.makedirs(log_dir, exist_ok=True)
    
    # 移除 loguru 默认处理器
    logger.remove()
    
    # 控制台输出 (彩色格式)
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
               "<level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
               "<level>{message}</level>",
        level=log_level,
        colorize=True
    )
    
    # JSON 文件输出
    logger.add(
        f"{log_dir}/app_{datetime.now().strftime('%Y%m%d')}.json",
        format="{message}",
        level=log_level,
        rotation="00:00",  # 每天轮转
        retention="30 days",  # 保留30天
        compression="zip",  # 压缩归档
        serialize=True,  # JSON 序列化
        enqueue=True  # 异步写入
    )
    
    # 错误日志单独存储
    logger.add(
        f"{log_dir}/error_{datetime.now().strftime('%Y%m%d')}.json",
        format="{message}",
        level="ERROR",
        rotation="00:00",
        retention="90 days",
        compression="zip",
        serialize=True,
        enqueue=True
    )
    
    # 性能日志 (单独文件)
    logger.add(
        f"{log_dir}/performance_{datetime.now().strftime('%Y%m%d')}.json",
        format="{message}",
        filter=lambda record: record['extra'].get('type') == 'performance',
        rotation="00:00",
        retention="7 days",
        serialize=True,
        enqueue=True
    )
    
    # 审计日志 (单独文件)
    logger.add(
        f"{log_dir}/audit_{datetime.now().strftime('%Y%m%d')}.json",
        format="{message}",
        filter=lambda record: record['extra'].get('type') == 'audit',
        rotation="00:00",
        retention="365 days",  # 审计日志保留1年
        serialize=True,
        enqueue=True
    )
    
    return logger

# 使用示例
if __name__ == "__main__":
    logger = setup_logging()
    
    # 普通日志
    logger.info("系统启动", extra={
        'traceId': 'abc-123',
        'userId': 'user001',
        'action': 'system_startup'
    })
    
    # 性能日志
    logger.info("策略执行完成", extra={
        'type': 'performance',
        'strategy': 'cta_trend',
        'duration_ms': 123,
        'symbols': ['510300', '510500']
    })
    
    # 审计日志
    logger.info("交易执行", extra={
        'type': 'audit',
        'orderId': 'ORD20260306001',
        'action': 'buy',
        'symbol': '510300',
        'quantity': 1000,
        'price': 4.75
    })
```

### 4.2 Filebeat 配置

```yaml
# /etc/filebeat/filebeat.yml

# ================== Filebeat inputs ==================

filebeat.inputs:

# 应用日志
- type: log
  enabled: true
  paths:
    - /workspace/quantitative/logs/*.json
    - /workspace/quantitative/production/logs/*.json
  json.keys_under_root: true
  json.add_error_key: true
  json.message_key: message
  fields:
    log_type: application
    service: quantitative-trading
  fields_under_root: true
  
# 系统日志
- type: log
  enabled: true
  paths:
    - /var/log/*.log
  fields:
    log_type: system
  fields_under_root: true

# 性能日志
- type: log
  enabled: true
  paths:
    - /workspace/quantitative/logs/performance_*.json
  json.keys_under_root: true
  fields:
    log_type: performance
  fields_under_root: true

# 审计日志
- type: log
  enabled: true
  paths:
    - /workspace/quantitative/logs/audit_*.json
  json.keys_under_root: true
  fields:
    log_type: audit
  fields_under_root: true

# ================== Filebeat modules ==================

filebeat.config.modules:
  path: ${path.config}/modules.d/*.yml

# ================== Processors ==================

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
  
  # 去重处理器
  - fingerprint:
      fields: ["timestamp", "level", "message", "traceId"]
      target_field: "@metadata._id"
      ignore_missing: true

# ================== Output to Loki ==================

output.loki:
  hosts: ["localhost:3100"]
  default_labels:
    service: quantitative-trading
    environment: production
  labels:
    log_level: level
    log_type: log_type
    service: service

# ================== Output to Elasticsearch (备选) ==================

# output.elasticsearch:
#   hosts: ["localhost:9200"]
#   index: "quant-trading-%{+yyyy.MM.dd}"
#   pipeline: "timestamp-pipeline"
#   
# setup.ilm.enabled: true
# setup.ilm.rollover_alias: "quant-trading"
# setup.ilm.pattern: "{now/d}-000001"

# ================== Logging ==================

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
```

### 4.3 Loki 配置

```yaml
# /etc/loki/loki-config.yml

auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /tmp/loki
  storage:
    filesystem:
      chunks_directory: /tmp/loki/chunks
      rules_directory: /tmp/loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  retention_period: 730h  # 30天保留期
  
chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 730h

compactor:
  working_directory: /tmp/loki/compactor
  shared_store: filesystem
  retention_enabled: true
  retention_delete_delay: 2h
```

### 4.4 Grafana 数据源配置

```yaml
# /etc/grafana/provisioning/datasources/loki.yml

apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://localhost:3100
    isDefault: true
    editable: false
    jsonData:
      maxLines: 1000
      derivedFields:
        - name: TraceID
          matcherRegex: '"traceId":"(\w+)"'
          url: 'http://localhost:16686/trace/$${__value.raw}'
          datasourceName: Jaeger
```

### 4.5 Grafana Dashboard 配置

```json
{
  "dashboard": {
    "title": "量化交易日志监控",
    "uid": "quant-trading-logs",
    "panels": [
      {
        "title": "错误日志趋势",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(count_over_time({service=\"quantitative-trading\", level=\"ERROR\"} [5m]))",
            "legendFormat": "错误数/5分钟"
          }
        ]
      },
      {
        "title": "日志级别分布",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (level) (count_over_time({service=\"quantitative-trading\"} [1h]))",
            "legendFormat": "{{level}}"
          }
        ]
      },
      {
        "title": "交易执行日志",
        "type": "logs",
        "targets": [
          {
            "expr": "{service=\"quantitative-trading\", log_type=\"audit\"} |= \"交易\"",
            "legendFormat": "交易日志"
          }
        ]
      },
      {
        "title": "性能监控",
        "type": "timeseries",
        "targets": [
          {
            "expr": "avg by (strategy) (rate({log_type=\"performance\"} | json | unwrap duration_ms [5m]))",
            "legendFormat": "{{strategy}} 执行时间(ms)"
          }
        ]
      },
      {
        "title": "风险告警",
        "type": "stat",
        "targets": [
          {
            "expr": "count(count_over_time({service=\"quantitative-trading\"} |= \"DRAWDOWN_WARNING\" [1h]))",
            "legendFormat": "回撤预警次数"
          }
        ]
      }
    ]
  }
}
```

### 4.6 告警规则配置

```yaml
# /etc/loki/rules/quant-trading-alerts.yml

groups:
  - name: quant_trading_alerts
    interval: 1m
    rules:
      # 错误率告警
      - alert: HighErrorRate
        expr: |
          sum(rate({service="quantitative-trading", level="ERROR"} [5m])) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "高错误率告警"
          description: "过去5分钟错误率超过10/分钟"
      
      # 风险监控告警
      - alert: DrawdownWarning
        expr: |
          count(count_over_time({service="quantitative-trading"} |= "DRAWDOWN_WARNING" [15m])) > 3
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "回撤预警"
          description: "15分钟内出现多次回撤预警"
      
      # VaR 突破告警
      - alert: VarBreach
        expr: |
          count(count_over_time({service="quantitative-trading"} |= "VAR_BREACH" [5m])) > 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "VaR突破告警"
          description: "风险价值指标突破,需立即关注"
      
      # 订单拒绝告警
      - alert: OrderRejection
        expr: |
          count(count_over_time({service="quantitative-trading"} |= "订单被拒绝" [10m])) > 5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "订单拒绝频繁"
          description: "10分钟内多个订单被拒绝"
      
      # 性能下降告警
      - alert: PerformanceDegradation
        expr: |
          avg(rate({log_type="performance"} | json | unwrap duration_ms [5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "性能下降"
          description: "策略执行时间超过1秒"
```

## 五、查询模板库

### 5.1 Loki LogQL 查询模板

#### **基础查询**

```logql
# 查看最近1小时的所有日志
{service="quantitative-trading"} [1h]

# 按日志级别过滤
{service="quantitative-trading", level="ERROR"} [1h]

# 按日志类型过滤
{service="quantitative-trading", log_type="audit"} [24h]

# 文本搜索
{service="quantitative-trading"} |= "交易"
{service="quantitative-trading"} != "DEBUG"  # 排除DEBUG日志

# 正则匹配
{service="quantitative-trading"} |~ "订单\\w+"
```

#### **结构化查询**

```logql
# JSON 字段提取
{service="quantitative-trading"} | json | level="ERROR" | userId="user001"

# 多条件过滤
{service="quantitative-trading"} 
  | json 
  | level="ERROR" 
  | action="buy" 
  | symbol="510300"

# 时间范围过滤
{service="quantitative-trading"} 
  | json 
  | timestamp > "2026-03-07T00:00:00Z" 
  | timestamp < "2026-03-07T23:59:59Z"
```

#### **聚合分析**

```logql
# 统计各级别日志数量
sum by (level) (count_over_time({service="quantitative-trading"} [1h]))

# 统计错误趋势
sum(rate({service="quantitative-trading", level="ERROR"} [5m]))

# 按 symbol 分组统计交易次数
sum by (symbol) (count_over_time({log_type="audit"} |= "交易" [1h]))

# 计算平均执行时间
avg(rate({log_type="performance"} | json | unwrap duration_ms [5m]))

# Top 10 错误消息
topk(10, sum by (message) (count_over_time({level="ERROR"} [1h])))
```

#### **高级查询**

```logql
# 错误链路追踪
{service="quantitative-trading"} 
  | json 
  | traceId="abc-123-def-456"

# 去重查询
{service="quantitative-trading"} 
  | json 
  | line_format "{{.timestamp}} {{.level}} {{.message}}" 
  | label_format message="{{.message}}" 
  | dedup

# 分段统计(每10分钟一段)
sum by (level) (count_over_time({service="quantitative-trading"} [10m]))

# 多服务关联查询
{service=~"quantitative-trading|api-gateway|risk-monitor"} 
  | json 
  | traceId="trace-123"
```

### 5.2 Elasticsearch Query DSL 模板

#### **基础查询**

```json
// 查看最近1小时的错误日志
{
  "query": {
    "bool": {
      "must": [
        {"term": {"level": "ERROR"}},
        {"range": {"timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "sort": [{"timestamp": {"order": "desc"}}],
  "size": 100
}

// 模糊搜索
{
  "query": {
    "match": {
      "message": "交易失败"
    }
  }
}

// 多字段搜索
{
  "query": {
    "multi_match": {
      "query": "订单",
      "fields": ["message", "context.orderId"]
    }
  }
}
```

#### **聚合分析**

```json
// 按日志级别统计
{
  "size": 0,
  "aggs": {
    "levels": {
      "terms": {"field": "level"}
    }
  }
}

// 按时间分段统计
{
  "size": 0,
  "aggs": {
    "over_time": {
      "date_histogram": {
        "field": "timestamp",
        "calendar_interval": "hour"
      },
      "aggs": {
        "levels": {
          "terms": {"field": "level"}
        }
      }
    }
  }
}

// 错误Top N
{
  "size": 0,
  "aggs": {
    "error_messages": {
      "terms": {
        "field": "message.keyword",
        "size": 10
      }
    }
  },
  "query": {
    "term": {"level": "ERROR"}
  }
}
```

### 5.3 Python 日志查询助手

```python
# /workspace/quantitative/utils/log_query.py

import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class LogQuery:
    """日志查询助手"""
    
    def __init__(self, loki_url="http://localhost:3100"):
        self.loki_url = loki_url
        self.es_url = "http://localhost:9200"
    
    def query_loki(self, logql: str, limit: int = 100) -> List[Dict]:
        """
        查询 Loki 日志
        
        Args:
            logql: LogQL 查询语句
            limit: 返回条数限制
        
        Returns:
            日志列表
        """
        url = f"{self.loki_url}/loki/api/v1/query_range"
        params = {
            "query": logql,
            "limit": limit,
            "start": int((datetime.now() - timedelta(hours=1)).timestamp() * 1e9),
            "end": int(datetime.now().timestamp() * 1e9)
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        results = []
        for stream in response.json()["data"]["result"]:
            for value in stream["values"]:
                results.append({
                    "timestamp": value[0],
                    "log": value[1],
                    "labels": stream["stream"]
                })
        
        return results
    
    def query_elasticsearch(self, query: Dict, index="quant-trading-*") -> List[Dict]:
        """
        查询 Elasticsearch 日志
        
        Args:
            query: Elasticsearch Query DSL
            index: 索引名称
        
        Returns:
            日志列表
        """
        url = f"{self.es_url}/{index}/_search"
        response = requests.post(url, json=query)
        response.raise_for_status()
        
        return [hit["_source"] for hit in response.json()["hits"]["hits"]]
    
    def get_errors(self, time_range: str = "1h", level: str = "ERROR") -> List[Dict]:
        """获取错误日志"""
        logql = f'{{service="quantitative-trading", level="{level}"}} [{time_range}]'
        return self.query_loki(logql)
    
    def get_trades(self, symbol: Optional[str] = None, time_range: str = "1h") -> List[Dict]:
        """获取交易日志"""
        logql = f'{{log_type="audit"}} |= "交易"'
        if symbol:
            logql += f' | symbol="{symbol}"'
        logql += f' [{time_range}]'
        return self.query_loki(logql)
    
    def get_performance(self, strategy: Optional[str] = None, time_range: str = "1h") -> List[Dict]:
        """获取性能日志"""
        logql = f'{{log_type="performance"}}'
        if strategy:
            logql += f' | strategy="{strategy}"'
        logql += f' [{time_range}]'
        return self.query_loki(logql)
    
    def trace_request(self, trace_id: str) -> List[Dict]:
        """追踪请求链路"""
        logql = f'{{service="quantitative-trading"}} | json | traceId="{trace_id}"'
        return self.query_loki(logql)

# 使用示例
if __name__ == "__main__":
    query = LogQuery()
    
    # 获取最近1小时的错误
    errors = query.get_errors("1h")
    print(f"最近1小时错误数: {len(errors)}")
    
    # 获取特定标的的交易记录
    trades = query.get_trades(symbol="510300", time_range="24h")
    print(f"510300 最近24小时交易: {len(trades)}")
    
    # 追踪请求
    trace = query.trace_request("abc-123-def-456")
    print(f"链路追踪结果: {len(trace)} 条日志")
```

## 六、验证标准

### 6.1 日志完整性 (目标 >95%)

#### **验证指标**
- 日志采集覆盖率: 所有应用日志是否被采集
- 日志丢失率: 网络故障、队列满导致的日志丢失比例
- 字段完整性: 日志字段是否完整(traceId, timestamp等)

#### **测试方法**
```python
# 测试日志完整性
import logging
import random

logger = logging.getLogger(__name__)

# 发送1000条测试日志
for i in range(1000):
    logger.info(f"测试日志 #{i}", extra={
        'test_id': 'integrity_test',
        'sequence': i
    })

# 查询验证
query = LogQuery()
test_logs = query.query_loki('{test_id="integrity_test"} [1h]')
print(f"发送: 1000条, 接收: {len(test_logs)}条, 完整性: {len(test_logs)/1000*100:.2f}%")
```

### 6.2 查询效率 (目标 <1s)

#### **验证指标**
- 简单查询响应时间: < 100ms
- 复杂聚合查询: < 1s
- 大范围时间查询(>7天): < 5s

#### **测试方法**
```python
import time

def benchmark_query():
    query = LogQuery()
    
    # 测试1: 简单查询
    start = time.time()
    query.get_errors("1h")
    simple_time = time.time() - start
    print(f"简单查询: {simple_time*1000:.2f}ms")
    
    # 测试2: 聚合查询
    start = time.time()
    query.query_loki('sum by (level) (count_over_time({service="quantitative-trading"} [1h]))')
    agg_time = time.time() - start
    print(f"聚合查询: {agg_time*1000:.2f}ms")
    
    # 测试3: 大范围查询
    start = time.time()
    query.get_errors("7d")
    range_time = time.time() - start
    print(f"7天范围查询: {range_time*1000:.2f}ms")

benchmark_query()
```

### 6.3 存储优化

#### **验证指标**
- 日志压缩率: > 70%
- 冷热数据分离: 热数据(<7天) SSD, 冷数据(>30天) 对象存储
- 存储成本降低: 相比原始文本存储降低 > 50%

#### **测试方法**
```bash
# 检查存储使用情况
ls -lh /workspace/quantitative/logs/
du