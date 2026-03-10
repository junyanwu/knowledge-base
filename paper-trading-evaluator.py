#!/usr/bin/env python3
"""
实盘模拟评估指标计算工具
用于计算模拟交易的关键绩效指标
"""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import statistics


class PaperTradingEvaluator:
    """实盘模拟评估器"""
    
    def __init__(self, initial_capital: float = 100000.0):
        """
        初始化评估器
        
        Args:
            initial_capital: 初始资金（默认10万）
        """
        self.initial_capital = initial_capital
        self.trades: List[Dict] = []
        self.daily_values: List[Dict] = []
        self.benchmark_values: List[Dict] = []
    
    def add_trade(self, trade: Dict):
        """
        添加交易记录
        
        Args:
            trade: 交易记录字典，包含：
                - timestamp: 时间戳
                - symbol: 代码
                - direction: buy/sell
                - price: 价格
                - quantity: 数量
                - commission: 手续费
                - pnl: 该笔交易盈亏（平仓时）
        """
        self.trades.append(trade)
    
    def add_daily_value(self, date: str, portfolio_value: float, benchmark_value: Optional[float] = None):
        """
        添加每日资产价值
        
        Args:
            date: 日期 YYYY-MM-DD
            portfolio_value: 组合价值
            benchmark_value: 基准价值（可选）
        """
        self.daily_values.append({
            'date': date,
            'portfolio_value': portfolio_value,
            'benchmark_value': benchmark_value
        })
    
    def calculate_returns(self) -> Dict:
        """计算收益类指标"""
        if not self.daily_values:
            return {}
        
        values = [v['portfolio_value'] for v in self.daily_values]
        initial = self.initial_capital
        final = values[-1]
        
        # 累计收益率
        cumulative_return = (final - initial) / initial
        
        # 年化收益率（假设数据按交易日）
        days = len(self.daily_values)
        annual_return = cumulative_return * (252 / days) if days > 0 else 0
        
        # 超额收益
        excess_return = 0
        if self.daily_values[0].get('benchmark_value'):
            benchmark_initial = self.daily_values[0]['benchmark_value']
            benchmark_final = self.daily_values[-1]['benchmark_value']
            benchmark_return = (benchmark_final - benchmark_initial) / benchmark_initial
            excess_return = cumulative_return - benchmark_return
        
        # 日收益率序列
        daily_returns = []
        for i in range(1, len(values)):
            daily_return = (values[i] - values[i-1]) / values[i-1]
            daily_returns.append(daily_return)
        
        # 年化波动率
        annual_volatility = statistics.stdev(daily_returns) * (252 ** 0.5) if len(daily_returns) > 1 else 0
        
        # 收益波动比
        return_vol_ratio = annual_return / annual_volatility if annual_volatility > 0 else 0
        
        return {
            'cumulative_return': cumulative_return,
            'annual_return': annual_return,
            'excess_return': excess_return,
            'annual_volatility': annual_volatility,
            'return_vol_ratio': return_vol_ratio,
            'daily_returns': daily_returns
        }
    
    def calculate_risk_metrics(self) -> Dict:
        """计算风险类指标"""
        if not self.daily_values or len(self.daily_values) < 2:
            return {}
        
        values = [v['portfolio_value'] for v in self.daily_values]
        
        # 最大回撤
        peak = values[0]
        max_drawdown = 0
        max_drawdown_duration = 0
        drawdown_start = 0
        current_drawdown_start = 0
        
        for i, value in enumerate(values):
            if value > peak:
                peak = value
                current_drawdown_start = i
            else:
                drawdown = (peak - value) / peak
                if drawdown > max_drawdown:
                    max_drawdown = drawdown
                    drawdown_start = current_drawdown_start
                    max_drawdown_duration = i - current_drawdown_start
        
        # 下行波动率（只计算负收益）
        daily_returns = []
        values_list = values
        for i in range(1, len(values_list)):
            ret = (values_list[i] - values_list[i-1]) / values_list[i-1]
            daily_returns.append(ret)
        
        negative_returns = [r for r in daily_returns if r < 0]
        downside_volatility = statistics.stdev(negative_returns) * (252 ** 0.5) if len(negative_returns) > 1 else 0
        
        # VaR (95%)
        var_95 = abs(statistics.quantiles(daily_returns, n=20)[0]) if len(daily_returns) >= 20 else 0
        
        # 单日最大亏损
        max_daily_loss = min(daily_returns) if daily_returns else 0
        
        return {
            'max_drawdown': max_drawdown,
            'max_drawdown_duration': max_drawdown_duration,
            'downside_volatility': downside_volatility,
            'var_95': var_95,
            'max_daily_loss': max_daily_loss
        }
    
    def calculate_strategy_metrics(self) -> Dict:
        """计算策略质量指标"""
        if not self.trades:
            return {}
        
        # 统计盈亏交易
        pnl_trades = [t for t in self.trades if t.get('pnl') is not None]
        
        if not pnl_trades:
            return {}
        
        profit_trades = [t for t in pnl_trades if t['pnl'] > 0]
        loss_trades = [t for t in pnl_trades if t['pnl'] < 0]
        
        # 胜率
        win_rate = len(profit_trades) / len(pnl_trades) if pnl_trades else 0
        
        # 盈亏比
        avg_profit = statistics.mean([t['pnl'] for t in profit_trades]) if profit_trades else 0
        avg_loss = abs(statistics.mean([t['pnl'] for t in loss_trades])) if loss_trades else 0
        profit_loss_ratio = avg_profit / avg_loss if avg_loss > 0 else 0
        
        # 计算夏普比率（需要日收益率）
        returns_data = self.calculate_returns()
        daily_returns = returns_data.get('daily_returns', [])
        
        if len(daily_returns) > 1:
            avg_daily_return = statistics.mean(daily_returns)
            std_daily_return = statistics.stdev(daily_returns)
            
            # 夏普比率（假设无风险利率为3%年化）
            risk_free_rate = 0.03 / 252
            sharpe_ratio = (avg_daily_return - risk_free_rate) / std_daily_return * (252 ** 0.5) if std_daily_return > 0 else 0
            
            # Sortino比率（只考虑下行波动）
            negative_returns = [r for r in daily_returns if r < 0]
            downside_std = statistics.stdev(negative_returns) if len(negative_returns) > 1 else 0
            sortino_ratio = (avg_daily_return - risk_free_rate) / downside_std * (252 ** 0.5) if downside_std > 0 else 0
        else:
            sharpe_ratio = 0
            sortino_ratio = 0
        
        # Calmar比率
        risk_metrics = self.calculate_risk_metrics()
        max_dd = risk_metrics.get('max_drawdown', 1)
        returns_data = self.calculate_returns()
        calmar_ratio = returns_data.get('annual_return', 0) / max_dd if max_dd > 0 else 0
        
        return {
            'total_trades': len(pnl_trades),
            'win_rate': win_rate,
            'profit_loss_ratio': profit_loss_ratio,
            'avg_profit': avg_profit,
            'avg_loss': avg_loss,
            'sharpe_ratio': sharpe_ratio,
            'sortino_ratio': sortino_ratio,
            'calmar_ratio': calmar_ratio
        }
    
    def calculate_execution_metrics(self) -> Dict:
        """计算执行效率指标"""
        if not self.trades:
            return {}
        
        # 信号执行率（需要外部记录信号总数）
        # 这里简化处理，假设所有交易都是信号执行
        
        # 平均成交时间（需要记录委托时间和成交时间）
        execution_times = [t.get('execution_time', 0) for t in self.trades if t.get('execution_time')]
        avg_execution_time = statistics.mean(execution_times) if execution_times else 0
        
        # 执行偏差（实际价格 - 信号价格）
        deviations = [t.get('deviation', 0) for t in self.trades if t.get('deviation') is not None]
        avg_deviation = statistics.mean(deviations) if deviations else 0
        
        # 成交率
        total_orders = len(self.trades)
        filled_orders = len([t for t in self.trades if t.get('status') == 'filled'])
        fill_rate = filled_orders / total_orders if total_orders > 0 else 0
        
        return {
            'avg_execution_time': avg_execution_time,
            'avg_deviation': avg_deviation,
            'fill_rate': fill_rate,
            'total_orders': total_orders
        }
    
    def generate_score_report(self) -> Dict:
        """生成综合评分报告"""
        returns = self.calculate_returns()
        risk = self.calculate_risk_metrics()
        strategy = self.calculate_strategy_metrics()
        execution = self.calculate_execution_metrics()
        
        # 计算各维度得分
        revenue_score = self._calculate_revenue_score(returns)
        risk_score = self._calculate_risk_score(risk)
        strategy_score = self._calculate_strategy_score(strategy)
        execution_score = self._calculate_execution_score(execution)
        
        total_score = revenue_score + risk_score + strategy_score + execution_score
        
        # 评级
        if total_score >= 85:
            rating = '优秀'
            recommendation = '可直接转实盘'
        elif total_score >= 70:
            rating = '良好'
            recommendation = '建议小资金试运行'
        elif total_score >= 60:
            rating = '一般'
            recommendation = '继续优化策略'
        else:
            rating = '较差'
            recommendation = '暂停转实盘，深入分析问题'
        
        return {
            'scores': {
                'revenue_score': revenue_score,
                'risk_score': risk_score,
                'strategy_score': strategy_score,
                'execution_score': execution_score,
                'total_score': total_score
            },
            'rating': rating,
            'recommendation': recommendation,
            'metrics': {
                'returns': returns,
                'risk': risk,
                'strategy': strategy,
                'execution': execution
            }
        }
    
    def _calculate_revenue_score(self, returns: Dict) -> float:
        """计算收益得分（满分30分）"""
        score = 0
        
        # 累计收益率（10分）
        cumulative = returns.get('cumulative_return', 0)
        if cumulative >= 0.10:
            score += 10
        elif cumulative >= 0.05:
            score += 8
        elif cumulative >= 0:
            score += 5
        
        # 年化收益率（10分）
        annual = returns.get('annual_return', 0)
        if annual >= 0.20:
            score += 10
        elif annual >= 0.15:
            score += 8
        elif annual >= 0.10:
            score += 6
        elif annual >= 0:
            score += 3
        
        # 超额收益（10分）
        excess = returns.get('excess_return', 0)
        if excess >= 0.05:
            score += 10
        elif excess >= 0.03:
            score += 8
        elif excess >= 0:
            score += 5
        
        return score
    
    def _calculate_risk_score(self, risk: Dict) -> float:
        """计算风险得分（满分25分）"""
        score = 0
        
        # 最大回撤（15分）
        max_dd = risk.get('max_drawdown', 1)
        if max_dd < 0.05:
            score += 15
        elif max_dd < 0.10:
            score += 12
        elif max_dd < 0.15:
            score += 8
        elif max_dd < 0.20:
            score += 4
        
        # 下行波动率（5分）
        downside_vol = risk.get('downside_volatility', 1)
        if downside_vol < 0.10:
            score += 5
        elif downside_vol < 0.15:
            score += 3
        elif downside_vol < 0.20:
            score += 1
        
        # VaR（5分）
        var = risk.get('var_95', 1)
        if var < 0.02:
            score += 5
        elif var < 0.03:
            score += 3
        elif var < 0.05:
            score += 1
        
        return score
    
    def _calculate_strategy_score(self, strategy: Dict) -> float:
        """计算策略质量得分（满分25分）"""
        score = 0
        
        # 胜率（10分）
        win_rate = strategy.get('win_rate', 0)
        if win_rate >= 0.65:
            score += 10
        elif win_rate >= 0.55:
            score += 8
        elif win_rate >= 0.50:
            score += 5
        elif win_rate >= 0.40:
            score += 2
        
        # 盈亏比（10分）
        pl_ratio = strategy.get('profit_loss_ratio', 0)
        if pl_ratio >= 2.0:
            score += 10
        elif pl_ratio >= 1.5:
            score += 8
        elif pl_ratio >= 1.2:
            score += 5
        elif pl_ratio >= 1.0:
            score += 2
        
        # 夏普比率（5分）
        sharpe = strategy.get('sharpe_ratio', 0)
        if sharpe >= 2.0:
            score += 5
        elif sharpe >= 1.5:
            score += 4
        elif sharpe >= 1.0:
            score += 3
        elif sharpe >= 0.5:
            score += 1
        
        return score
    
    def _calculate_execution_score(self, execution: Dict) -> float:
        """计算执行效率得分（满分20分）"""
        score = 0
        
        # 执行偏差（10分）
        deviation = execution.get('avg_deviation', 1)
        if deviation < 0.002:
            score += 10
        elif deviation < 0.005:
            score += 8
        elif deviation < 0.01:
            score += 5
        elif deviation < 0.02:
            score += 2
        
        # 成交率（10分）
        fill_rate = execution.get('fill_rate', 0)
        if fill_rate >= 0.99:
            score += 10
        elif fill_rate >= 0.95:
            score += 8
        elif fill_rate >= 0.90:
            score += 5
        elif fill_rate >= 0.80:
            score += 2
        
        return score
    
    def export_report(self, filename: str):
        """导出评估报告"""
        report = self.generate_score_report()
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        return report


