# VaR实战应用

## 1. VaR方法

### 1.1 历史模拟法

**原理：**
使用历史收益率分布直接估计VaR。

**实现：**
```python
import numpy as np
import pandas as pd

def historical_var(returns, confidence=0.95):
    """
    历史模拟法VaR
    
    参数:
    returns: 收益率序列
    confidence: 置信水平
    
    返回:
    VaR值
    """
    # 排序收益率
    sorted_returns = np.sort(returns)
    
    # 找到对应分位数
    index = int((1 - confidence) * len(sorted_returns))
    
    # VaR
    var = -sorted_returns[index]
    
    return var

# 示例
returns = np.random.normal(0.001, 0.02, 1000)  # 1000天收益率
var_95 = historical_var(returns, 0.95)
var_99 = historical_var(returns, 0.99)

print(f'95% VaR: {var_95:.4%}')
print(f'99% VaR: {var_99:.4%}')
```

**优点：**
- 无需假设分布
- 捕捉肥尾特征
- 实现简单

**缺点：**
- 依赖历史数据
- 无法预测极端事件
- 需要大量历史数据

### 1.2 参数法（方差-协方差法）

**原理：**
假设收益率服从正态分布，用参数估计VaR。

**实现：**
```python
def parametric_var(returns, confidence=0.95):
    """
    参数法VaR
    
    参数:
    returns: 收益率序列
    confidence: 置信水平
    
    返回:
    VaR值
    """
    from scipy.stats import norm
    
    # 估计参数
    mu = returns.mean()
    sigma = returns.std()
    
    # VaR
    z = norm.ppf(1 - confidence)
    var = -(mu + z * sigma)
    
    return var

# 多资产VaR
def portfolio_var(weights, returns, confidence=0.95):
    """
    组合VaR
    
    参数:
    weights: 权重
    returns: 收益率矩阵 (n_periods, n_assets)
    confidence: 置信水平
    
    返回:
    组合VaR
    """
    from scipy.stats import norm
    
    # 组合收益率
    portfolio_returns = returns @ weights
    
    # 参数
    mu = portfolio_returns.mean()
    sigma = portfolio_returns.std()
    
    # VaR
    z = norm.ppf(1 - confidence)
    var = -(mu + z * sigma)
    
    return var
```

**优点：**
- 计算快速
- 易于实现
- 可解析求解

**缺点：**
- 假设正态分布
- 无法捕捉肥尾
- 对非线性工具不适用

### 1.3 蒙特卡洛模拟

**原理：**
模拟大量可能情景，统计损失分布。

**实现：**
```python
def monte_carlo_var(returns, confidence=0.95, n_simulations=10000, horizon=1):
    """
    蒙特卡洛VaR
    
    参数:
    returns: 收益率序列
    confidence: 置信水平
    n_simulations: 模拟次数
    horizon: 持有期
    
    返回:
    VaR值
    """
    from scipy.stats import norm
    
    # 估计参数
    mu = returns.mean()
    sigma = returns.std()
    
    # 模拟
    simulated_returns = np.random.normal(
        mu * horizon, 
        sigma * np.sqrt(horizon), 
        n_simulations
    )
    
    # VaR
    var = -np.percentile(simulated_returns, (1 - confidence) * 100)
    
    return var

# 多资产蒙特卡洛
def monte_carlo_portfolio_var(weights, returns, confidence=0.95, 
                                n_simulations=10000, horizon=1):
    """
    组合蒙特卡洛VaR
    """
    # 估计参数
    mu = returns.mean()
    cov = returns.cov()
    
    # 模拟
    simulated_returns = np.random.multivariate_normal(
        mu * horizon,
        cov * horizon,
        n_simulations
    )
    
    # 组合收益
    portfolio_returns = simulated_returns @ weights
    
    # VaR
    var = -np.percentile(portfolio_returns, (1 - confidence) * 100)
    
    return var
```

**优点：**
- 可处理非线性
- 灵活性高
- 可模拟复杂情景

**缺点：**
- 计算量大
- 依赖分布假设
- 结果不稳定

---

## 2. CVaR（条件风险价值）

### 2.1 CVaR定义

**Expected Shortfall (ES)：**
CVaR是VaR之后损失的平均值，也称为Expected Shortfall。

```python
def conditional_var(returns, confidence=0.95):
    """
    条件VaR (Expected Shortfall)
    
    参数:
    returns: 收益率序列
    confidence: 置信水平
    
    返回:
    CVaR值
    """
    # 历史模拟法
    sorted_returns = np.sort(returns)
    index = int((1 - confidence) * len(sorted_returns))
    
    # CVaR
    cvar = -sorted_returns[:index].mean()
    
    return cvar

# 示例
var_95 = historical_var(returns, 0.95)
cvar_95 = conditional_var(returns, 0.95)

print(f'95% VaR: {var_95:.4%}')
print(f'95% CVaR: {cvar_95:.4%}')
```

### 2.2 CVaR优化

**最小化CVaR：**
```python
def minimize_cvar_portfolio(returns, target_return=0.1):
    """
    最小化CVaR的组合优化
    
    参数:
    returns: 收益率矩阵
    target_return: 目标收益
    
    返回:
    最优权重
    """
    from scipy.optimize import minimize
    
    n_assets = returns.shape[1]
    confidence = 0.95
    
    def cvar_objective(weights):
        portfolio_returns = returns @ weights
        sorted_returns = np.sort(portfolio_returns)
        index = int((1 - confidence) * len(sorted_returns))
        return -sorted_returns[:index].mean()
    
    constraints = [
        {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
        {'type': 'ineq', 'fun': lambda w: returns @ w - target_return}
    ]
    
    bounds = [(0, 1) for _ in range(n_assets)]
    
    result = minimize(
        cvar_objective,
        x0=[1/n_assets] * n_assets,
        bounds=bounds,
        constraints=constraints
    )
    
    return result.x
```

