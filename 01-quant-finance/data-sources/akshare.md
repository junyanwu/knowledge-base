---
title: AkShare 财经数据接口
category: quantitative-finance
tags: [data, api, python, akshare]
created: 2026-02-22
updated: 2026-02-22
source: https://akshare.akfamily.xyz/
---

# AkShare 财经数据接口

> 📊 **开源财经数据接口库** - Python 时代的财经数据解决方案

---

## 概述

AkShare 是一个基于 Python 的开源财经数据接口库，提供全面的金融市场数据。

**核心特点**:
- 🆓 完全免费开源
- 🔌 接口丰富 (股票/期货/基金/债券/外汇等)
- 🐍 Python 原生
- 📈 实时更新

---

## 安装

```bash
pip install akshare
```

---

## ETF 数据下载

### 获取 ETF 列表

```python
import akshare as ak

# 获取所有 ETF 列表
etf_list = ak.fund_etf_spot_em()
print(etf_list.head())

# 字段说明
# 代码、名称、最新价、涨跌幅、成交量、成交额等
```

### 下载 ETF 历史数据

```python
import akshare as ak
import pandas as pd

def download_etf_history(symbol, start_date, end_date):
    """
    下载 ETF 历史行情
    
    Args:
        symbol: ETF 代码 (如 "510300")
        start_date: 开始日期 (如 "20200101")
        end_date: 结束日期 (如 "20260222")
    """
    # 获取历史行情
    df = ak.fund_etf_hist_em(
        symbol=symbol,
        period="daily",
        start_date=start_date,
        end_date=end_date,
        adjust="qfq"  # 前复权
    )
    
    return df

# 示例：下载沪深 300ETF 数据
df = download_etf_history("510300", "20200101", "20260222")
print(df.head())
print(df.tail())
```

### 批量下载所有 ETF

```python
import akshare as ak
import pandas as pd
import time
from pathlib import Path

def batch_download_etfs(output_dir="data/etf"):
    """批量下载所有 ETF 历史数据"""
    
    # 创建输出目录
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # 获取 ETF 列表
    etf_list = ak.fund_etf_spot_em()
    
    # 筛选有数据的 ETF
    etf_codes = etf_list[etf_list['成交量'] > 0]['代码'].tolist()
    
    print(f"共找到 {len(etf_codes)} 只 ETF")
    
    # 批量下载
    for i, code in enumerate(etf_codes):
        try:
            df = ak.fund_etf_hist_em(
                symbol=code,
                period="daily",
                start_date="20200101",
                end_date="20260222",
                adjust="qfq"
            )
            
            # 保存
            output_path = f"{output_dir}/{code}.csv"
            df.to_csv(output_path, index=False)
            
            print(f"[{i+1}/{len(etf_codes)}] {code} 下载完成")
            
            # 避免请求过快
            time.sleep(0.5)
            
        except Exception as e:
            print(f"[{i+1}/{len(etf_codes)}] {code} 下载失败：{e}")
    
    print("批量下载完成")

# 执行
batch_download_etfs()
```

---

## 数据格式

### 标准 OHLCV 格式

```python
# AkShare 返回的 DataFrame 格式
# 日期，开盘，收盘，最高，最低，成交量，成交额，振幅，涨跌幅，涨跌额，换手率
# 2020-01-02, 3.850, 3.880, 3.890, 3.840, 1234567, 98765432, 1.29, 0.78, 0.03, 0.56

# 转换为 VeighNa 格式
def convert_to_veighna_format(df):
    """转换为 VeighNa 回测需要的格式"""
    df = df.rename(columns={
        '日期': 'datetime',
        '开盘': 'open',
        '收盘': 'close',
        '最高': 'high',
        '最低': 'low',
        '成交量': 'volume',
        '成交额': 'turnover'
    })
    
    df['datetime'] = pd.to_datetime(df['datetime'])
    df = df.set_index('datetime')
    
    return df[['open', 'high', 'low', 'close', 'volume', 'turnover']]
```

---

## 其他数据源

### 股票数据

```python
# A 股实时行情
stock_df = ak.stock_zh_a_spot_em()

# 个股历史行情
stock_hist = ak.stock_zh_a_hist(
    symbol="000001",
    period="daily",
    start_date="20200101",
    end_date="20260222",
    adjust="qfq"
)
```

