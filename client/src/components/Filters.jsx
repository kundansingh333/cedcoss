import React from 'react';
import { Search, X, Filter, RotateCcw } from 'lucide-react';

const formatTopicName = (topic) => {
  if (!topic) return '';
  return topic.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const Filters = ({
  filters,
  onFilterChange,
  onResetFilters,
  products = [],
  sentiments = ['positive', 'neutral', 'negative'],
  topics = ['quality', 'delivery', 'price', 'packaging', 'support', 'size_fit', 'other'],
  totalResults = 0,
}) => {
  const isFiltered =
    filters.search ||
    filters.product !== 'all' ||
    filters.sentiment !== 'all' ||
    filters.topic !== 'all' ||
    filters.needsReply !== 'all' ||
    filters.mismatch !== 'all';

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Search reviews by keyword, product name, ID, or AI summary..."
            className="w-full pl-10 pr-9 py-2 bg-gray-50/70 border border-gray-300 rounded-lg text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action / Result Info */}
        <div className="flex items-center justify-between lg:justify-end gap-3 text-xs">
          <span className="text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">{totalResults}</span> reviews
          </span>
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Dropdown Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-gray-100 text-xs">
        {/* Product Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Product</label>
          <select
            value={filters.product || 'all'}
            onChange={(e) => onFilterChange('product', e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Sentiment Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Sentiment</label>
          <select
            value={filters.sentiment || 'all'}
            onChange={(e) => onFilterChange('sentiment', e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>

        {/* Topic Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Topic</label>
          <select
            value={filters.topic || 'all'}
            onChange={(e) => onFilterChange('topic', e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {formatTopicName(t)}
              </option>
            ))}
          </select>
        </div>

        {/* Needs Reply Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Needs Reply</label>
          <select
            value={filters.needsReply || 'all'}
            onChange={(e) => onFilterChange('needsReply', e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="true">Needs Reply (Action Required)</option>
            <option value="false">No Reply Needed</option>
          </select>
        </div>

        {/* Rating Mismatch Filter (Bonus #1) */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Rating Mismatch</label>
          <select
            value={filters.mismatch || 'all'}
            onChange={(e) => onFilterChange('mismatch', e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Reviews</option>
            <option value="true">⚠️ Mismatches Only</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Filters;
