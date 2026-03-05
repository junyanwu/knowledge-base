# CTA策略进阶 - 趋势跟踪策略优化

## 1. 趋势跟踪策略核心原理

### 1.1 趋势的定义

**趋势三要素：**
- 方向：上涨、下跌、横盘
- 强度：趋势的力度
- 持续性：趋势的持续时间

**趋势识别方法：**
```python
def identify_trend(prices, window=20):
    """
    识别趋势
    
    参数:
    prices: 价格序列
    window: 窗口期
    
    返回:
    趋势方向、强度
    """
    # 移动平均
    ma = prices.rolling(window).mean()
    
    # 趋势方向
    if prices.iloc[-1] > ma.iloc[-1] * 1.02:
        trend = 'up'
    elif prices.iloc[-1] < ma.iloc[-1] * 0.98:
        trend = 'down'
    else:
        trend = 'sideways'
    
    # 趋势强度（ADX）
    high = prices.rolling(2).max()
    low = prices.rolling(2).min()
    
    plus_dm = high.diff()
    minus_dm = -low.diff()
    
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0
    
    tr = pd.concat([high - low, 
                    abs(high - prices.shift(1)), 
                    abs(low - prices.shift(1))], axis=1).max(axis=1)
    
    atr = tr.rolling(14).mean()
    
    plus_di = 100 * (plus_dm.rolling(14).mean() / atr)
    minus_di = 100 * (minus_dm.rolling(14).mean() / atr)
    
    dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
    adx = dx.rolling(14).mean()
    
    strength = adx.iloc[-1]
    
    return trend, strength
```

### 1.2 趋势跟踪指标

**移动平均系统：**
```python
def ma_system(prices, short=5, long=20):
    """
    移动平均系统
    
    参数:
    prices: 价格序列
    short: 短期均线
    long: 长期均线
    
    返回:
    信号：1做多，-1做空，0空仓
    """
    ma_short = prices.rolling(short).mean()
    ma_long = prices.rolling(long).mean()
    
    signal = pd.Series(0, index=prices.index)
    
    # 金叉做多
    signal[(ma_short > ma_long) & (ma_short.shift(1) <= ma_long.shift(1))] = 1
    
    # 死叉做空
    signal[(ma_short < ma_long) & (ma_short.shift(1) >= ma_long.shift(1))] = -1
    
    return signal
```

**通道突破：**
```python
def channel_breakout(prices, window=20):
    """
    通道突破策略
    
    参数:
    prices: 价格序列
    window: 通道周期
    
    返回:
    信号
    """
    upper = prices.rolling(window).max()
    lower = prices.rolling(window).min()
    
    signal = pd.Series(0, index=prices.index)
    
    # 突破上轨做多
    signal[prices > upper.shift(1)] = 1
    
    # 突破下轨做空
    signal[prices < lower.shift(1)] = -1
    
    return signal
```

---

## 2. 进阶趋势策略

### 2.1 多时间框架趋势

**原理：**
- 长期趋势定方向
- 中期趋势定入场
- 短期趋势定出场

**实现：**
```python
def multi_timeframe_trend(prices, long_window=60, mid_window=20, short_window=5):
    """
    多时间框架趋势策略
    
    参数:
    prices: 价格序列
    long_window: 长期窗口
    mid_window: 中期窗口
    short_window: 短期窗口
    
    返回:
    信号
    """
    # 长期趋势
    long_ma = prices.rolling(long_window).mean()
    long_trend = (prices > long_ma).astype(int) - (prices < long_ma).astype(int)
    
    # 中期趋势
    mid_ma = prices.rolling(mid_window).mean()
    mid_trend = (prices > mid_ma).astype(int) - (prices < mid_ma).astype(int)
    
    # 短期趋势
    short_ma = prices.rolling(short_window).mean()
    short_trend = (prices > short_ma).astype(int) - (prices < short_ma).astype(int)
    
    # 综合信号
    signal = long_trend + mid_trend + short_trend
    
    # 归一化
    signal[signal >= 2] = 1   # 强烈做多
    signal[signal == 1] = 0.5  # 轻仓做多
    signal[signal == 0] = 0    # 空仓
    signal[signal == -1] = -0.5  # 轻仓做空
    signal[signal <= -2] = -1  # 强烈做空
    
    return signal
```

