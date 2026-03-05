# 时间序列分析 - 模块3：GARCH波动率模型

## 1. 波动率特征

### 1.1 波动率类型

**波动率分类：**

| 类型 | 定义 | 特点 |
|------|------|------|
| 历史波动率 | 基于历史收益计算 | 简单直观，滞后性 |
| 隐含波动率 | 从期权价格推导 | 前瞻性，需要期权数据 |
| 实现波动率 | 高频数据计算 | 精确，数据要求高 |
| 条件波动率 | GARCH模型估计 | 动态，预测能力强 |

### 1.2 波动率特征

**典型特征（Stylized Facts）：**

1. **波动率聚集**
   - 大波动后往往跟随大波动
   - 小波动后往往跟随小波动
   - 波动率变化呈现持续性

2. **厚尾分布**
   - 收益率分布呈现尖峰厚尾
   - 极端事件发生概率高于正态分布
   - 需要非正态分布建模

3. **杠杆效应**
   - 负收益对波动率的影响大于正收益
   - 价格下跌时波动率上升更多
   - 需要非对称模型

4. **均值回归**
   - 波动率长期趋于稳定水平
   - 高波动不会永远持续
   - GARCH模型能够捕捉

**波动率聚集可视化：**
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# 加载收益率数据
returns = pd.Series([...])  # 日收益率

# 计算波动率
rolling_vol = returns.rolling(20).std()

# 绘图
fig, axes = plt.subplots(2, 1, figsize=(12, 8))

axes[0].plot(returns)
axes[0].set_title('收益率序列')
axes[0].axhline(y=0, color='r', linestyle='--')

axes[1].plot(rolling_vol)
axes[1].set_title('20日滚动波动率')

plt.tight_layout()
plt.savefig('volatility_clustering.png')
```

---

## 2. ARCH模型

### 2.1 ARCH模型理论

**自回归条件异方差模型（Autoregressive Conditional Heteroskedasticity）：**

Engle (1982) 提出，条件方差依赖于过去残差的平方。

**模型设定：**
```
均值方程：yₜ = μ + εₜ
条件方差：σ²ₜ = ω + α₁ε²ₜ₋₁ + α₂ε²ₜ₋₂ + ... + αᵧε²ₜ₋ᵧ
```

**约束条件：**
```
ω > 0, αᵢ ≥ 0
Σαᵢ < 1 (平稳性条件)
```

**ARCH(q)模型：**
```
σ²ₜ = ω + Σᵢ₌₁ᵍ αᵢε²ₜ₋ᵢ
```

### 2.2 ARCH模型估计

**极大似然估计：**

假设 εₜ ~ N(0, σ²ₜ)，似然函数：
```
L = Πₜ (1/√(2πσ²ₜ)) exp(-ε²ₜ/(2σ²ₜ))
```

对数似然：
```
ln L = -1/2 Σₜ [ln(2π) + ln(σ²ₜ) + ε²ₜ/σ²ₜ]
```

**Python实现：**
```python
from arch import arch_model
import pandas as pd
import numpy as np

# 生成模拟数据
np.random.seed(42)
n = 1000
returns = np.random.normal(0, 1, n)

# ARCH(1)模型
model = arch_model(returns, vol='ARCH', p=1)
results = model.fit()

print(results.summary())

# 预测波动率
forecast = results.forecast(horizon=1)
print(f'预测波动率: {np.sqrt(forecast.variance.values[-1, 0]):.4f}')
```

### 2.3 ARCH效应检验

**Lagrange乘数检验（LM检验）：**

1. **回归残差平方：**
   ```
   ε²ₜ = α₀ + α₁ε²ₜ₋₁ + ... + αᵧε²ₜ₋ᵧ + νₜ
   ```

2. **检验假设：**
   ```
   H₀: α₁ = α₂ = ... = αᵧ = 0 (无ARCH效应)
   H₁: 至少一个αᵢ ≠ 0 (存在ARCH效应)
   ```

3. **LM统计量：**
   ```
   LM = nR² ~ χ²ᵧ
   ```

**Python实现：**
```python
from statsmodels.stats.diagnostic import het_arch

