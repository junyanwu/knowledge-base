---
title: VeighNa 量化交易框架
category: quantitative-finance
tags: [framework, quantitative, python, trading]
created: 2026-02-22
updated: 2026-02-22
source: https://github.com/vnpy/vnpy
---

# VeighNa 量化交易框架

> 📊 **By Traders, For Traders** - 基于 Python 的开源量化交易系统开发框架

---

## 概述

VeighNa (vn.py) 是一套基于 Python 的开源量化交易系统开发框架，自 2015 年发布以来已成长为多功能量化交易平台。

**核心定位**: 量化交易系统开发框架（不仅是回测工具）

---

## 版本历史

| 版本 | 发布时间 | 关键特性 |
|------|----------|----------|
| 1.x | 2015 | 初始版本 |
| 2.x | 2018 | 架构重构 |
| 3.x | 2021 | 功能完善 |
| 4.x | 2025 | AI-Powered, 新增 vnpy.alpha 模块 |

---

## 核心架构

### 1. 事件驱动引擎

```
Event Engine (事件驱动)
    ↓
Data Feed (数据源) → Strategy (策略) → Risk Manager (风控) → Gateway (交易接口)
```

### 2. 模块化设计

```
vnpy/
├── vnpy.trading/      # 核心交易引擎
├── vnpy.event/        # 事件驱动引擎
├── vnpy.gateway/      # 交易接口 (期货/股票/期权等)
├── vnpy.strategy/     # 策略引擎
├── vnpy.risk/         # 风控模块
├── vnpy.data/         # 数据管理
├── vnpy.backtester/   # 回测模块
├── vnpy.alpha/        # AI 量化策略 (4.0 新增)
└── vnpy.ui/           # GUI 界面
```

---

## 支持的市场

| 市场 | 支持程度 | 说明 |
|------|----------|------|
| 期货 | ✅ 完整 | CTP 接口为主 |
| 股票 | ✅ 完整 | A 股/港股/美股 |
| 期权 | ✅ 完整 | 期货期权/股票期权 |
| ETF | ✅ 完整 | A 股 ETF |
| 黄金 T+D | ✅ 完整 | 上海黄金交易所 |
| 银行间固收 | ✅ 完整 | 债券市场 |
| 数字货币 | ✅ 完整 | 主流交易所 |
| 外汇 | ✅ 完整 | 外盘市场 |

---

## 核心特性

### 1. 丰富接口
- 支持大量高性能交易 Gateway 接口
- 期货、期权、股票、数字货币等

### 2. 开箱即用
- 内置成熟量化交易策略 App 模块
- 支持 GUI 图形界面和 CLI 命令行模式

### 3. 自由扩展
- 事件驱动引擎架构
- Python 胶水语言特性
- 快速对接新交易接口

### 4. 开源免费
- MIT 开源协议
- 可商用
- GitHub 获取全部源代码

---

## VeighNa 4.0 AI 特性

### vnpy.alpha 模块

面向 AI 量化策略的新增模块：

```python
from vnpy.alpha import AlphaStrategy, AlphaEngine

class MyAlphaStrategy(AlphaStrategy):
    def on_init(self):
        """初始化"""
        pass
    
    def on_start(self):
        """启动"""
        pass
    
    def on_tick(self, tick):
        """Tick 数据推送"""
        pass
    
    def on_bar(self, bar):
        """K 线数据推送"""
        pass
    
    def on_order(self, order):
        """委托推送"""
        pass
    
    def on_trade(self, trade):
        """成交推送"""
        pass
    
    def on_stop(self):
        """停止"""
        pass
```

---

## 回测系统

### 回测流程

```python
from vnpy.backtester import BacktestingEngine

engine = BacktestingEngine()

# 1. 设置参数
engine.set_parameters(
    vt_symbol="IF888.CFFEX",
    interval="1m",
    start=datetime(2020, 1, 1),
    end=datetime(2026, 2, 22),
    rate=0.0000226,
    slippage=0.2,
    size=300,
    pricetick=0.2,
    capital=1000000,
)

# 2. 加载策略
engine.add_strategy(MyStrategy, {})

# 3. 执行回测
engine.run_backtesting()

# 4. 计算指标
df = engine.calculate_statistics()

# 5. 展示图表
engine.show_chart()
```

### 回测指标

| 指标 | 说明 | 计算方式 |
|------|------|----------|
| 总收益率 | 总收益百分比 | (终值 - 初值) / 初值 |
| 年化收益率 | 年化复利收益 | (终值/初值)^(1/n) - 1 |
| 最大回撤 | 最大亏损幅度 | max(峰值 - 谷值) / 峰值 |
| 夏普比率 | 风险调整后收益 | (年化收益 - 无风险利率) / 年化波动 |
| 胜率 | 盈利交易占比 | 盈利次数 / 总次数 |
| 盈亏比 | 平均盈利/平均亏损 | avg(盈利) / avg(亏损) |

