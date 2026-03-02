---
title: 回测评估指标
category: quantitative-finance
tags: [backtesting, metrics, evaluation, quantitative]
created: 2026-02-22
updated: 2026-02-22
---

# 回测评估指标

> 📊 **量化策略的体检报告** - 全面评估策略表现

---

## 收益指标

### 总收益率 (Total Return)

$$Total Return = \frac{终值 - 初值}{初值} \times 100\%$$

```python
def total_return(equity_curve):
    """计算总收益率"""
    return (equity_curve[-1] - equity_curve[0]) / equity_curve[0]
```

### 年化收益率 (CAGR)

$$CAGR = (\frac{终值}{初值})^{\frac{1}{n}} - 1$$

```python
def cagr(equity_curve, years):
    """计算年化收益率"""
    total = total_return(equity_curve)
    return (1 + total) ** (1 / years) - 1
```

### 年度收益率

```python
def annual_returns(equity_curve, dates):
    """计算每年收益率"""
    df = pd.DataFrame({'date': dates, 'equity': equity_curve})
    df['year'] = df['date'].dt.year
    df.set_index('date', inplace=True)
    
    # 每年最后一个交易日的权益
    year_end = df.resample('YE')['equity'].last()
    
    # 计算年度收益率
    annual_ret = year_end.pct_change().dropna()
    
    return annual_ret
```

---

## 风险指标

### 最大回撤 (Max Drawdown)

$$MDD = \frac{峰值 - 谷值}{峰值} \times 100\%$$

```python
def max_drawdown(equity_curve):
    """计算最大回撤"""
    peak = equity_curve.expanding(min_periods=1).max()
    drawdown = (equity_curve - peak) / peak
    return drawdown.min()

def max_drawdown_duration(equity_curve):
    """计算最大回撤持续时间"""
    peak = equity_curve.expanding(min_periods=1).max()
    drawdown = (equity_curve - peak) / peak
    
    # 找到最大回撤的起止点
    mdd = drawdown.min()
    start_idx = drawdown.idxmin()
    
    # 向前找起点
    peak_before = equity_curve[:start_idx].idxmax()
    
    # 向后找终点 (恢复时间)
    peak_after = equity_curve[start_idx:].loc[equity_curve[start_idx:] >= peak.iloc[start_idx]].index
    end_idx = peak_after[0] if len(peak_after) > 0 else equity_curve.index[-1]
    
    return start_idx, end_idx
```

### 年化波动率 (Annualized Volatility)

$$\sigma_{annual} = \sigma_{daily} \times \sqrt{252}$$

```python
def annualized_volatility(returns):
    """计算年化波动率"""
    return returns.std() * np.sqrt(252)
```

---

## 风险调整收益

### 夏普比率 (Sharpe Ratio)

$$Sharpe = \frac{R_p - R_f}{\sigma_p}$$

```python
def sharpe_ratio(returns, risk_free_rate=0.03):
    """计算夏普比率"""
    excess_return = returns.mean() * 252 - risk_free_rate
    volatility = returns.std() * np.sqrt(252)
    
    if volatility == 0:
        return 0
    
    return excess_return / volatility
```

### 索提诺比率 (Sortino Ratio)

$$Sortino = \frac{R_p - R_f}{\sigma_{downside}}$$

```python
def sortino_ratio(returns, risk_free_rate=0.03):
    """计算索提诺比率 (只考虑下行波动)"""
    excess_return = returns.mean() * 252 - risk_free_rate
    
    # 下行波动
    downside_returns = returns[returns < 0]
    downside_std = downside_returns.std() * np.sqrt(252)
    
    if downside_std == 0:
        return 0
    
    return excess_return / downside_std
```

### 卡玛比率 (Calmar Ratio)

$$Calmar = \frac{CAGR}{|MDD|}$$

```python
def calmar_ratio(returns, equity_curve, years):
    """计算卡玛比率"""
    cagr_val = cagr(equity_curve, years)
    mdd = abs(max_drawdown(equity_curve))
    
    if mdd == 0:
        return 0
    
    return cagr_val / mdd
```

---

## 交易统计

### 胜率 (Win Rate)

$$Win Rate = \frac{盈利交易次数}{总交易次数} \times 100\%$$

```python
def win_rate(trades):
    """计算胜率"""
    if len(trades) == 0:
        return 0
    
    winning_trades = sum(1 for t in trades if t['pnl'] > 0)
    return winning_trades / len(trades)
```

### 盈亏比 (Profit/Loss Ratio)

$$P/L Ratio = \frac{平均盈利}{平均亏损}$$

```python
def profit_loss_ratio(trades):
    """计算盈亏比"""
    profits = [t['pnl'] for t in trades if t['pnl'] > 0]
    losses = [abs(t['pnl']) for t in trades if t['pnl'] < 0]
    
    if not losses:
        return float('inf')
    
    avg_profit = np.mean(profits) if profits else 0
    avg_loss = np.mean(losses)
    
    return avg_profit / avg_loss
```