# ARCH效应检验
lm_stat, p_value, f_stat, fp_value = het_arch(returns, nlags=10)

print(f'LM统计量: {lm_stat:.4f}')
print(f'p值: {p_value:.4f}')

if p_value < 0.05:
    print('存在ARCH效应，需要GARCH建模')
else:
    print('无ARCH效应')
```

---

## 3. GARCH模型

### 3.1 GARCH模型理论

**广义ARCH模型（Generalized ARCH）：**

Bollerslev (1986) 提出，条件方差还依赖于过去的条件方差。

**GARCH(p, q)模型：**
```
均值方程：yₜ = μ + εₜ
条件方差：σ²ₜ = ω + Σᵢ₌₁ᵧ αᵢε²ₜ₋ᵢ + Σⱼ₌₁ᵖ βⱼσ²ₜ₋ⱼ
```

**最常用：GARCH(1,1)**
```
σ²ₜ = ω + αε²ₜ₋₁ + βσ²ₜ₋₁
```

**约束条件：**
```
ω > 0, α ≥ 0, β ≥ 0
α + β < 1 (平稳性)
```

**无条件方差：**
```
σ² = ω / (1 - α - β)
```

### 3.2 GARCH模型估计

**Python实现：**
```python
from arch import arch_model

# GARCH(1,1)模型
model = arch_model(returns, vol='Garch', p=1, q=1, mean='Constant', dist='normal')
results = model.fit(disp='off')

print(results.summary())

# 提取参数
omega = results.params['omega']
alpha = results.params['alpha[1]']
beta = results.params['beta[1]']

print(f'ω = {omega:.6f}')
print(f'α = {alpha:.6f}')
print(f'β = {beta:.6f}')
print(f'α + β = {alpha + beta:.6f}')  # 持续性

# 无条件波动率
uncond_vol = np.sqrt(omega / (1 - alpha - beta))
print(f'无条件波动率: {uncond_vol:.6f}')

# 条件波动率
cond_vol = results.conditional_volatility
```

### 3.3 GARCH模型预测

**多步预测：**
```python
# 一步预测
forecast_1 = results.forecast(horizon=1)
print(f'1天波动率预测: {np.sqrt(forecast_1.variance.values[-1, 0]):.6f}')

# 多步预测
forecast_10 = results.forecast(horizon=10)
variance_forecast = forecast_10.variance.values[-1, :]
vol_forecast = np.sqrt(variance_forecast)

print('10天波动率预测:')
for i, vol in enumerate(vol_forecast, 1):
    print(f'第{i}天: {vol:.6f}')

# 波动率期限结构
plt.figure(figsize=(10, 6))
plt.plot(range(1, 11), vol_forecast, marker='o')
plt.xlabel('预测天数')
plt.ylabel('波动率')
plt.title('GARCH波动率期限结构')
plt.savefig('volatility_term_structure.png')
```

### 3.4 GARCH模型选择

**信息准则：**
```python
# 比较不同GARCH模型
models = {
    'ARCH(1)': arch_model(returns, vol='ARCH', p=1),
    'GARCH(1,1)': arch_model(returns, vol='Garch', p=1, q=1),
    'GARCH(2,1)': arch_model(returns, vol='Garch', p=2, q=1),
    'GARCH(1,2)': arch_model(returns, vol='Garch', p=1, q=2),
}

results_dict = {}
for name, model in models.items():
    result = model.fit(disp='off')
    results_dict[name] = {
        'AIC': result.aic,
        'BIC': result.bic,
        'Log-Likelihood': result.loglikelihood
    }

# 选择最优模型
results_df = pd.DataFrame(results_dict).T
print(results_df)

