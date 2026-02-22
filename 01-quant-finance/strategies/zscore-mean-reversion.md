---
title: Z-Score 均值回归策略
category: quantitative-finance
tags: [strategy, quantitative, mean-reversion, zscore]
created: 2026-02-22
updated: 2026-02-22
---

# Z-Score 均值回归策略

> 📈 **价格偏离均值 N 个标准差时开仓** - 经典统计学套利策略

---

## 核心原理

### Z-Score 定义

$$Z = \frac{X - \mu}{\sigma}$$

其中:
- $X$ = 当前价格
- $\mu$ = 移动平均价 (均值)
- $\sigma$ = 移动标准差

### 交易逻辑

| Z-Score 值 | 市场状态 | 操作 |
|-----------|----------|------|
| Z > +2 | 超买 (高于均值 2σ) | 做空 |
| Z < -2 | 超卖 (低于均值 2σ) | 做多 |
| -2 < Z < +2 | 正常区间 | 持仓或观望 |
| Z 回归 0 | 回归均值 | 平仓获利 |

---

## 策略假设

1. **均值回归**: 价格围绕价值波动，长期回归均值
2. **正态分布**: 价格波动近似正态分布
3. **市场有效性**: 短期情绪导致价格偏离，长期会修正

---

## 参数设计

### 核心参数

```python
# 策略参数
lookback_period = 20      # 回看周期 (计算均值和标准差)
entry_threshold = 2.0     # 开仓阈值 (多少个标准差)
exit_threshold = 0.5      # 平仓阈值 (回归到多少)
stop_loss = 3.0           # 止损阈值 (多少个标准差)

# 可选参数
use_volume = True         # 是否结合成交量
volume_threshold = 1.5    # 成交量放大倍数
ma_filter = True          # 是否使用均线过滤
ma_period = 60            # 均线周期
```

### 参数优化建议

| 市场类型 | lookback | entry_threshold | 说明 |
|----------|----------|-----------------|------|
| 股票 | 20-30 | 2.0-2.5 | 日线级别 |
| ETF | 15-25 | 1.8-2.2 | 波动较小 |
| 期货 | 10-20 | 2.5-3.0 | 波动较大 |
| 加密货币 | 20-50 | 3.0-4.0 | 高波动 |

---

## 策略实现

### Python 实现 (VeighNa)

```python
from vnpy_ctastrategy import CtaTemplate, ArrayManager
import numpy as np

class ZscoreMeanReversionStrategy(CtaTemplate):
    """Z-Score 均值回归策略"""
    
    author = "AI Assistant"
    
    # 策略参数
    lookback = 20
    entry_z = 2.0
    exit_z = 0.5
    stop_loss_z = 3.0
    fixed_size = 1
    
    parameters = ["lookback", "entry_z", "exit_z", "stop_loss_z", "fixed_size"]
    variables = ["current_z", "ma_value", "std_value"]
    
    def __init__(self, cta_engine, strategy_name, vt_symbol, setting):
        super().__init__(cta_engine, strategy_name, vt_symbol, setting)
        self.bg = BarGenerator(self.on_bar)
        self.am = ArrayManager(size=self.lookback + 10)
        self.current_z = 0.0
        self.ma_value = 0.0
        self.std_value = 0.0
        self.entry_price = 0.0
        self.entry_z = 0.0
    
    def on_init(self):
        self.write_log("策略初始化")
        self.load_bar(10)
    
    def on_start(self):
        self.write_log("策略启动")
    
    def on_stop(self):
        self.write_log("策略停止")
    
    def on_tick(self, tick):
        self.bg.update_tick(tick)
    
    def on_bar(self, bar):
        self.am.update_bar(bar)
        if not self.am.inited:
            return
        
        # 计算 Z-Score
        close_array = self.am.close
        self.ma_value = np.mean(close_array[-self.lookback:])
        self.std_value = np.std(close_array[-self.lookback:])
        
        if self.std_value == 0:
            return
        
        self.current_z = (bar.close_price - self.ma_value) / self.std_value
        
        # 交易逻辑
        if self.pos == 0:
            # 开仓逻辑
            if self.current_z < -self.entry_z:
                # Z < -2, 超卖，做多
                self.buy(bar.close_price, self.fixed_size)
                self.entry_price = bar.close_price
                self.entry_z = self.current_z
                self.write_log(f"做多开仓：Z={self.current_z:.2f}")
            
            elif self.current_z > self.entry_z:
                # Z > +2, 超买，做空
                self.short(bar.close_price, self.fixed_size)
                self.entry_price = bar.close_price
                self.entry_z = self.current_z
                self.write_log(f"做空开仓：Z={self.current_z:.2f}")
        
        elif self.pos > 0:
            # 持有多单
            if self.current_z > -self.exit_z:
                # Z 回归到 -0.5 以上，平仓
                self.sell(bar.close_price, abs(self.pos))
                self.write_log(f"多单平仓：Z={self.current_z:.2f}")
            
            elif self.current_z < -self.stop_loss_z:
                # Z < -3, 止损
                self.sell(bar.close_price, abs(self.pos))
                self.write_log(f"多单止损：Z={self.current_z:.2f}")
        
        elif self.pos < 0:
            # 持有空单
            if self.current_z < self.exit_z:
                # Z 回归到 0.5 以下，平仓
                self.cover(bar.close_price, abs(self.pos))
                self.write_log(f"空单平仓：Z={self.current_z:.2f}")
            
            elif self.current_z > self.stop_loss_z:
                # Z > +3, 止损
                self.cover(bar.close_price, abs(self.pos))
                self.write_log(f"空单止损：Z={self.current_z:.2f}")
        
        self.put_event()
    
    def on_order(self, order):
        pass
    
    def on_trade(self, trade):
        self.write_log(f"成交：{trade.direction} {trade.volume}手 @ {trade.price}")
        self.put_event()
```

