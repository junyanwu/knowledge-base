# 日志系统部署指南

## 快速开始

### 1. 本地开发环境部署

#### 步骤 1: 安装依赖

```bash
# 进入项目目录
cd /workspace/quantitative

# 创建虚拟环境(如果还没有)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装 Python 依赖
pip install loguru python-json-logger requests
```

#### 步骤 2: 测试日志系统

```bash
# 运行测试脚本
python tests/test_logging_system.py

# 查看生成的日志文件
ls -lh logs/test/

# 查看 JSON 格式日志
cat logs/test/app_*.json | jq '.' | head -20
```

### 2. Loki + Grafana 轻量级部署

#### 步骤 1: 使用 Docker Compose 部署

创建 `docker-compose.yml`:

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:latest
    container_name: quant-loki
    ports:
      - "3100:3100"
    volumes:
      - ./config/loki-config.yml:/etc/loki/loki-config.yml
      - loki-data:/loki
    command: -config.file=/etc/loki/loki-config.yml
    networks:
      - logging-network

  promtail:
    image: grafana/promtail:latest
    container_name: quant-promtail
    volumes:
      - ./logs:/var/log/quant
      - ./config/promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
    networks:
      - logging-network
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:latest
    container_name: quant-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_AUTH_ANONYMOUS_ENABLED=true
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
      - ./config/grafana-dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml
      - ./config/dashboards:/var/lib/grafana/dashboards
    networks:
      - logging-network
    depends_on:
      - loki

networks:
  logging-network:
    driver: bridge

volumes:
  loki-data:
  grafana-data:
```

#### 步骤 2: 创建配置文件

**`config/loki-config.yml`**:
```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
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
  retention_period: 720h  # 30天

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h

compactor:
  working_directory: /loki/compactor
  shared_store: filesystem
  retention_enabled: true
  retention_delete_delay: 2h
