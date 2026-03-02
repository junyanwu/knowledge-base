# Python量化编程基础

## 一、环境搭建

### 1.1 Python安装
```bash
# 推荐使用Anaconda
# 下载: https://www.anaconda.com/download

# 或使用Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh
```

### 1.2 常用量化库
```bash
# 数据处理
pip install numpy pandas

# 数据获取
pip install tushare akshare yfinance

# 可视化
pip install matplotlib seaborn plotly

# 机器学习
pip install scikit-learn tensorflow torch

# 回测框架
pip install backtrader zipline
```

### 1.3 开发环境
- Jupyter Notebook: 交互式开发
- VS Code: 专业IDE
- PyCharm: 专业IDE

## 二、NumPy基础

### 2.1 数组创建
```python
import numpy as np

# 一维数组
arr1 = np.array([1, 2, 3, 4, 5])

# 二维数组
arr2 = np.array([[1, 2, 3], [4, 5, 6]])

# 特殊数组
zeros = np.zeros((3, 3))  # 全零
ones = np.ones((3, 3))    # 全一
eye = np.eye(3)           # 单位矩阵
rand = np.random.randn(3, 3)  # 标准正态分布
```

### 2.2 数组运算
```python
# 基本运算
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

print(a + b)   # [5, 7, 9]
print(a * b)   # [4, 10, 18]
print(a ** 2)  # [1, 4, 9]

# 统计函数
print(np.mean(a))    # 均值
print(np.std(a))     # 标准差
print(np.max(a))     # 最大值
print(np.sum(a))     # 求和
```

### 2.3 矩阵运算
```python
# 矩阵乘法
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

C = np.dot(A, B)  # 或 A @ B
print(C)

# 转置
print(A.T)

# 逆矩阵
print(np.linalg.inv(A))

# 行列式
print(np.linalg.det(A))
```

## 三、Pandas基础

### 3.1 数据结构
```python
import pandas as pd

# Series
s = pd.Series([1, 2, 3, 4, 5], index=['a', 'b', 'c', 'd', 'e'])

# DataFrame
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=5),
    'open': [10, 11, 12, 13, 14],
    'close': [11, 12, 11, 14, 15],
    'volume': [1000, 1100, 900, 1200, 1300]
})
```

### 3.2 数据读取
```python
# CSV文件
df = pd.read_csv('data.csv')

# Excel文件
df = pd.read_excel('data.xlsx')

# 数据库
import sqlite3
conn = sqlite3.connect('database.db')
df = pd.read_sql('SELECT * FROM stocks', conn)

# Tushare数据
import tushare as ts
pro = ts.pro_api('your_token')
df = pro.daily(ts_code='000001.SZ', start_date='20240101', end_date='20241231')
```

### 3.3 数据处理
```python
# 选择数据
df['close']                    # 选择列
df.loc[0]                      # 按索引选择行
df.iloc[0]                     # 按位置选择行
df[df['close'] > 12]           # 条件筛选

# 数据清洗
df.dropna()                    # 删除缺失值
df.fillna(0)                   # 填充缺失值
df.drop_duplicates()           # 删除重复值

# 数据转换
df['return'] = df['close'].pct_change()  # 收益率
df['ma5'] = df['close'].rolling(5).mean()  # 移动平均
df['std'] = df['close'].rolling(20).std()  # 滚动标准差

# 分组聚合
df.groupby('date').sum()
df.groupby('date').agg({'close': 'mean', 'volume': 'sum'})
```

### 3.4 时间序列
```python
# 日期范围
dates = pd.date_range('2024-01-01', '2024-12-31', freq='D')

# 重采样
df.resample('M').last()        # 月度数据
df.resample('W').mean()        # 周度数据

# 滚动窗口
df.rolling(20).mean()          # 20日移动平均
df.rolling(20).std()           # 20日滚动标准差

# 时间偏移
df.shift(1)                    # 向后偏移1期
df.shift(-1)                   # 向前偏移1期
```

## 四、数据可视化

### 4.1 Matplotlib基础
```python
import matplotlib.pyplot as plt

# 折线图
plt.figure(figsize=(12, 6))
plt.plot(df['date'], df['close'])
plt.title('Stock Price')
plt.xlabel('Date')
plt.ylabel('Price')
plt.grid(True)
plt.show()

# K线图
from mplfinance.original_flavor import candlestick_ohlc
fig, ax = plt.subplots(figsize=(12, 6))
candlestick_ohlc(ax, df.values, width=0.6, colorup='r', colordown='g')
plt.show()
```

### 4.2 Seaborn高级绑图
```python
import seaborn as sns

# 热力图（相关性矩阵）
corr = df.corr()
sns.heatmap(corr, annot=True, cmap='coolwarm')
plt.show()

# 分布图
sns.histplot(df['return'], kde=True)
plt.show()

# 箱线图
sns.boxplot(data=df[['open', 'close', 'high', 'low']])
plt.show()
```