best_model = results_df['AIC'].idxmin()
print(f'最优模型（AIC）: {best_model}')
```

---

## 4. GARCH扩展模型

### 4.1 IGARCH模型

**单整GARCH（Integrated GARCH）：**

当 α + β = 1 时，波动率具有长记忆性。

**模型：**
```
σ²ₜ = ω + αε²ₜ₋₁ + (1-α)σ²ₜ₋₁
```

**特点：**
- 无条件方差不存在（无限）
- 波动率冲击永久持续
- 适合高波动市场

```python
# IGARCH(1,1)
model = arch_model(returns, vol='Garch', p=1, q=1)
results = model.fit(disp='off')

# 检验是否为IGARCH
alpha = results.params['alpha[1]']
beta = results.params['beta[1]']
if abs(alpha + beta - 1) < 0.01:
    print('模型接近IGARCH')
```

### 4.2 EGARCH模型

**指数GARCH（Exponential GARCH）：**

Nelson (1991) 提出，捕捉杠杆效应。

**模型：**
```
ln(σ²ₜ) = ω + α(|zₜ₋₁| - E|zₜ₋₁|) + γzₜ₋₁ + βln(σ²ₜ₋₁)
```

其中：
```
zₜ = εₜ/σₜ (标准化残差)
```

**杠杆效应：**
- γ < 0：负冲击影响更大
- γ > 0：正冲击影响更大
- γ = 0：无杠杆效应

**Python实现：**
```python
# EGARCH模型
model = arch_model(returns, vol='EGARCH', p=1, q=1)
results = model.fit(disp='off')

print(results.summary())

# 杠杆效应
gamma = results.params['gamma[1]']
if gamma < 0:
    print(f'存在杠杆效应 (γ = {gamma:.4f})')
    print('负收益对波动率的影响大于正收益')
else:
    print(f'无杠杆效应 (γ = {gamma:.4f})')
```

### 4.3 GJR-GARCH模型

**Glosten-Jagannathan-Runkle GARCH：**

另一种捕捉杠杆效应的模型。

**模型：**
```
σ²ₜ = ω + αε²ₜ₋₁ + γIₜ₋₁ε²ₜ₋₁ + βσ²ₜ₋₁
```

其中：
```
Iₜ₋₁ = 1 如果 εₜ₋₁ < 0
Iₜ₋₁ = 0 如果 εₜ₋₁ ≥ 0
```

**杠杆效应：**
- γ > 0：负冲击影响更大
- α + γ > 0：负冲击的总效应

**Python实现：**
```python
# GJR-GARCH模型
model = arch_model(returns, vol='Garch', p=1, q=1, power=2.0)
# 需要手动设置杠杆项

from arch.univariate import GARCH

# 自定义GJR-GARCH
class GJRGARCH(GARCH):
    def __init__(self, p=1, q=1):
        super().__init__(p=p, q=q)
        # 添加杠杆参数

# 使用arch库的HARCH作为近似
model = arch_model(returns, vol='HARCH', lags=1)
results = model.fit(disp='off')
```

### 4.4 TGARCH模型

**阈值GARCH（Threshold GARCH）：**

类似GJR-GARCH，但对方差建模。

**模型：**
```
σₜ = ω + α|εₜ₋₁| + γIₜ₋₁|εₜ₋₁| + βσₜ₋₁
```

**Python实现：**
```python
# TGARCH（通过EGARCH近似）
model = arch_model(returns, vol='EGARCH', p=1, q=1)
results = model.fit(disp='off')
```

### 4.5 APARCH模型

**非对称幂ARCH（Asymmetric Power ARCH）：**

灵活的波动率模型，可以捕捉多种特征。

**模型：**
```
σᵟₜ = ω + Σαᵢ(|εₜ₋ᵢ| - γᵢεₜ₋ᵢ)ᵟ + Σβⱼσᵟₜ₋ⱼ
```

**参数：**
- δ：幂参数（通常在1-2之间）
- γ：杠杆参数

**Python实现：**
```python
# APARCH模型
model = arch_model(returns, vol='APARCH', p=1, q=1)
results = model.fit(disp='off')

print(results.summary())

# 幂参数
delta = results.params['delta']
print(f'幂参数 δ = {delta:.4f}')

