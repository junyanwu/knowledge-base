#!/usr/bin/env python3
"""
中国宏观经济数据获取脚本
获取GDP、CPI、PMI、社融等关键经济指标
"""

import os
import sys
from datetime import datetime, timedelta
import json

try:
    import tushare as ts
    import pandas as pd
    TUSHARE_AVAILABLE = True
except ImportError:
    TUSHARE_AVAILABLE = False
    print("警告: tushare未安装，将尝试使用其他数据源")

def check_tushare_token():
    """检查Tushare Token是否配置"""
    token = os.getenv('TUSHARE_TOKEN')
    if not token:
        print("警告: 未配置TUSHARE_TOKEN环境变量")
        print("请运行: export TUSHARE_TOKEN='your_token'")
        print("或访问 https://tushare.pro 注册获取Token")
    return token

def fetch_data_from_tushare():
    """从Tushare获取宏观经济数据"""
    if not TUSHARE_AVAILABLE:
        return None
    
    token = check_tushare_token()
    if not token:
        return None
    
    try:
        pro = ts.pro_api(token)
        data = {}
        
        # 获取最近1年的数据
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        # GDP数据（季度）
        print("正在获取GDP数据...")
        try:
            start_q = f"{start_date.year}Q1"
            end_q = f"{end_date.year}Q4"
            gdp_df = pro.cn_gdp(start_q=start_q, end_q=end_q)
            if gdp_df is not None and not gdp_df.empty:
                data['gdp'] = gdp_df.to_dict('records')
                print(f"✓ GDP数据获取成功: {len(gdp_df)}条记录")
        except Exception as e:
            print(f"✗ GDP数据获取失败: {e}")
        
        # PMI数据（月度）
        print("正在获取PMI数据...")
        try:
            start_m = start_date.strftime('%Y%m')
            end_m = end_date.strftime('%Y%m')
            pmi_df = pro.cn_pmi(start_m=start_m, end_m=end_m)
            if pmi_df is not None and not pmi_df.empty:
                data['pmi'] = pmi_df.to_dict('records')
                print(f"✓ PMI数据获取成功: {len(pmi_df)}条记录")
        except Exception as e:
            print(f"✗ PMI数据获取失败: {e}")
        
        # 社融数据（月度）
        print("正在获取社融数据...")
        try:
            sf_df = pro.sf_month(start_m=start_m, end_m=end_m)
            if sf_df is not None and not sf_df.empty:
                data['social_financing'] = sf_df.to_dict('records')
                print(f"✓ 社融数据获取成功: {len(sf_df)}条记录")
        except Exception as e:
            print(f"✗ 社融数据获取失败: {e}")
        
        # 货币供应量（月度）
        print("正在获取货币供应量数据...")
        try:
            m_df = pro.cn_m(start_m=start_m, end_m=end_m)
            if m_df is not None and not m_df.empty:
                data['money_supply'] = m_df.to_dict('records')
                print(f"✓ 货币供应量数据获取成功: {len(m_df)}条记录")
        except Exception as e:
            print(f"✗ 货币供应量数据获取失败: {e}")
        
        # LPR利率（月度）
        print("正在获取LPR利率数据...")
        try:
            lpr_df = pro.shibor_lpr(start_m=start_m, end_m=end_m)
            if lpr_df is not None and not lpr_df.empty:
                data['lpr'] = lpr_df.to_dict('records')
                print(f"✓ LPR利率数据获取成功: {len(lpr_df)}条记录")
        except Exception as e:
            print(f"✗ LPR利率数据获取失败: {e}")
        
        if data:
            return data
        else:
            return None
            
    except Exception as e:
        print(f"Tushare数据获取失败: {e}")
        return None

def main():
    """主函数"""
    print("=" * 60)
    print("中国宏观经济数据获取")
    print("=" * 60)
    
    # 尝试从Tushare获取数据
    data = fetch_data_from_tushare()
    
    if data:
        # 保存数据
        output_file = "macro_data.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n数据已保存到: {output_file}")
        return data
    else:
        print("\n无法从Tushare获取数据")
        print("建议:")
        print("1. 配置TUSHARE_TOKEN环境变量")
        print("2. 确保Tushare积分足够（至少600积分）")
        print("3. 或使用其他数据源")
        return None

if __name__ == "__main__":
    main()