---

## 数据管理

### 数据来源

1. **RQData** - 米筐数据 (付费)
2. **UData** - 优矿数据 (付费)
3. **TuShare** - 开源财经数据
4. **AkShare** - 开源财经数据接口库
5. **本地 CSV** - 自定义数据

### 数据格式

```python
# Bar 数据
{
    "datetime": datetime,
    "open": float,
    "high": float,
    "low": float,
    "close": float,
    "volume": float,
    "turnover": float,
    "open_interest": float,
}
```

---

## 策略开发示例

### 双均线策略

```python
from vnpy_ctastrategy import (
    CtaTemplate,
    StopOrder,
    TickData,
    BarData,
    TradeData,
    OrderData,
    BarGenerator,
    ArrayManager,
)

class DoubleMaStrategy(CtaTemplate):
    """双均线交叉策略"""
    
    author = "VeighNa Community"
    
    fast_window = 10  # 快线周期
    slow_window = 30  # 慢线周期
    fixed_size = 1    # 固定手数
    
    fast_ma0 = 0.0
    fast_ma1 = 0.0
    slow_ma0 = 0.0
    slow_ma1 = 0.0
    
    parameters = ["fast_window", "slow_window", "fixed_size"]
    variables = ["fast_ma0", "fast_ma1", "slow_ma0", "slow_ma1"]
    
    def __init__(self, cta_engine, strategy_name, vt_symbol, setting):
        super().__init__(cta_engine, strategy_name, vt_symbol, setting)
        self.bg = BarGenerator(self.on_bar)
        self.am = ArrayManager(size=100)
    
    def on_init(self):
        self.write_log("策略初始化")
        self.load_bar(10)
    
    def on_start(self):
        self.write_log("策略启动")
    
    def on_stop(self):
        self.write_log("策略停止")
    
    def on_tick(self, tick: TickData):
        self.bg.update_tick(tick)
    
    def on_bar(self, bar: BarData):
        self.am.update_bar(bar)
        if not self.am.inited:
            return
        
        fast_ma = self.am.sma(self.fast_window, array=True)
        slow_ma = self.am.sma(self.slow_window, array=True)
        
        self.fast_ma0 = fast_ma[-1]
        self.fast_ma1 = fast_ma[-2]
        self.slow_ma0 = slow_ma[-1]
        self.slow_ma1 = slow_ma[-2]
        
        cross_over = (self.fast_ma0 > self.slow_ma0 and 
                      self.fast_ma1 < self.slow_ma1)
        cross_below = (self.fast_ma0 < self.slow_ma0 and 
                       self.fast_ma1 > self.slow_ma1)
        
        if cross_over:
            if self.pos == 0:
                self.buy(bar.close_price, self.fixed_size)
            elif self.pos < 0:
                self.cover(bar.close_price, abs(self.pos))
                self.buy(bar.close_price, self.fixed_size)
        
        elif cross_below:
            if self.pos == 0:
                self.short(bar.close_price, self.fixed_size)
            elif self.pos > 0:
                self.sell(bar.close_price, abs(self.pos))
                self.short(bar.close_price, self.fixed_size)
        
        self.put_event()
```

---

## 部署方式

### 本地安装

```bash
# Python 3.10+  required
pip install vnpy

# 安装策略模块
pip install vnpy_ctastrategy
pip install vnpy_ctabacktester

# 安装数据接口
pip install vnpy_rqdata
```

### Docker 部署

```bash
docker run -d \
  -p 8080:8080 \
  -v ./data:/app/data \
  vnpy/vnpy:latest
```

---

## 学习资源

| 资源 | 链接 | 说明 |
|------|------|------|
| 官方文档 | https://www.vnpy.com/docs/ | 完整使用文档 |
| GitHub | https://github.com/vnpy/vnpy | 源代码 |
| 社区论坛 | https://www.wechat.com/forum/ | 问题交流 |
| 微信公众号 | VeighNa 社区 | 最新资讯 |

---

## 实践笔记

### 2026-02-22 学习心得

1. **架构优势**: 事件驱动非常适合高频交易场景
2. **生态完善**: 大量现成策略和接口可用
3. **学习曲线**: 需要理解事件驱动模型
4. **适用场景**: 期货/股票量化交易全流程

### 注意事项

- 实盘前务必充分回测
- 注意滑点和手续费设置
- 风控模块必不可少
- 日志记录要完善

---

## 参考资料

- [VeighNa 官方文档](https://www.vnpy.com/docs/cn/index.html)
- [GitHub 仓库](https://github.com/vnpy/vnpy)
- [VeighNa 社区论坛](https://www.vnpy.com/forum/)