---

## 3. VaR回测

### 3.1 失败次数检验

**Kupiec检验：**
```python
def kupiec_test(actual_losses, var_estimates, confidence=0.95):
    """
    Kupiec失败次数检验
    
    参数:
    actual_losses: 实际损失
    var_estimates: VaR估计
    confidence: 置信水平
    
    返回:
    检验结果
    """
    # 失败次数
    failures = np.sum(actual_losses > var_estimates)
    n = len(actual_losses)
    
    # 期望失败次数
    expected_failures = n * (1 - confidence)
    
    # 似然比检验
    p_hat = failures / n
    p = 1 - confidence
    
    lr = 2 * (failures * np.log(p_hat / p) + 
              (n - failures) * np.log((1 - p_hat) / (1 - p)))
    
    from scipy.stats import chi2
    p_value = 1 - chi2.cdf(lr, 1)
    
    return {
        'failures': failures,
        'expected_failures': expected_failures,
        'failure_rate': p_hat,
        'expected_rate': 1 - confidence,
        'lr_statistic': lr,
        'p_value': p_value,
        'accept': p_value > 0.05
    }
```

### 3.2 条件覆盖检验

**Christoffersen检验：**
```python
def christoffersen_test(actual_losses, var_estimates, confidence=0.95):
    """
    Christoffersen条件覆盖检验
    
    参数:
    actual_losses: 实际损失
    var_estimates: VaR估计
    confidence: 置信水平
    
    返回:
    检验结果
    """
    # 失败序列
    failures = (actual_losses > var_estimates).astype(int)
    
    # 转移矩阵
    n00 = np.sum((failures[:-1] == 0) & (failures[1:] == 0))
    n01 = np.sum((failures[:-1] == 0) & (failures[1:] == 1))
    n10 = np.sum((failures[:-1] == 1) & (failures[1:] == 0))
    n11 = np.sum((failures[:-1] == 1) & (failures[1:] == 1))
    
    # 条件概率
    p01 = n01 / (n00 + n01) if (n00 + n01) > 0 else 0
    p11 = n11 / (n10 + n11) if (n10 + n11) > 0 else 0
    p = (n01 + n11) / (n00 + n01 + n10 + n11)
    
    # 似然比
    from scipy.stats import chi2
    
    lr_ind = -2 * (n00 + n01 + n10 + n11) * np.log(p) + \
             2 * (n00 + n01) * np.log(p01 if p01 > 0 else 1) + \
             2 * (n10 + n11) * np.log(p11 if p11 > 0 else 1)
    
    p_value = 1 - chi2.cdf(lr_ind, 1)
    
    return {
        'lr_statistic': lr_ind,
        'p_value': p_value,
        'accept': p_value > 0.05
    }
```

---

## 4. 实战应用

### 4.1 风险报告

```python
class RiskReport:
    """风险报告生成"""
    
    def __init__(self, returns, confidence=[0.95, 0.99]):
        self.returns = returns
        self.confidence = confidence
    
    def generate_report(self):
        """生成风险报告"""
        report = {}
        
        for conf in self.confidence:
            report[f'VaR_{int(conf*100)}'] = historical_var(self.returns, conf)
            report[f'CVaR_{int(conf*100)}'] = conditional_var(self.returns, conf)
        
        # 年化风险
        report['Annual_Vol'] = self.returns.std() * np.sqrt(252)
        report['Max_Drawdown'] = self._max_drawdown(self.returns)
        
        # 分布特征
        report['Skewness'] = self.returns.skew()
        report['Kurtosis'] = self.returns.kurtosis()
        
        return report
    
    def _max_drawdown(self, returns):
        """最大回撤"""
        cumulative = (1 + returns).cumprod()
        drawdown = (cumulative - cumulative.cummax()) / cumulative.cummax()
        return drawdown.min()
```

### 4.2 风险限额管理

```python
class RiskLimiter:
    """风险限额管理"""
    
    def __init__(self, var_limit=0.05, cvar_limit=0.08, max_drawdown=0.15):
        self.var_limit = var_limit
        self.cvar_limit = cvar_limit
        self.max_drawdown = max_drawdown
    
    def check_position(self, position_value, portfolio_var, portfolio_cvar):
        """检查仓位是否超限"""
        warnings = []
        
        # VaR检查
        if portfolio_var > self.var_limit:
            warnings.append(f'VaR超限: {portfolio_var:.2%} > {self.var_limit:.2%}')
        
        # CVaR检查
        if portfolio_cvar > self.cvar_limit:
            warnings.append(f'CVaR超限: {portfolio_cvar:.2%} > {self.cvar_limit:.2%}')
        
        return warnings
    
    def suggest_position_size(self, returns, max_var=0.05):
        """建议仓位大小"""
        var_per_unit = historical_var(returns, 0.95)
        position_size = max_var / var_per_unit
        
        return min(position_size, 1.0)  # 不超过100%
```

---

## 5. 总结

VaR实战要点：

1. **VaR方法**：历史模拟、参数法、蒙特卡洛
2. **CVaR**：条件风险价值，更保守的风险度量
3. **VaR回测**：Kupiec检验、Christoffersen检验
4. **风险报告**：定期生成风险报告
5. **风险限额**：VaR限额、CVaR限额、最大回撤限制

**注意事项：**
- VaR不是最坏情况
- 回测验证很重要
- 考虑流动性风险
- 定期更新模型

---

*创建时间: 2026-03-04*
