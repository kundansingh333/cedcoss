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
import { AlertTriangle } from 'lucide-react';

const formatTopicName = (topic) => {
  if (!topic) return '';
  return topic
    .replace('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const ComplaintsChart = ({ complaints = [] }) => {
  const data = complaints.map((c) => ({
    name: formatTopicName(c.topic),
    count: c.count,
    topic: c.topic,
  }));

  const colors = ['#EF4444', '#F87171', '#FCA5A5']; // Dark red to soft red

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Top 3 Complaints</h3>
            <p className="text-xs text-gray-500">Most frequent topics in negative reviews</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-rose-100 text-rose-800 rounded">
          Negative Issues
        </span>
      </div>

      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
            <p>No negative complaints reported</p>
            <p className="text-xs text-gray-400 mt-1">Great job! Customers are satisfied.</p>
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
                cursor={{ fill: '#FEF2F2' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-900 text-white p-2.5 rounded-lg text-xs shadow-md">
                        <span className="font-semibold text-rose-400">{payload[0].payload.name}: </span>
                        <span>{payload[0].value} complaints</span>
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
        <span>Target priority for product improvements</span>
        <span className="font-semibold text-rose-600">Action Required</span>
      </div>
    </div>
  );
};

export default ComplaintsChart;