### 4.3 Plotly交互图表
```python
import plotly.graph_objects as go

# K线图
fig = go.Figure(data=[go.Candlestick(
    x=df['date'],
    open=df['open'],
    high=df['high'],
    low=df['low'],
    close=df['close']
)])
fig.update_layout(title='Stock Price', xaxis_title='Date', yaxis_title='Price')
fig.show()

# 多线图
fig = go.Figure()
fig.add_trace(go.Scatter(x=df['date'], y=df['close'], name='Close'))
fig.add_trace(go.Scatter(x=df['date'], y=df['ma20'], name='MA20'))
fig.show()
```

## 五、策略开发

### 5.1 均线策略
```python
def ma_strategy(prices, short_window=5, long_window=20):
    """
    双均线策略
    """
    signals = pd.DataFrame(index=prices.index)
    signals['price'] = prices
    signals['short_ma'] = prices.rolling(short_window).mean()
    signals['long_ma'] = prices.rolling(long_window).mean()
    
    # 生成信号
    signals['signal'] = 0
    signals.loc[signals['short_ma'] > signals['long_ma'], 'signal'] = 1
    signals.loc[signals['short_ma'] < signals['long_ma'], 'signal'] = -1
    
    # 计算持仓变化
    signals['position'] = signals['signal'].diff()
    
    return signals
```

### 5.2 布林带策略
```python
def bollinger_strategy(prices, window=20, num_std=2):
    """
    布林带策略
    """
    signals = pd.DataFrame(index=prices.index)
    signals['price'] = prices
    signals['middle'] = prices.rolling(window).mean()
    signals['std'] = prices.rolling(window).std()
    signals['upper'] = signals['middle'] + num_std * signals['std']
    signals['lower'] = signals['middle'] - num_std * signals['std']
    
    # 生成信号
    signals['signal'] = 0
    signals.loc[signals['price'] < signals['lower'], 'signal'] = 1  # 超卖
    signals.loc[signals['price'] > signals['upper'], 'signal'] = -1  # 超买
    
    return signals
```

### 5.3 回测框架
```python
def backtest(prices, signals, initial_capital=100000, commission=0.0003):
    """
    简单回测框架
    """
    capital = initial_capital
    position = 0
    portfolio_value = []
    
    for i in range(len(prices)):
        price = prices.iloc[i]
        signal = signals['signal'].iloc[i]
        
        # 买入
        if signal == 1 and position == 0:
            shares = capital // price
            capital -= shares * price * (1 + commission)
            position = shares
        
        # 卖出
        elif signal == -1 and position > 0:
            capital += position * price * (1 - commission)
            position = 0
        
        # 记录组合价值
        portfolio_value.append(capital + position * price)
    
    return pd.Series(portfolio_value, index=prices.index)
```

## 六、机器学习应用

### 6.1 数据准备
```python
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# 特征工程
def create_features(df):
    df['return_1d'] = df['close'].pct_change(1)
    df['return_5d'] = df['close'].pct_change(5)
    df['return_20d'] = df['close'].pct_change(20)
    df['volatility'] = df['return_1d'].rolling(20).std()
    df['ma5'] = df['close'].rolling(5).mean()
    df['ma20'] = df['close'].rolling(20).mean()
    df['ma_ratio'] = df['ma5'] / df['ma20']
    df['rsi'] = calculate_rsi(df['close'], 14)
    df['target'] = (df['close'].shift(-1) > df['close']).astype(int)
    return df.dropna()

# 训练测试集划分
features = ['return_1d', 'return_5d', 'return_20d', 'volatility', 'ma_ratio', 'rsi']
X = df[features]
y = df['target']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

# 标准化
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)
```

### 6.2 模型训练
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# 随机森林
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
model.fit(X_train, y_train)

# 预测
y_pred = model.predict(X_test)

# 评估
print(f'Accuracy: {accuracy_score(y_test, y_pred):.4f}')
print(classification_report(y_test, y_pred))

# 特征重要性
feature_importance = pd.DataFrame({
    'feature': features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print(feature_importance)
```

### 6.3 深度学习 (LSTM)
```python
import torch
import torch.nn as nn

class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super(LSTMModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out

# 创建模型
model = LSTMModel(input_size=len(features), hidden_size=64, num_layers=2, output_size=1)
criterion = nn.BCEWithLogitsLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# 训练
for epoch in range(100):
    outputs = model(X_train_tensor)
    loss = criterion(outputs, y_train_tensor)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    
    if (epoch + 1) % 10 == 0:
        print(f'Epoch [{epoch+1}/100], Loss: {loss.item():.4f}')
```

---

*更新时间: 2026-03-02*
*来源: Python量化编程知识整理*
