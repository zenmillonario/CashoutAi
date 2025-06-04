import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Refresh } from 'lucide-react';

const Portfolio = ({ user }) => {
  const [portfolio, setPortfolio] = useState({
    totalValue: 45250.32,
    dailyChange: 1250.45,
    dailyChangePercent: 2.84,
    positions: [
      {
        id: 1,
        symbol: 'BTCUSDT',
        name: 'Bitcoin',
        amount: 0.5,
        value: 21750.50,
        change: 850.25,
        changePercent: 4.07
      },
      {
        id: 2,
        symbol: 'ETHUSDT',
        name: 'Ethereum',
        amount: 8.2,
        value: 13200.40,
        change: 320.15,
        changePercent: 2.49
      },
      {
        id: 3,
        symbol: 'ADAUSDT',
        name: 'Cardano',
        amount: 2500,
        value: 6450.20,
        change: -125.80,
        changePercent: -1.91
      },
      {
        id: 4,
        symbol: 'SOLUSDT',
        name: 'Solana',
        amount: 45,
        value: 3849.22,
        change: 205.85,
        changePercent: 5.65
      }
    ]
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    // Simulate real-time price updates
    const interval = setInterval(() => {
      updatePrices();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updatePrices = () => {
    setPortfolio(prev => {
      const updatedPositions = prev.positions.map(position => {
        const randomChange = (Math.random() - 0.5) * 0.1; // ±5% max change
        const newChangePercent = position.changePercent + randomChange;
        const newChange = (position.value * newChangePercent) / 100;
        
        return {
          ...position,
          change: newChange,
          changePercent: newChangePercent
        };
      });

      const newTotalValue = updatedPositions.reduce((sum, pos) => sum + pos.value + pos.change, 0);
      const newDailyChange = updatedPositions.reduce((sum, pos) => sum + pos.change, 0);
      const newDailyChangePercent = (newDailyChange / newTotalValue) * 100;

      return {
        ...prev,
        totalValue: newTotalValue,
        dailyChange: newDailyChange,
        dailyChangePercent: newDailyChangePercent,
        positions: updatedPositions
      };
    });

    setLastUpdated(new Date());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    updatePrices();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (percent) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-slate-400 text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="touch-button bg-slate-700 text-white p-3 rounded-xl"
        >
          <Refresh className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Total Portfolio Value */}
      <div className="portfolio-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
              <PieChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(portfolio.totalValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {portfolio.dailyChange >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500 mr-2" />
            )}
            <span className={`text-lg font-semibold ${
              portfolio.dailyChange >= 0 ? 'profit-positive' : 'profit-negative'
            }`}>
              {formatCurrency(Math.abs(portfolio.dailyChange))}
            </span>
          </div>
          <span className={`text-lg font-semibold ${
            portfolio.dailyChangePercent >= 0 ? 'profit-positive' : 'profit-negative'
          }`}>
            {formatPercentage(portfolio.dailyChangePercent)}
          </span>
        </div>
      </div>

      {/* Positions */}
      <div className="flex-1 overflow-y-auto space-y-4">
        <h2 className="text-lg font-semibold text-white mb-3">Your Positions</h2>
        
        {portfolio.positions.map((position) => (
          <div key={position.id} className="portfolio-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{position.name}</h3>
                  <p className="text-slate-400 text-sm">{position.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">
                  {formatCurrency(position.value)}
                </p>
                <p className="text-slate-400 text-sm">
                  {position.amount} {position.symbol.replace('USDT', '')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {position.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  position.change >= 0 ? 'profit-positive' : 'profit-negative'
                }`}>
                  {formatCurrency(Math.abs(position.change))}
                </span>
              </div>
              <span className={`text-sm font-medium ${
                position.changePercent >= 0 ? 'profit-positive' : 'profit-negative'
              }`}>
                {formatPercentage(position.changePercent)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    position.changePercent >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: `${Math.min(Math.abs(position.changePercent) * 10, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Best Performer</p>
          <p className="text-white font-semibold">
            {portfolio.positions.reduce((best, current) => 
              current.changePercent > best.changePercent ? current : best
            ).name}
          </p>
          <p className="text-green-500 text-sm">
            +{portfolio.positions.reduce((best, current) => 
              current.changePercent > best.changePercent ? current : best
            ).changePercent.toFixed(2)}%
          </p>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Total Positions</p>
          <p className="text-white font-semibold text-2xl">
            {portfolio.positions.length}
          </p>
          <p className="text-blue-500 text-sm">Active trades</p>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;