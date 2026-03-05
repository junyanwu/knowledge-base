# 时间序列分析 - 模块2：ARIMA应用

## 1. ARIMA模型理论

### 1.1 AR(p)自回归模型

**模型形式：**
```
Yₜ = c + φ₁Yₜ₋₁ + φ₂Yₜ₋₂ + ... + φₚYₜ₋ₚ + εₜ
```

**平稳性条件：**
- 特征方程的根在单位圆外
- |φ₁ + φ₂ + ... + φₚ| < 1

**自相关函数（ACF）：**
- AR(1): ρₖ = φ₁ᵏ
- AR(p): 呈指数衰减或阻尼振荡

**偏自相关函数（PACF）：**
- AR(p): p阶后截尾

### 1.2 I(d)差分过程

**差分运算：**
```
ΔYₜ = Yₜ - Yₜ₋₁
ΔᵈYₜ = (1-B)ᵈYₜ
```

**单位根检验：**

**ADF检验（Augmented Dickey-Fuller）：**
```
ΔYₜ = α + βt + γYₜ₋₁ + ΣδᵢΔYₜ₋ᵢ + εₜ
H₀: γ = 0（单位根存在）
H₁: γ < 0（平稳）
```

**PP检验（Phillips-Perron）：**
- 非参数方法
- 对异方差和自相关稳健

**KPSS检验：**
```
H₀: 序列平稳
H₁: 存在单位根
```

### 1.3 MA(q)移动平均模型

**模型形式：**
```
Yₜ = μ + εₜ + θ₁εₜ₋₁ + θ₂εₜ₋₂ + ... + θᵧεₜ₋ᵧ
```

**可逆性条件：**
- |θ₁ + θ₂ + ... + θᵧ| < 1
- 特征方程根在单位圆外

**自相关函数（ACF）：**
- MA(q): q阶后截尾

**偏自相关函数（PACF）：**
- MA(q): 呈指数衰减

### 1.4 ARIMA(p,d,q)组合模型

**完整模型：**
```
φ(B)(1-B)ᵈYₜ = θ(B)εₜ
```

其中：
- φ(B) = 1 - φ₁B - ... - φₚBᵖ（AR多项式）
- θ(B) = 1 + θ₁B + ... + θᵧBᵧ（MA多项式）
- d：差分阶数

**模型标识：**

| 模型 | ACF特征 | PACF特征 |
|------|---------|----------|
| AR(p) | 指数衰减 | p阶截尾 |
| MA(q) | q阶截尾 | 指数衰减 |
| ARMA(p,q) | 指数衰减 | 指数衰减 |
| ARIMA(p,d,q) | 差分后同ARMA | 差分后同ARMA |

---

## 2. 模型识别与估计

### 2.1 ACF/PACF图分析

**识别流程：**

1. **绘制原始序列图**
   - 观察趋势和季节性
   - 判断平稳性

2. **差分处理**
   - 有趋势：一阶差分
   - 有季节性：季节差分
   - ADF检验确认

3. **ACF/PACF分析**
   - ACF截尾 → MA模型
   - PACF截尾 → AR模型
   - 均拖尾 → ARMA模型

**示例判断：**

```python
import pandas as pd
import matplotlib.pyplot as plt
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

# 原始序列
fig, axes = plt.subplots(3, 1)
data.plot(ax=axes[0])
plot_acf(data, ax=axes[1], lags=40)
plot_pacf(data, ax=axes[2], lags=40)

# 差分后
data_diff = data.diff().dropna()
```

### 2.2 信息准则

**AIC准则（Akaike Information Criterion）：**
```
AIC = -2ln(L) + 2k
```

**BIC准则（Bayesian Information Criterion）：**
```
BIC = -2ln(L) + kln(n)
```

**HQ准则（Hannan-Quinn）：**
```
HQ = -2ln(L) + 2kln(ln(n))
```

其中：
- L：似然函数最大值
- k：参数个数
- n：样本量

**选择标准：**
- AIC倾向于选择较复杂模型
- BIC倾向于选择较简单模型
- 实践中可结合使用

### 2.3 参数估计方法

**极大似然估计（MLE）：**

似然函数：
```
L(φ, θ, σ²) = (2πσ²)^(-n/2) exp(-Σεₜ²/2σ²)
```

对数似然：
```
ln L = -n/2 ln(2πσ²) - Σεₜ²/2σ²
```

**条件似然：**
- 给定初始值，递归计算残差
- 适用于小样本

**精确似然：**
- 对初始值积分
- 计算复杂但更精确

**CSS（Conditional Sum of Squares）：**
```
min Σεₜ²
```

### 2.4 模型诊断检验

**残差检验：**

1. **白噪声检验**
   ```
   Q = n(n+2)Σρ²ₖ/(n-k) ~ χ²ₘ
   ```
   Ljung-Box Q统计量

2. **正态性检验**
   - Jarque-Bera检验
   - Shapiro-Wilk检验
   - Q-Q图

3. **ARCH效应检验**
   ```
   辅助回归：ε²ₜ = α₀ + α₁ε²ₜ₋₁ + ... + αₘε²ₜ₋ₘ + νₜ
   H₀: α₁ = ... = αₘ = 0
   ```