### 2.2 自适应趋势策略

**自适应均线：**
```python
def adaptive_ma(prices, fast=2, slow=30):
    """
    自适应移动平均（KAMA）
    
    参数:
    prices: 价格序列
    fast: 快速周期
    slow: 慢速周期
    
    返回:
    KAMA值
    """
    # 效率比率
    direction = abs(prices - prices.shift(10))
    volatility = abs(prices - prices.shift(1)).rolling(10).sum()
    er = direction / volatility
    
    # 平滑常数
    fast_sc = 2 / (fast + 1)
    slow_sc = 2 / (slow + 1)
    sc = (er * (fast_sc - slow_sc) + slow_sc) ** 2
    
    # KAMA
    kama = pd.Series(index=prices.index)
    kama.iloc[0] = prices.iloc[0]
    
    for i in range(1, len(prices)):
        kama.iloc[i] = kama.iloc[i-1] + sc.iloc[i] * (prices.iloc[i] - kama.iloc[i-1])
    
    return kama
```

### 2.3 趋势强度过滤

**ADX趋势强度：**
```python
def adx_filter(prices, threshold=25):
    """
    ADX趋势强度过滤
    
    参数:
    prices: 价格序列
    threshold: ADX阈值
    
    返回:
    是否有趋势
    """
    high = prices.rolling(2).max()
    low = prices.rolling(2).min()
    close = prices
    
    # +DM和-DM
    plus_dm = high.diff()
    minus_dm = -low.diff()
    
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0
    
    # True Range
    tr = pd.concat([
        high - low,
        abs(high - close.shift(1)),
        abs(low - close.shift(1))
    ], axis=1).max(axis=1)
    
    # 平滑
    atr = tr.rolling(14).mean()
    plus_di = 100 * (plus_dm.rolling(14).mean() / atr)
    minus_di = 100 * (minus_dm.rolling(14).mean() / atr)
    
    # DX和ADX
    dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
    adx = dx.rolling(14).mean()
    
    # 趋势判断
    has_trend = adx > threshold
    
    return has_trend, adx
```

---

## 3. 止损止盈优化

### 3.1 动态止损

**ATR止损：**
```python
def atr_stop_loss(prices, atr_period=14, multiplier=2):
    """
    ATR动态止损
    
    参数:
    prices: 价格序列
    atr_period: ATR周期
    multiplier: ATR倍数
    
    返回:
    止损价位
    """
    high = prices.rolling(2).max()
    low = prices.rolling(2).min()
    close = prices
    
    tr = pd.concat([
        high - low,
        abs(high - close.shift(1)),
        abs(low - close.shift(1))
    ], axis=1).max(axis=1)
    
    atr = tr.rolling(atr_period).mean()
    
    # 多头止损
    long_stop = close - multiplier * atr
    
    # 空头止损
    short_stop = close + multiplier * atr
    
    return long_stop, short_stop
```

**跟踪止损：**
```python
def trailing_stop(prices, percentage=0.1):
    """
    跟踪止损
    
    参数:
    prices: 价格序列
    percentage: 止损百分比
    
    返回:
    止损价位
    """
    # 最高价跟踪
    highest = prices.expanding().max()
    
    # 止损价位
    stop = highest * (1 - percentage)
    
    return stop
```

### 3.2 波动率止损

**波动率调整止损：**
```python
def volatility_adjusted_stop(prices, window=20, z_score=2):
    """
    波动率调整止损
    
    参数:
    prices: 价格序列
    window: 窗口期
    z_score: Z分数
    
    返回:
    止损价位
    """
    # 波动率
    returns = prices.pct_change()
    volatility = returns.rolling(window).std()
    
    # 止损幅度
    stop_distance = volatility * z_score * np.sqrt(window)
    
    # 止损价位
    stop = prices * (1 - stop_distance)
    
    return stop
```

---

## 4. 仓位管理优化

### 4.1 波动率仓位