if delta < 1:
    print('波动率对方差的敏感性较低')
elif delta > 1:
    print('波动率对方差的敏感性较高')
else:
    print('标准GARCH设定')
```

---

## 5. 多元GARCH模型

### 5.1 多元波动率

**多元波动率矩阵：**
```
Hₜ = Cov(rₜ | Fₜ₋₁)
```

其中：
- rₜ = (r₁ₜ, r₂ₜ, ..., rₖₜ)' 是k维收益率向量
- Hₜ 是条件协方差矩阵

**挑战：**
- 参数数量随维度快速增长
- 需要保持正定性
- 计算复杂度高

### 5.2 CCC-GARCH模型

**恒定条件相关GARCH（Constant Conditional Correlation）：**

Bollerslev (1990) 提出。

**模型：**
```
Hₜ = DₜRDₜ
```

其中：
- Dₜ = diag(σ₁ₜ, σ₂ₜ, ..., σₖₜ) 是条件标准差对角矩阵
- R 是恒定相关矩阵

**估计步骤：**
1. 对每个序列估计单变量GARCH
2. 计算标准化残差
3. 估计相关矩阵

**Python实现：**
```python
import numpy as np
from arch import arch_model

# 多元收益率数据
returns = np.array([...])  # (n, k) 维数组

# 对每个序列估计GARCH
conditional_vols = []
standardized_resids = []

for i in range(returns.shape[1]):
    model = arch_model(returns[:, i], vol='Garch', p=1, q=1)
    result = model.fit(disp='off')
    
    conditional_vols.append(result.conditional_volatility)
    standardized_resids.append(result.resid / result.conditional_volatility)

# 计算条件相关矩阵
D = np.diag([vol[-1] for vol in conditional_vols])
R = np.corrcoef(np.array(standardized_resids).T)
H = D @ R @ D

print('条件协方差矩阵:')
print(H)
```

### 5.3 DCC-GARCH模型

**动态条件相关GARCH（Dynamic Conditional Correlation）：**

Engle (2002) 提出，相关系数动态变化。

**模型：**
```
Qₜ = (1 - a - b)Q̄ + aεₜ₋₁εₜ₋₁' + bQₜ₋₁
Rₜ = diag(Qₜ)^{-1/2} Qₜ diag(Qₜ)^{-1/2}
```

其中：
- Q̄ 是无条件协方差矩阵
- a, b 是DCC参数

**Python实现：**
```python
# 需要mgarch库
# pip install mgarch

from mgarch import mgarch

# DCC-GARCH模型
dist = mgarch.dcc_garch(returns)
dist.fit()

# 预测条件相关
cond_corr = dist.get_cond_corr()
print('动态条件相关矩阵:')
print(cond_corr[-1])

# 预测协方差
forecast = dist.forecast(horizon=10)
```

---

## 6. 金融应用

### 6.1 VaR估计

**波动率法计算VaR：**
```python
import numpy as np
from scipy.stats import norm

def var_garch(returns, confidence_level=0.95, horizon=1):
    """
    使用GARCH模型计算VaR
    
    参数:
    returns: 收益率序列
    confidence_level: 置信水平
    horizon: 预测期数
    
    返回:
    VaR值
    """
    from arch import arch_model
    
    # 拟合GARCH模型
    model = arch_model(returns, vol='Garch', p=1, q=1)
    results = model.fit(disp='off')
    
    # 预测波动率
    forecast = results.forecast(horizon=horizon)
    variance = forecast.variance.values[-1, horizon-1]
    volatility = np.sqrt(variance)
    
    # 计算VaR
    z_alpha = norm.ppf(1 - confidence_level)
    var = -z_alpha * volatility * np.sqrt(horizon)
    
    return var

# 示例
returns = np.random.normal(0.001, 0.02, 1000)
var_95 = var_garch(returns, 0.95, 1)
print(f'95% VaR (1天): {var_95:.4%}')

var_99 = var_garch(returns, 0.99, 10)
print(f'99% VaR (10天): {var_99:.4%}')
```

### 6.2 期权定价

**波动率预测用于期权定价：**
```python
from scipy.stats import norm