**模型比较：**
- 信息准则比较
- 样本外预测比较
- 残差诊断比较

---

## 3. 季节性模型

### 3.1 SARIMA模型

**模型形式：**
```
Φₚ(B)Φₚ(Bˢ)(1-B)ᵈ(1-Bˢ)ᴰYₜ = Θᵧ(B)Θᵧ(Bˢ)εₜ
```

其中：
- (p,d,q)：非季节部分
- (P,D,Q)s：季节部分
- s：季节周期（月度=12，季度=4）

**标识方法：**
```
ARIMA(p,d,q)(P,D,Q)s
```

**示例：**
```
ARIMA(1,1,1)(1,1,1)12

展开：
(1-φB)(1-ΦB¹²)(1-B)(1-B¹²)Yₜ = (1+θB)(1+ΘB¹²)εₜ
```

### 3.2 季节性分解

**加法模型：**
```
Yₜ = Tₜ + Sₜ + Rₜ
```

**乘法模型：**
```
Yₜ = Tₜ × Sₜ × Rₜ
```

其中：
- Tₜ：趋势项
- Sₜ：季节项
- Rₜ：残差项

**分解方法：**

1. **经典分解**
   - 移动平均提取趋势
   - 计算季节指数

2. **STL分解**
   - LOESS平滑
   - 可处理任意季节性

3. **X-13ARIMA-SEATS**
   - 官方统计标准
   - 自动检测季节性

```python
from statsmodels.tsa.seasonal import seasonal_decompose

# 加法分解
result = seasonal_decompose(data, model='additive', period=12)
result.plot()

# STL分解
from statsmodels.tsa.seasonal import STL
stl = STL(data, period=12)
result = stl.fit()
```

### 3.3 周期性分解

**周期图分析：**
```python
from scipy.fft import fft

# 傅里叶变换
freqs = np.fft.fftfreq(len(data))
spectrum = np.abs(fft(data))

# 找主周期
peak_freq = freqs[np.argmax(spectrum[1:len(data)//2]) + 1]
period = 1 / peak_freq
```

---

## 4. 金融应用

### 4.1 股价预测

**收益率建模：**
```
rₜ = ln(Pₜ/Pₜ₋₁)
```

**ARIMA建模步骤：**

1. **检验平稳性**
   ```python
   from statsmodels.tsa.stattools import adfuller
   
   result = adfuller(returns)
   print(f'ADF统计量: {result[0]}')
   print(f'p值: {result[1]}')
   ```

2. **识别模型**
   ```python
   fig, axes = plt.subplots(2, 1)
   plot_acf(returns, ax=axes[0], lags=20)
   plot_pacf(returns, ax=axes[1], lags=20)
   ```

3. **拟合模型**
   ```python
   from statsmodels.tsa.arima.model import ARIMA
   
   model = ARIMA(returns, order=(1, 0, 1))
   results = model.fit()
   print(results.summary())
   ```

4. **预测**
   ```python
   forecast = results.forecast(steps=10)
   conf_int = results.get_forecast(steps=10).conf_int()
   ```

**注意事项：**
- 股价通常不平稳，收益率可能平稳
- 预测能力有限，主要用于短期
- 考虑波动率聚类（GARCH效应）

### 4.2 波动率建模

**GARCH模型：**
```
σ²ₜ = ω + αε²ₜ₋₁ + βσ²ₜ₋₁
```

**ARIMA-GARCH组合：**
```
均值方程：rₜ = μ + φrₜ₋₁ + εₜ
方差方程：σ²ₜ = ω + αε²ₜ₋₁ + βσ²ₜ₋₁
```

```python
from arch import arch_model

# 拟合GARCH(1,1)
am = arch_model(returns, vol='Garch', p=1, q=1)
res = am.fit()
print(res.summary())

# 波动率预测
forecast = res.forecast(horizon=10)
vol_forecast = np.sqrt(forecast.variance.values[-1, :])
```

### 4.3 利率期限结构

**利率建模：**
```
短期利率：rₜ
AR模型：drₜ = κ(θ - rₜ)dt + σdWₜ
```

**Vasicek模型：**
```
rₜ = rₜ₋₁ + α(β - rₜ₋₁)Δt + σεₜ
```

**CIR模型：**
```
rₜ = rₜ₋₁ + α(β - rₜ₋₁)Δt + σ√rₜ₋₁εₜ
```

**收益率曲线预测：**
```python
# 提取收益率曲线主成分
from sklearn.decomposition import PCA

pca = PCA(n_components=3)
factors = pca.fit_transform(yield_curve.T)

# 对因子建模
model_factor1 = ARIMA(factors[:, 0], order=(1, 0, 0))
model_factor2 = ARIMA(factors[:, 1], order=(1, 0, 0))
model_factor3 = ARIMA(factors[:, 2], order=(1, 0, 0))
```

### 4.4 汇率预测

**汇率特征：**
- 单位根过程
- 随机游走特征
- 长记忆性

**ARFIMA模型：**
```
(1-L)ᵈYₜ = φ⁻¹(B)θ(B)εₜ
```