```

**`config/promtail-config.yml`**:
```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: quant-trading
    static_configs:
      - targets:
          - localhost
        labels:
          job: quant-trading
          __path__: /var/log/quant/*.json
    pipeline_stages:
      - json:
          expressions:
            timestamp: timestamp
            level: level
            service: service
            message: message
      - labels:
          level:
          service:
      - timestamp:
          source: timestamp
          format: RFC3339Nano
```

**`config/grafana-datasources.yml`**:
```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    editable: false
    jsonData:
      maxLines: 1000
```

**`config/grafana-dashboards.yml`**:
```yaml
apiVersion: 1

providers:
  - name: 'Quant Trading'
    orgId: 1
    folder: ''
    folderUid: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

#### 步骤 3: 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f loki
docker-compose logs -f promtail
docker-compose logs -f grafana

# 访问 Grafana
open http://localhost:3000
# 用户名: admin
# 密码: admin
```

#### 步骤 4: 创建 Dashboard

**`config/dashboards/quant-trading.json`**:

见知识库文档中的完整 Dashboard 配置

### 3. Elasticsearch + Kibana 企业级部署

#### 步骤 1: Docker Compose 配置

```yaml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    container_name: quant-es
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    networks:
      - logging-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    container_name: quant-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - logging-network
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:8.12.0
    container_name: quant-logstash
    volumes:
      - ./config/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
      - ./logs:/var/log/quant
    networks:
      - logging-network
    depends_on:
      - elasticsearch

networks:
  logging-network:
    driver: bridge

volumes:
  es-data:
```

#### 步骤 2: Logstash 配置

**`config/logstash.conf`**:
```ruby
input {
  file {
    path => "/var/log/quant/*.json"
    start_position => "beginning"
    sincedb_path => "/dev/null"
    codec => "json"
  }
}

filter {
  # 解析时间戳
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }

  # 添加索引名称
  mutate {
    add_field => {
      "[@metadata][index]" => "quant-trading-%{+YYYY.MM.dd}"
    }
  }

  # 去重(基于 traceId 和 message)
  fingerprint {
    source => ["traceId", "message"]
    target => "[@metadata][_id]"
    concatenate_sources => true
    method => "MD5"
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index]}"
    document_id => "%{[@metadata][_id]}"
  }
}
```

#### 步骤 3: 启动服务

```bash
# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 访问 Kibana
open http://localhost:5601
```

### 4. Filebeat 替代方案

如果不想用 Logstash,可以使用 Filebeat:

**`config/filebeat.yml`**:
```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/quant/*.json
    json.keys_under_root: true
    json.add_error_key: true
    json.message_key: message
    fields:
      service: quantitative-trading
      environment: production
    fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "quant-trading-%{+yyyy.MM.dd}"
  
setup.ilm.enabled: true
setup.ilm.rollover_alias: "quant-trading"
setup.ilm.pattern: "{now/d}-000001"

setup.template.name: "quant-trading"
setup.template.pattern: "quant-trading-*"
setup.template.settings:
  index.number_of_shards: 1
  index.number_of_replicas: 0
```

## 日志系统集成

### 1. 在应用中使用

```python
from config.logging_config import get_logger

# 获取日志实例
log = get_logger(
    service_name="quantitative-trading",
    environment="production",  # 从环境变量读取
    log_dir="logs",
    log_level="INFO"
)

# 记录日志
log.info("系统启动", extra={'version': '1.0.0'})
log.log_trade(action='buy', symbol='510300', quantity=1000, price=4.75, order_id='ORD001')
```

### 2. 定时任务日志采集

创建定时任务将日志发送到中心化存储:

**`scripts/sync_logs.py`**:
```python
#!/usr/bin/env python3
"""
定时同步日志到中心化存储
"""

import os
import time
import requests
from pathlib import Path
from datetime import datetime

def sync_to_loki(log_dir: str = "logs", loki_url: str = "http://localhost:3100"):
    """
    同步日志到 Loki
    
    Args:
        log_dir: 日志目录
        loki_url: Loki 服务地址
    """
    log_dir = Path(log_dir)
    today = datetime.now().strftime('%Y%m%d')
    
    # 遍历日志文件
    for log_file in log_dir.glob(f"*_{today}.json"):
        log_type = log_file.stem.split('_')[0]
        
        # 读取日志
        with open(log_file, 'r') as f:
            logs = [line.strip() for line in f if line.strip()]
        
        if not logs:
            continue
        
        # 发送到 Loki
        streams = {
            "streams": [{
                "stream": {
                    "service": "quantitative-trading",
                    "log_type": log_type,
                    "environment": "production"
                },
                "values": [
                    [str(int(time.time() * 1e9)), log]
                    for log in logs[-100:]  # 只发送最近100条
                ]
            }]
        }
        
        try:
            response = requests.post(
                f"{loki_url}/loki/api/v1/push",
                json=streams,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            print(f"✅ 同步 {log_file.name}: {len(logs)} 条日志")
        except Exception as e:
            print(f"❌ 同步失败 {log_file.name}: {e}")

if __name__ == "__main__":
    sync_to_loki()
```

添加到 crontab:
```bash
# 每5分钟同步一次
*/5 * * * * /workspace/quantitative/scripts/sync_logs.py >> /var/log/quant/sync.log 2>&1
```

### 3. 监控告警配置

**`config/alerts.yml`** (Loki 告警规则):
```yaml
groups:
  - name: quant_trading_alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({service="quantitative-trading", level="ERROR"} [5m])) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "高错误率告警"
          description: "过去5分钟错误率超过10/分钟"
      
      - alert: DrawdownWarning
        expr: |
          count(count_over_time({service="quantitative-trading"} |= "DRAWDOWN_WARNING" [15m])) > 3
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "回撤预警"
          description: "15分钟内出现多次回撤预警"
