# Black-Litterman模型

## 1. 模型原理

### 1.1 传统均值方差模型的缺陷

**缺陷：**
- 对输入参数敏感
- 估计误差被放大
- 产生极端权重
- 无经济含义

### 1.2 Black-Litterman模型

**核心思想：**
结合市场均衡收益和投资者观点，生成更合理的期望收益。

**公式：**
```
E[R] = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ × [(τΣ)⁻¹Π + P'Ω⁻¹Q]
```

其中：
- Π：市场均衡收益
- Q：投资者观点
- P：观点矩阵
- Ω：观点不确定性
- τ：缩放因子
- Σ：协方差矩阵

---

## 2. 市场均衡收益

### 2.1 反向优化

**从市场权重推导期望收益：**
```python
def market_equilibrium_returns(market_weights, cov_matrix, risk_free_rate=0.02):
    """
    计算市场均衡收益
    
    参数:
    market_weights: 市场权重
    cov_matrix: 协方差矩阵
    risk_free_rate: 无风险利率
    
    返回:
    市场均衡收益
    """
    # 风险厌恶系数
    # 假设市场组合的夏普比率为0.5
    market_vol = np.sqrt(market_weights @ cov_matrix @ market_weights)
    market_return = risk_free_rate + 0.5 * market_vol
    
    # 风险厌恶系数
    delta = (market_return - risk_free_rate) / (market_vol ** 2)
    
    # 市场均衡收益
    pi = delta * cov_matrix @ market_weights + risk_free_rate
    
    return pi

# 示例
market_weights = np.array([0.4, 0.3, 0.2, 0.1])
cov_matrix = np.array([
    [0.04, 0.01, 0.02, 0.01],
    [0.01, 0.09, 0.03, 0.02],
    [0.02, 0.03, 0.16, 0.04],
    [0.01, 0.02, 0.04, 0.25]
])

pi = market_equilibrium_returns(market_weights, cov_matrix)
print(f'市场均衡收益: {pi}')
```

---

## 3. 投资者观点

### 3.1 观点表达

**绝对观点：**
```python
# 观点：资产1的收益为10%
P = np.array([[1, 0, 0, 0]])  # 观点矩阵
Q = np.array([0.10])  # 观点值
```

**相对观点：**
```python
# 观点：资产1比资产2收益高5%
P = np.array([[1, -1, 0, 0]])  # 观点矩阵
Q = np.array([0.05])  # 观点值
```

### 3.2 观点不确定性

**Ω矩阵：**
```python
def create_omega_matrix(P, tau, cov_matrix, confidence=0.5):
    """
    创建观点不确定性矩阵
    
    参数:
    P: 观点矩阵
    tau: 缩放因子
    cov_matrix: 协方差矩阵
    confidence: 观点置信度
    
    返回:
    Ω矩阵
    """
    # 观点不确定性
    omega = np.diag(np.diag(P @ (tau * cov_matrix) @ P.T) / confidence)
    
    return omega

# 示例
tau = 0.025  # 缩放因子
P = np.array([
    [1, 0, 0, 0],      # 观点1：资产1收益10%
    [0, 1, -1, 0]      # 观点2：资产2比资产3收益高3%
])
Q = np.array([0.10, 0.03])

omega = create_omega_matrix(P, tau, cov_matrix)
```

---

## 4. Black-Litterman计算

### 4.1 完整实现

```python
def black_litterman(market_weights, cov_matrix, P, Q, tau=0.025, 
                    risk_free_rate=0.02, omega=None):
    """
    Black-Litterman模型
    
    参数:
    market_weights: 市场权重
    cov_matrix: 协方差矩阵
    P: 观点矩阵
    Q: 观点值
    tau: 缩放因子
    risk_free_rate: 无风险利率
    omega: 观点不确定性矩阵
    
    返回:
    期望收益、后验协方差
    """
    # 市场均衡收益
    pi = market_equilibrium_returns(market_weights, cov_matrix, risk_free_rate)
    
    # 观点不确定性
    if omega is None:
        omega = np.diag(np.diag(P @ (tau * cov_matrix) @ P.T))
    
    # Black-Litterman期望收益
    term1 = np.linalg.inv(tau * cov_matrix) + P.T @ np.linalg.inv(omega) @ P
    term2 = np.linalg.inv(tau * cov_matrix) @ pi + P.T @ np.linalg.inv(omega) @ Q
    
    expected_returns = np.linalg.inv(term1) @ term2
    
    # 后验协方差
    posterior_cov = np.linalg.inv(term1)
    
    return expected_returns, posterior_cov

# 示例
expected_returns, posterior_cov = black_litterman(
    market_weights, cov_matrix, P, Q, tau=0.025
)

print(f'Black-Litterman期望收益: {expected_returns}')
```