其中d ∈ (-0.5, 0.5)为分数差分阶数。

**协整建模：**
```python
from statsmodels.tsa.stattools import coint

# 协整检验
score, pvalue, _ = coint(currency1, currency2)

if pvalue < 0.05:
    # 存在协整关系，使用误差修正模型
    # ECM模型
    pass
```

---

## 5. 模型选择与评估

### 5.1 样本内评估

**拟合优度：**
```
R² = 1 - SSE/SST
调整R² = 1 - (1-R²)(n-1)/(n-k)
```

**AIC/BIC：**
- 越小越好
- 用于模型比较

**残差诊断：**
- 白噪声检验（Ljung-Box）
- 正态性检验
- ARCH-LM检验

### 5.2 样本外评估

**预测误差指标：**
```
RMSE = √(Σ(Ŷₜ - Yₜ)²/n)
MAE = Σ|Ŷₜ - Yₜ|/n
MAPE = Σ|Yₜ - Ŷₜ|/Yₜ/n × 100%
```

**Diebold-Mariano检验：**
```
H₀: 两模型预测能力相同
统计量：DM = d̄ / √(Var(d̄))
```

**滚动预测：**
```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5)

for train_idx, test_idx in tscv.split(data):
    train, test = data[train_idx], data[test_idx]
    model = ARIMA(train, order=(1, 0, 1)).fit()
    forecast = model.forecast(steps=len(test))
    rmse = np.sqrt(np.mean((forecast - test)**2))
```

### 5.3 预测区间

**点预测：**
```
Ŷₜ₊ₕ = E(Yₜ₊ₕ|Yₜ, Yₜ₋₁, ...)
```

**区间预测：**
```
Ŷₜ₊ₕ ± zₐ/₂ × SE(Ŷₜ₊ₕ)
```

**预测不确定性：**
- 预测步数增加，不确定性增大
- h步预测方差：
  ```
  Var(eₜ₊ₕ) = σ²(1 + ψ₁² + ... + ψ²ₕ₋₁)
  ```

---

## 6. Python实战

### 6.1 完整建模流程

```python
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
from statsmodels.stats.diagnostic import acorr_ljungbox
import matplotlib.pyplot as plt

# 1. 数据准备
data = pd.read_csv('stock_prices.csv', parse_dates=['date'], index_col='date')
data = data['close']
returns = np.log(data).diff().dropna()

# 2. 平稳性检验
def adf_test(series):
    result = adfuller(series)
    print(f'ADF统计量: {result[0]:.4f}')
    print(f'p值: {result[1]:.4f}')
    print('临界值:')
    for key, value in result[4].items():
        print(f'  {key}: {value:.4f}')
    return result[1] < 0.05

is_stationary = adf_test(returns)

# 3. 模型识别
fig, axes = plt.subplots(2, 1, figsize=(10, 8))
plot_acf(returns, ax=axes[0], lags=30)
plot_pacf(returns, ax=axes[1], lags=30)
plt.tight_layout()
plt.savefig('acf_pacf.png')

# 4. 模型拟合
model = ARIMA(returns, order=(1, 0, 1))
results = model.fit()
print(results.summary())

# 5. 残差诊断
residuals = results.resid
lb_test = acorr_ljungbox(residuals, lags=[10], return_df=True)
print('Ljung-Box检验:', lb_test)

# 6. 预测
forecast = results.forecast(steps=10)
conf_int = results.get_forecast(steps=10).conf_int()

# 7. 可视化
plt.figure(figsize=(12, 6))
plt.plot(returns[-100:], label='实际值')
plt.plot(forecast.index, forecast, label='预测值', color='red')
plt.fill_between(conf_int.index, conf_int['lower close'], 
                 conf_int['upper close'], alpha=0.3, color='red')
plt.legend()
plt.savefig('forecast.png')
```

### 6.2 自动模型选择

```python
import pmdarima as pm

# 自动ARIMA
auto_model = pm.auto_arima(
    returns,
    start_p=0, start_q=0,
    max_p=5, max_q=5,
    d=None,  # 自动确定差分阶数
    seasonal=False,
    trace=True,
    error_action='ignore',
    suppress_warnings=True,
    stepwise=True
)

print(auto_model.summary())

# 预测
forecast, conf_int = auto_model.predict(n_periods=10, return_conf_int=True)
```

---

## 7. 总结

ARIMA模型应用要点：

1. **平稳性检验**：ADF、PP、KPSS检验
2. **模型识别**：ACF/PACF图分析
3. **参数估计**：极大似然估计
4. **模型诊断**：残差白噪声检验
5. **预测评估**：样本外验证

**适用场景：**
- 短期预测
- 单变量时间序列
- 平稳或可差分平稳序列

**局限性：**
- 长期预测不准
- 无法处理非线性关系
- 不考虑外生变量

**改进方向：**
- ARIMAX：加入外生变量
- SARIMA：季节性数据
- GARCH：波动率建模
- 机器学习方法：LSTM、Transformer

---

*创建时间: 2026-03-04*
*模块: 时间序列分析 - 模块2*
*关键词: ARIMA, 时间序列, 金融预测, 波动率建模*