```

### 4. 性能优化建议

#### 日志轮转配置

```python
# 在 logging_config.py 中配置
logger.add(
    f"{log_dir}/app_{datetime.now().strftime('%Y%m%d')}.json",
    format="{message}",
    level=log_level,
    rotation="00:00",  # 每天轮转
    retention="30 days",  # 保留30天
    compression="zip",  # 压缩归档
    serialize=True,
    enqueue=True  # 异步写入
)
```

#### 磁盘空间监控

```bash
# 添加到 crontab
0 * * * * df -h /workspace/quantitative/logs | awk 'NR>1 {if ($5+0 > 80) print "日志目录使用率: "$5"%" | "mail -s 'Log Disk Warning' admin@example.com"}'
```

## 验证检查清单

### 功能验证

- [ ] 日志格式统一(JSON)
- [ ] 日志包含必需字段(timestamp, level, service, traceId)
- [ ] 各级别日志正确分类存储
- [ ] 日志轮转正常工作
- [ ] 日志压缩归档正常
- [ ] 日志去重功能有效
- [ ] 链路追踪(traceId)正确关联

### 性能验证

- [ ] 日志写入不影响应用性能(< 1ms)
- [ ] 日志查询响应时间 < 1s
- [ ] 日志压缩率 > 70%
- [ ] 日志采集延迟 < 10s
- [ ] 存储成本降低 > 50%

### 可用性验证

- [ ] Grafana/Kibana Dashboard 正常显示
- [ ] 日志查询功能正常
- [ ] 告警规则触发正常
- [ ] 日志完整性 > 95%
- [ ] 无日志丢失

## 常见问题排查

### 问题1: Loki 无法接收日志

**症状**: Promtail 报错或 Loki 无日志

**排查**:
```bash
# 检查 Loki 服务状态
docker-compose logs loki

# 检查 Promtail 连接
docker-compose logs promtail

# 检查日志文件权限
ls -la logs/
chmod 644 logs/*.json

# 测试 Loki API
curl http://localhost:3100/ready
curl http://localhost:3100/loki/api/v1/labels
```

### 问题2: Grafana 无法显示数据

**症状**: Dashboard 无数据

**排查**:
```bash
# 检查数据源配置
curl http://localhost:3000/api/datasources

# 测试 Loki 查询
curl -G 'http://localhost:3100/loki/api/v1/query' \
  --data-urlencode 'query={service="quantitative-trading"}' \
  --data-urlencode 'limit=10'

# 检查日志格式
cat logs/app_*.json | jq '.' | head -20
```

### 问题3: 日志文件过大

**症状**: 磁盘空间不足

**解决**:
```bash
# 手动清理旧日志
find logs/ -name "*.json" -mtime +30 -delete

# 配置更短的保留期
# 在 logging_config.py 中修改 retention_days

# 启用压缩
# 在 logger.add 中设置 compression="zip"
```

### 问题4: 日志格式不正确

**症状**: JSON 解析错误

**排查**:
```bash
# 验证日志格式
cat logs/app_*.json | jq '.' > /dev/null

# 检查是否有非 JSON 行
grep -v "^{" logs/app_*.json

# 验证必需字段
cat logs/app_*.json | jq 'select(.timestamp == null or .level == null or .service == null)'
```

## 下一步计划

1. **部署监控**: 部署 Prometheus 监控日志系统性能
2. **告警通知**: 集成飞书/邮件通知
3. **日志分析**: 添加 AI 日志分析功能
4. **自动归档**: 配置冷热数据自动归档到 S3
5. **多集群支持**: 支持多数据中心日志聚合

## 参考文档

- [知识库: 日志管理系统方案](../knowledge-base/log-management-system-2026.md)
- [Elasticsearch 官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Loki 官方文档](https://grafana.com/docs/loki/latest/)
- [Grafana 官方文档](https://grafana.com/docs/grafana/latest/)
- [OpenTelemetry 日志规范](https://opentelemetry.io/docs/concepts/signals/logs/)
