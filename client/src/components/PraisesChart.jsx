import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ThumbsUp } from 'lucide-react';

const formatTopicName = (topic) => {
  if (!topic) return '';
  return topic
    .replace('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const PraisesChart = ({ praises = [] }) => {
  const data = praises.map((p) => ({
    name: formatTopicName(p.topic),
    count: p.count,
    topic: p.topic,
  }));

  const colors = ['#10B981', '#34D399', '#6EE7B7']; // Emerald shades

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <ThumbsUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Top 3 Praises</h3>
            <p className="text-xs text-gray-500">Most frequent topics in positive reviews</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
          Customer Loves
        </span>
      </div>

      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
            <p>No positive reviews recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload reviews to see what customers love.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
              <XAxis type="number" allowDecimals={false} stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={85}
                stroke="#4B5563"
                tick={{ fontSize: 12, fontWeight: 500 }}
              />
              <Tooltip
                cursor={{ fill: '#ECFDF5' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-900 text-white p-2.5 rounded-lg text-xs shadow-md">
                        <span className="font-semibold text-emerald-400">{payload[0].payload.name}: </span>
                        <span>{payload[0].value} mentions</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={26}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500 flex justify-between items-center border-t border-gray-100 pt-2.5">
        <span>Core selling points & customer highlights</span>
        <span className="font-semibold text-emerald-600">Strengths</span>
      </div>
    </div>
  );
};

export default PraisesChart;