### 指数数据

```python
# 上证指数
index_sh = ak.stock_zh_index_daily(symbol="sh000001")

# 深证成指
index_sz = ak.stock_zh_index_daily(symbol="sz399001")

# 创业板指
index_cy = ak.stock_zh_index_daily(symbol="sz399006")
```

### 基金数据

```python
# 场内基金
fund_df = ak.fund_etf_spot_em()

# 场外基金净值
fund_nav = ak.fund_open_fund_info_em(fund="000001", indicator="单位净值走势")
```

### 期货数据

```python
# 期货实时行情
futures_df = ak.futures_zh_spot()

# 期货历史数据
futures_hist = ak.futures_zh_daily_sina(symbol="IF2026")
```

---

## 数据缓存

### 本地缓存实现

```python
import hashlib
import pickle
from pathlib import Path

class DataCache:
    """数据缓存类"""
    
    def __init__(self, cache_dir="data/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_cache_key(self, func_name, **kwargs):
        """生成缓存 key"""
        key_str = f"{func_name}_{str(kwargs)}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, func_name, **kwargs):
        """获取缓存数据"""
        cache_key = self._get_cache_key(func_name, **kwargs)
        cache_file = self.cache_dir / f"{cache_key}.pkl"
        
        if cache_file.exists():
            with open(cache_file, 'rb') as f:
                return pickle.load(f)
        return None
    
    def set(self, data, func_name, **kwargs):
        """设置缓存数据"""
        cache_key = self._get_cache_key(func_name, **kwargs)
        cache_file = self.cache_dir / f"{cache_key}.pkl"
        
        with open(cache_file, 'wb') as f:
            pickle.dump(data, f)

# 使用示例
cache = DataCache()

def get_etf_data_cached(symbol):
    # 尝试从缓存获取
    cached = cache.get("fund_etf_hist_em", symbol=symbol)
    if cached is not None:
        print(f"从缓存加载 {symbol}")
        return cached
    
    # 从 API 获取
    df = ak.fund_etf_hist_em(symbol=symbol)
    
    # 保存到缓存
    cache.set(df, "fund_etf_hist_em", symbol=symbol)
    
    return df
```

---

## 实践建议

### 1. 数据质量检查

```python
def check_data_quality(df):
    """检查数据质量"""
    issues = []
    
    # 检查缺失值
    if df.isnull().any().any():
        issues.append("存在缺失值")
    
    # 检查异常值
    if (df['volume'] < 0).any():
        issues.append("存在负成交量")
    
    if (df['high'] < df['low']).any():
        issues.append("最高价低于最低价")
    
    # 检查连续性
    df['date_diff'] = df['datetime'].diff().dt.days
    if df['date_diff'].mode()[0] > 1:
        issues.append("数据不连续")
    
    return issues
```

### 2. 数据更新

```python
def update_etf_data(symbol, last_date):
    """增量更新 ETF 数据"""
    # 获取最新数据
    new_df = ak.fund_etf_hist_em(
        symbol=symbol,
        start_date=last_date.strftime("%Y%m%d"),
        end_date=pd.Timestamp.now().strftime("%Y%m%d")
    )
    
    # 加载已有数据
    existing_df = pd.read_csv(f"data/etf/{symbol}.csv")
    
    # 合并
    combined = pd.concat([existing_df, new_df]).drop_duplicates()
    
    # 保存
    combined.to_csv(f"data/etf/{symbol}.csv", index=False)
```

---

## 常见问题

### Q1: 数据获取失败

**原因**: 网络问题或 API 限制

**解决**:
```python
# 添加重试机制
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential())
def get_data_with_retry(symbol):
    return ak.fund_etf_hist_em(symbol=symbol)
```

### Q2: 数据不一致

**原因**: 不同接口数据源不同

**解决**: 统一使用一个数据源，或进行数据对齐

### Q3: 下载速度慢

**解决**:
```python
# 使用多线程
from concurrent.futures import ThreadPoolExecutor

def download_parallel(etf_codes):
    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(download_etf_history, etf_codes)
```

---

## 参考资料

- [AkShare 官方文档](https://akshare.akfamily.xyz/)
- [GitHub 仓库](https://github.com/akfamily/akshare)
- [AKQuant 框架](https://github.com/akfamily/akquant)