### 4.2 组合优化

```python
def bl_optimize(expected_returns, posterior_cov, risk_aversion=2.5):
    """
    Black-Litterman组合优化
    
    参数:
    expected_returns: BL期望收益
    posterior_cov: 后验协方差
    risk_aversion: 风险厌恶系数
    
    返回:
    最优权重
    """
    # 均值方差优化
    n_assets = len(expected_returns)
    
    def neg_utility(weights):
        portfolio_return = weights @ expected_returns
        portfolio_var = weights @ posterior_cov @ weights
        utility = portfolio_return - 0.5 * risk_aversion * portfolio_var
        return -utility
    
    from scipy.optimize import minimize
    
    constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
    bounds = [(0, 1) for _ in range(n_assets)]
    
    result = minimize(
        neg_utility,
        x0=[1/n_assets] * n_assets,
        bounds=bounds,
        constraints=constraints
    )
    
    return result.x

# 优化
optimal_weights = bl_optimize(expected_returns, posterior_cov)
print(f'最优权重: {optimal_weights}')
```

---

## 5. 实战应用

### 5.1 完整流程

```python
class BlackLittermanModel:
    """Black-Litterman模型"""
    
    def __init__(self, market_weights, returns, risk_free_rate=0.02):
        self.market_weights = market_weights
        self.returns = returns
        self.risk_free_rate = risk_free_rate
        self.cov_matrix = returns.cov().values
    
    def set_views(self, P, Q, confidences=None):
        """
        设置观点
        
        参数:
        P: 观点矩阵
        Q: 观点值
        confidences: 置信度
        """
        self.P = P
        self.Q = Q
        
        # 观点不确定性
        if confidences is None:
            confidences = np.ones(len(Q)) * 0.5
        
        tau = 0.025
        self.omega = np.diag(
            np.diag(self.P @ (tau * self.cov_matrix) @ self.P.T) / confidences
        )
    
    def fit(self, tau=0.025):
        """拟合模型"""
        # 市场均衡收益
        self.pi = market_equilibrium_returns(
            self.market_weights, 
            self.cov_matrix, 
            self.risk_free_rate
        )
        
        # BL期望收益
        term1 = np.linalg.inv(tau * self.cov_matrix) + \
                self.P.T @ np.linalg.inv(self.omega) @ self.P
        term2 = np.linalg.inv(tau * self.cov_matrix) @ self.pi + \
                self.P.T @ np.linalg.inv(self.omega) @ self.Q
        
        self.expected_returns = np.linalg.inv(term1) @ term2
        self.posterior_cov = np.linalg.inv(term1)
        
        return self
    
    def optimize(self, risk_aversion=2.5):
        """优化"""
        return bl_optimize(
            self.expected_returns, 
            self.posterior_cov, 
            risk_aversion
        )
```

### 5.2 案例应用

```python
# 示例：全球资产配置
assets = ['US Equity', 'Intl Equity', 'US Bond', 'Intl Bond', 'Commodity']

# 市场权重
market_weights = np.array([0.45, 0.15, 0.25, 0.10, 0.05])

# 历史收益
returns = pd.DataFrame(...)  # 历史收益率数据

# 观点
P = np.array([
    [1, 0, 0, 0, 0],      # 美股收益8%
    [0, 1, -1, 0, 0],     # 国际股票比国际债券收益高4%
    [0, 0, 0, 0, 1]       # 商品收益-2%
])
Q = np.array([0.08, 0.04, -0.02])
confidences = np.array([0.7, 0.5, 0.3])

# BL模型
bl = BlackLittermanModel(market_weights, returns)
bl.set_views(P, Q, confidences)
bl.fit()

# 优化
optimal_weights = bl.optimize()

print('最优权重:')
for asset, weight in zip(assets, optimal_weights):
    print(f'{asset}: {weight:.2%}')
```

---

## 6. 总结

Black-Litterman模型要点：

1. **市场均衡收益**：从市场权重反推
2. **投资者观点**：绝对观点、相对观点
3. **观点不确定性**：Ω矩阵
4. **模型计算**：BL期望收益、后验协方差
5. **组合优化**：均值方差优化

**优点：**
- 结合市场信息和观点
- 权重更合理
- 对输入参数稳健
- 经济含义清晰

**缺点：**
- 观点设定主观
- Ω矩阵估计困难
- τ选择不确定

---

*创建时间: 2026-03-04*
