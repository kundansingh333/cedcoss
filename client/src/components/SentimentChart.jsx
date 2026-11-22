import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const SentimentChart = ({ distribution = [] }) => {
  const chartData = distribution.map((item) => ({
    name: item.name,
    value: item.count,
    percentage: item.percentage,
    color: item.color,
  }));

  const totalReviews = chartData.reduce((acc, curr) => acc + curr.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name} Sentiment
          </p>
          <p className="text-gray-300">
            Reviews: <span className="font-bold text-white">{data.value}</span>
          </p>
          <p className="text-gray-300">
            Share: <span className="font-bold text-white">{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = () => {
    return (
      <div className="flex justify-center gap-6 mt-2">
        {chartData.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 font-medium">{entry.name}:</span>
            <span className="text-gray-900 font-bold">{entry.percentage}%</span>
            <span className="text-gray-400">({entry.value})</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">Sentiment Distribution</h3>
          <p className="text-xs text-gray-500">Breakdown of positive, neutral, and negative reviews</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
          {totalReviews} reviews
        </span>
      </div>

      <div className="h-64 w-full relative">
        {totalReviews === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
            <p>No sentiment data available</p>
            <p className="text-xs text-gray-400 mt-1">Upload a CSV to view distribution</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {totalReviews > 0 && renderLegend()}
    </div>
  );
};

export default SentimentChart;