**波动率倒数仓位：**
```python
def volatility_position(prices, target_vol=0.15, window=20):
    """
    波动率倒数仓位
    
    参数:
    prices: 价格序列
    target_vol: 目标波动率
    window: 窗口期
    
    返回:
    仓位比例
    """
    # 波动率
    returns = prices.pct_change()
    volatility = returns.rolling(window).std() * np.sqrt(252)
    
    # 仓位
    position = target_vol / volatility
    position = position.clip(0, 2)  # 限制在0-2倍
    
    return position
```

### 4.2 风险平价仓位

**风险平价：**
```python
def risk_parity_position(returns):
    """
    风险平价仓位
    
    参数:
    returns: 多资产收益率 (n_periods, n_assets)
    
    返回:
    仓位权重
    """
    # 协方差矩阵
    cov = returns.cov()
    
    # 风险平价优化
    def risk_budget(weights):
        portfolio_vol = np.sqrt(weights @ cov @ weights)
        marginal_risk = cov @ weights / portfolio_vol
        risk_contrib = weights * marginal_risk
        target_risk = portfolio_vol / len(weights)
        return np.sum((risk_contrib - target_risk) ** 2)
    
    from scipy.optimize import minimize
    
    n_assets = returns.shape[1]
    constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
    bounds = [(0, 1) for _ in range(n_assets)]
    
    result = minimize(risk_budget, 
                     x0=[1/n_assets] * n_assets,
                     bounds=bounds,
                     constraints=constraints)
    
    return result.x
```

---

## 5. 实战案例

### 5.1 完整CTA策略

```python
class AdvancedCTAStrategy:
    """进阶CTA策略"""
    
    def __init__(self, data):
        self.data = data
        self.signals = pd.DataFrame(index=data.index)
    
    def generate_signals(self):
        """生成信号"""
        # 多时间框架趋势
        self.signals['trend'] = multi_timeframe_trend(self.data['close'])
        
        # ADX过滤
        has_trend, adx = adx_filter(self.data['close'], threshold=25)
        self.signals['adx_filter'] = has_trend
        
        # 自适应均线
        kama = adaptive_ma(self.data['close'])
        self.signals['kama_signal'] = (self.data['close'] > kama).astype(int) - \
                                      (self.data['close'] < kama).astype(int)
        
        # 综合信号
        self.signals['signal'] = 0
        self.signals.loc[(self.signals['trend'] > 0) & 
                         (self.signals['adx_filter']) & 
                         (self.signals['kama_signal'] > 0), 'signal'] = 1
        
        self.signals.loc[(self.signals['trend'] < 0) & 
                         (self.signals['adx_filter']) & 
                         (self.signals['kama_signal'] < 0), 'signal'] = -1
        
        return self.signals
    
    def calculate_position(self):
        """计算仓位"""
        # 波动率仓位
        vol_position = volatility_position(self.data['close'])
        
        # 趋势强度加权
        _, adx = adx_filter(self.data['close'])
        adx_weight = adx / 50  # 归一化
        
        # 最终仓位
        self.signals['position'] = self.signals['signal'] * vol_position * adx_weight
        
        return self.signals['position']
    
    def backtest(self, initial_capital=100000):
        """回测"""
        signals = self.generate_signals()
        positions = self.calculate_position()
        
        # 计算收益
        returns = self.data['close'].pct_change()
        strategy_returns = positions.shift(1) * returns
        
        # 累计收益
        cumulative = (1 + strategy_returns).cumprod()
        
        # 绩效指标
        sharpe = strategy_returns.mean() / strategy_returns.std() * np.sqrt(252)
        max_dd = (cumulative / cumulative.cummax() - 1).min()
        
        return {
            'returns': strategy_returns,
            'cumulative': cumulative,
            'sharpe': sharpe,
            'max_drawdown': max_dd
        }
```

---

## 6. 总结

趋势跟踪策略优化要点：

1. **趋势识别**：移动平均、通道突破、多时间框架
2. **趋势强度**：ADX、效率比率
3. **止损优化**：ATR止损、跟踪止损、波动率止损
4. **仓位管理**：波动率倒数、风险平价
5. **策略整合**：信号生成、仓位计算、回测验证

**注意事项：**
- 避免过度优化
- 样本外验证
- 交易成本考虑
- 滑点影响
- 市场状态识别

---

*创建时间: 2026-03-04*
*模块: CTA策略进阶*
*关键词: 趋势跟踪, ADX, ATR止损, 波动率仓位*