def bs_call(S, K, T, r, sigma):
    """
    Black-Scholes看涨期权定价
    
    参数:
    S: 标的价格
    K: 行权价
    T: 到期时间
    r: 无风险利率
    sigma: 波动率
    
    返回:
    期权价格
    """
    d1 = (np.log(S/K) + (r + 0.5*sigma**2)*T) / (sigma*np.sqrt(T))
    d2 = d1 - sigma*np.sqrt(T)
    
    call = S * norm.cdf(d1) - K * np.exp(-r*T) * norm.cdf(d2)
    return call

# 使用GARCH预测波动率
from arch import arch_model

# 假设returns是标的资产的收益率
model = arch_model(returns, vol='Garch', p=1, q=1)
results = model.fit(disp='off')

# 预测到期波动率
days_to_expiry = 30
forecast = results.forecast(horizon=days_to_expiry)
variance_forecast = forecast.variance.values[-1, -1]
vol_forecast = np.sqrt(variance_forecast * 252)  # 年化

# 期权定价
S = 100  # 标的价格
K = 105  # 行权价
T = days_to_expiry / 252  # 到期时间
r = 0.05  # 无风险利率

call_price = bs_call(S, K, T, r, vol_forecast)
print(f'看涨期权价格: {call_price:.2f}')
```

### 6.3 波动率交易

**波动率套利：**
```python
def volatility_arbitrage(returns, realized_vol, implied_vol):
    """
    波动率套利策略
    
    参数:
    returns: 收益率序列
    realized_vol: 实现波动率
    implied_vol: 隐含波动率
    
    返回:
    交易信号
    """
    from arch import arch_model
    
    # GARCH预测
    model = arch_model(returns, vol='Garch', p=1, q=1)
    results = model.fit(disp='off')
    forecast = results.forecast(horizon=1)
    garch_vol = np.sqrt(forecast.variance.values[-1, 0]) * np.sqrt(252)
    
    # 比较波动率
    if garch_vol > implied_vol:
        signal = '买入波动率（做多期权）'
        reason = f'GARCH波动率({garch_vol:.2%}) > 隐含波动率({implied_vol:.2%})'
    elif garch_vol < implied_vol:
        signal = '卖出波动率（做空期权）'
        reason = f'GARCH波动率({garch_vol:.2%}) < 隐含波动率({implied_vol:.2%})'
    else:
        signal = '持有'
        reason = '波动率合理'
    
    return {
        'signal': signal,
        'reason': reason,
        'garch_vol': garch_vol,
        'implied_vol': implied_vol,
        'realized_vol': realized_vol
    }
```

### 6.4 风险管理

**动态风险预算：**
```python
def dynamic_risk_budget(returns, target_vol=0.15, lookback=252):
    """
    动态风险预算策略
    
    参数:
    returns: 收益率序列
    target_vol: 目标波动率
    lookback: 回溯期
    
    返回:
    动态仓位
    """
    from arch import arch_model
    
    positions = []
    
    for i in range(lookback, len(returns)):
        # 使用历史数据估计GARCH
        window = returns[i-lookback:i]
        model = arch_model(window, vol='Garch', p=1, q=1)
        results = model.fit(disp='off')
        
        # 预测波动率
        forecast = results.forecast(horizon=1)
        current_vol = np.sqrt(forecast.variance.values[-1, 0])
        
        # 调整仓位
        position = target_vol / current_vol
        position = min(max(position, 0.5), 2.0)  # 限制在0.5-2倍
        positions.append(position)
    
    return positions

# 示例
returns = np.random.normal(0.001, 0.02, 1000)
positions = dynamic_risk_budget(returns)