def demo_usage():
    """演示用法"""
    # 创建评估器
    evaluator = PaperTradingEvaluator(initial_capital=100000)
    
    # 模拟30天数据
    import random
    current_value = 100000
    for day in range(30):
        date = (datetime.now() - timedelta(days=30-day)).strftime('%Y-%m-%d')
        
        # 随机生成每日收益（模拟）
        daily_return = random.gauss(0.001, 0.015)  # 均值0.1%，标准差1.5%
        current_value *= (1 + daily_return)
        
        evaluator.add_daily_value(date, current_value, 100000 * (1 + day * 0.001))
    
    # 生成报告
    report = evaluator.generate_score_report()
    
    print("=" * 60)
    print("实盘模拟评估报告")
    print("=" * 60)
    print(f"\n【综合评分】")
    print(f"收益得分：{report['scores']['revenue_score']:.1f}/30")
    print(f"风险得分：{report['scores']['risk_score']:.1f}/25")
    print(f"策略得分：{report['scores']['strategy_score']:.1f}/25")
    print(f"执行得分：{report['scores']['execution_score']:.1f}/20")
    print(f"\n总分：{report['scores']['total_score']:.1f}/100")
    print(f"评级：{report['rating']}")
    print(f"建议：{report['recommendation']}")
    
    print(f"\n【关键指标】")
    metrics = report['metrics']
    print(f"累计收益率：{metrics['returns']['cumulative_return']*100:.2f}%")
    print(f"年化收益率：{metrics['returns']['annual_return']*100:.2f}%")
    print(f"最大回撤：{metrics['risk']['max_drawdown']*100:.2f}%")
    print(f"夏普比率：{metrics['strategy']['sharpe_ratio']:.2f}")
    
    return report


if __name__ == '__main__':
    demo_usage()