---

## 增强版本

### 1. 结合成交量过滤

```python
def calculate_volume_z(self):
    """计算成交量 Z-Score"""
    volume_array = self.am.volume
    vol_ma = np.mean(volume_array[-self.lookback:])
    vol_std = np.std(volume_array[-self.lookback:])
    
    if vol_std == 0:
        return 0
    
    return (volume_array[-1] - vol_ma) / vol_std

def on_bar(self, bar):
    # ... 价格 Z-Score 计算 ...
    
    # 成交量确认
    volume_z = self.calculate_volume_z()
    
    # 开仓时需要放量确认
    if self.current_z < -self.entry_z and volume_z > 0.5:
        self.buy(bar.close_price, self.fixed_size)
```

### 2. 结合均线趋势过滤

```python
def on_bar(self, bar):
    # ... Z-Score 计算 ...
    
    # 均线过滤
    ma60 = self.am.sma(60)
    
    # 只在趋势方向开仓
    if bar.close_price > ma60:  # 上升趋势
        # 只做多 (Z < -2)
        if self.current_z < -self.entry_z:
            self.buy(bar.close_price, self.fixed_size)
    
    elif bar.close_price < ma60:  # 下降趋势
        # 只做空 (Z > +2)
        if self.current_z > self.entry_z:
            self.short(bar.close_price, self.fixed_size)
```

### 3. 动态阈值

```python
def calculate_dynamic_threshold(self):
    """根据市场波动率动态调整阈值"""
    # 使用 ATR 衡量波动率
    atr = self.am.atr(14)
    avg_atr = np.mean(self.am.atr(14, array=True)[-20:])
    
    if atr > avg_atr * 1.5:
        # 高波动，提高阈值
        return self.entry_z * 1.2
    elif atr < avg_atr * 0.5:
        # 低波动，降低阈值
        return self.entry_z * 0.8
    else:
        return self.entry_z
```

---

## 回测要点

### 1. 数据准备

- **数据频率**: 日线/小时线/分钟线
- **数据长度**: 至少 2 年历史数据
- **数据质量**: 注意除权除息调整

### 2. 参数设置

```python
engine.set_parameters(
    vt_symbol="510300.SSE",  # 沪深 300ETF
    interval="1d",
    start=datetime(2020, 1, 1),
    end=datetime(2026, 2, 22),
    rate=0.0003,          # 手续费率
    slippage=0.001,       # 滑点
    size=1,               # 合约乘数
    pricetick=0.001,      # 最小价格变动
    capital=1000000,      # 本金
)
```

### 3. 关注指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 年化收益率 | > 15% | 复利年化 |
| 最大回撤 | < 20% | 风险控制 |
| 夏普比率 | > 1.0 | 风险调整收益 |
| 胜率 | > 45% | 盈利概率 |
| 盈亏比 | > 1.5 | 盈利/亏损 |

---

## 优缺点分析

### ✅ 优点

1. **逻辑清晰**: 基于统计学原理，易于理解
2. **参数少**: 主要参数只有回看周期和阈值
3. **适应性强**: 适用于多种市场
4. **风险可控**: 有明确的止损机制

### ❌ 缺点

1. **趋势市场失效**: 强趋势下会连续止损
2. **参数敏感**: 不同市场需要不同参数
3. **滞后性**: 基于历史数据计算
4. **黑天鹅风险**: 极端行情可能大幅亏损

---

## 实战建议

### 1. 品种选择

**适合**:
- 震荡市品种
- 流动性好的 ETF
- 成熟市场股票

**不适合**:
- 强趋势品种
- 低流动性标的
- 新股/次新股

### 2. 仓位管理

```python
# 根据 Z-Score 大小动态调整仓位
def calculate_position_size(self, z_value):
    base_size = 1
    if abs(z_value) > 3:
        return base_size * 1.5  # 极端偏离，加仓
    elif abs(z_value) > 2.5:
        return base_size * 1.2
    else:
        return base_size
```

### 3. 组合应用

- **多品种分散**: 同时交易多个低相关品种
- **多周期结合**: 日线 + 小时线组合
- **多策略对冲**: 结合趋势策略

---

## 参考资料

- [统计套利原理](https://en.wikipedia.org/wiki/Statistical_arbitrage)
- [均值回归策略](https://www.quantstart.com/articles/Mean-Reversion-Trading/)
- [VeighNa 官方文档](https://www.vnpy.com/docs/)