# 可视化
import matplotlib.pyplot as plt
plt.figure(figsize=(12, 6))
plt.plot(positions)
plt.xlabel('时间')
plt.ylabel('仓位')
plt.title('动态风险预算仓位')
plt.axhline(y=1, color='r', linestyle='--')
plt.savefig('dynamic_risk_budget.png')
```

---

## 7. GARCH模型诊断

### 7.1 残差检验

**标准化残差：**
```
zₜ = εₜ / σₜ
```

如果模型正确，zₜ 应该是 i.i.d. 标准正态分布。

**检验项目：**
```python
from scipy import stats

# 标准化残差
std_resid = results.resid / results.conditional_volatility

# 1. 正态性检验
jb_stat, jb_pvalue = stats.jarque_bera(std_resid)
print(f'Jarque-Bera检验: JB={jb_stat:.4f}, p={jb_pvalue:.4f}')

# 2. 自相关检验
from statsmodels.stats.diagnostic import acorr_ljungbox
lb_test = acorr_ljungbox(std_resid, lags=[10], return_df=True)
print(f'Ljung-Box检验:\n{lb_test}')

# 3. ARCH-LM检验
from statsmodels.stats.diagnostic import het_arch
lm_stat, p_value, f_stat, fp_value = het_arch(std_resid, nlags=10)
print(f'ARCH-LM检验: LM={lm_stat:.4f}, p={p_value:.4f}')

# 4. QQ图
import matplotlib.pyplot as plt
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

# 残差时序图
axes[0, 0].plot(std_resid)
axes[0, 0].set_title('标准化残差')

# ACF
from statsmodels.graphics.tsaplots import plot_acf
plot_acf(std_resid, ax=axes[0, 1], lags=30)
axes[0, 1].set_title('残差ACF')

# QQ图
stats.probplot(std_resid, dist="norm", plot=axes[1, 0])
axes[1, 0].set_title('QQ图')

# 残差平方ACF
plot_acf(std_resid**2, ax=axes[1, 1], lags=30)
axes[1, 1].set_title('残差平方ACF')

plt.tight_layout()
plt.savefig('garch_diagnostics.png')
```

### 7.2 模型比较

**信息准则比较：**
```python
# 比较不同模型
models = {
    'GARCH(1,1)-Normal': arch_model(returns, vol='Garch', p=1, q=1, dist='normal'),
    'GARCH(1,1)-t': arch_model(returns, vol='Garch', p=1, q=1, dist='t'),
    'EGARCH(1,1)': arch_model(returns, vol='EGARCH', p=1, q=1),
    'GJR-GARCH(1,1)': arch_model(returns, vol='Garch', p=1, q=1, power=2.0),
}

results_comparison = {}
for name, model in models.items():
    result = model.fit(disp='off')
    results_comparison[name] = {
        'AIC': result.aic,
        'BIC': result.bic,
        'Log-Likelihood': result.loglikelihood
    }

comparison_df = pd.DataFrame(results_comparison).T
print(comparison_df)

# 选择最优模型
best_model = comparison_df['AIC'].idxmin()
print(f'最优模型（AIC）: {best_model}')
```

---

## 8. 总结

GARCH波动率模型要点：

1. **波动率特征**：聚集性、厚尾、杠杆效应、均值回归
2. **ARCH模型**：条件异方差基础模型
3. **GARCH模型**：最常用，GARCH(1,1)简洁有效
4. **扩展模型**：EGARCH、GJR-GARCH、TGARCH捕捉杠杆效应
5. **多元GARCH**：CCC-GARCH、DCC-GARCH处理多资产
6. **金融应用**：VaR估计、期权定价、波动率交易、风险管理
7. **模型诊断**：残差检验、正态性检验、ARCH-LM检验

**模型选择建议：**
- 一般情况：GARCH(1,1)
- 杠杆效应：EGARCH或GJR-GARCH
- 长记忆：IGARCH或FIGARCH
- 高频数据：Realized GARCH
- 多资产：DCC-GARCH

**注意事项：**
- 检查ARCH效应
- 选择合适的分布假设
- 进行残差诊断
- 样本外验证
- 考虑交易成本

---

*创建时间: 2026-03-04*
*模块: 时间序列分析 - 模块3*
*关键词: GARCH, 波动率建模, VaR, 杠杆效应*