### 期望值 (Expectancy)

$$Expectancy = (Win\% \times Avg Win) - (Loss\% \times Avg Loss)$$

```python
def expectancy(trades):
    """计算期望值"""
    if len(trades) == 0:
        return 0
    
    wr = win_rate(trades)
    plr = profit_loss_ratio(trades)
    
    avg_trade_pnl = np.mean([t['pnl'] for t in trades])
    
    return wr * avg_trade_pnl - (1 - wr) * avg_trade_pnl
```

---

## 综合评估函数

```python
def calculate_all_metrics(equity_curve, dates, trades):
    """计算所有回测指标"""
    
    # 基础数据
    returns = equity_curve.pct_change().dropna()
    years = (dates[-1] - dates[0]).days / 365.25
    
    # 收益指标
    total_ret = total_return(equity_curve)
    cagr_val = cagr(equity_curve, years)
    annual_ret = annual_returns(equity_curve, dates)
    
    # 风险指标
    mdd = max_drawdown(equity_curve)
    volatility = annualized_volatility(returns)
    
    # 风险调整收益
    sharpe = sharpe_ratio(returns)
    sortino = sortino_ratio(returns)
    calmar = calmar_ratio(returns, equity_curve, years)
    
    # 交易统计
    total_trades = len(trades)
    wr = win_rate(trades)
    plr = profit_loss_ratio(trades)
    exp = expectancy(trades)
    
    # 汇总
    metrics = {
        '总收益率': f"{total_ret:.2%}",
        '年化收益率': f"{cagr_val:.2%}",
        '最大回撤': f"{mdd:.2%}",
        '年化波动率': f"{volatility:.2%}",
        '夏普比率': f"{sharpe:.2f}",
        '索提诺比率': f"{sortino:.2f}",
        '卡玛比率': f"{calmar:.2f}",
        '总交易次数': total_trades,
        '胜率': f"{wr:.2%}",
        '盈亏比': f"{plr:.2f}",
        '期望值': f"{exp:.2f}",
    }
    
    # 年度收益率
    metrics['年度收益率'] = annual_ret.to_dict()
    
    return metrics

def print_metrics(metrics):
    """打印回测报告"""
    print("=" * 50)
    print("回测报告")
    print("=" * 50)
    
    for key, value in metrics.items():
        if key != '年度收益率':
            print(f"{key}: {value}")
    
    print("\n年度收益率:")
    for year, ret in metrics['年度收益率'].items():
        print(f"  {year}: {ret:.2%}")
    
    print("=" * 50)
```

---

## 指标参考标准

| 指标 | 优秀 | 良好 | 一般 | 差 |
|------|------|------|------|-----|
| 年化收益 | >30% | 15-30% | 8-15% | <8% |
| 最大回撤 | <10% | 10-20% | 20-30% | >30% |
| 夏普比率 | >2.0 | 1.5-2.0 | 1.0-1.5 | <1.0 |
| 胜率 | >60% | 50-60% | 40-50% | <40% |
| 盈亏比 | >2.0 | 1.5-2.0 | 1.0-1.5 | <1.0 |
| 卡玛比率 | >3.0 | 2.0-3.0 | 1.0-2.0 | <1.0 |

---

## 可视化

```python
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

def plot_equity_curve(equity_curve, dates):
    """绘制权益曲线"""
    fig, ax = plt.subplots(figsize=(12, 6))
    
    ax.plot(dates, equity_curve, linewidth=1.5)
    ax.set_title('Equity Curve')
    ax.set_xlabel('Date')
    ax.set_ylabel('Equity')
    ax.grid(True, alpha=0.3)
    
    # 格式化 x 轴日期
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=6))
    plt.xticks(rotation=45)
    
    plt.tight_layout()
    plt.savefig('equity_curve.png', dpi=150)
    plt.show()

def plot_drawdown(equity_curve, dates):
    """绘制回撤曲线"""
    drawdown = (equity_curve - equity_curve.expanding().max()) / equity_curve.expanding().max()
    
    fig, ax = plt.subplots(figsize=(12, 4))
    
    ax.fill_between(dates, drawdown, 0, alpha=0.3, color='red')
    ax.plot(dates, drawdown, linewidth=1, color='red')
    ax.set_title('Drawdown')
    ax.set_xlabel('Date')
    ax.set_ylabel('Drawdown')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('drawdown.png', dpi=150)
    plt.show()
```

---

## 参考资料

- [QuantStart - Backtesting Metrics](https://www.quantstart.com/articles/Backtesting-Metrics/)
- [Investopedia - Sharpe Ratio](https://www.investopedia.com/terms/s/sharperatio.asp)
- [VeighNa 回测模块](https://www.vnpy.com/docs/)
