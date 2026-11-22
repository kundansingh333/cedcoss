import React, { useState, useEffect } from 'react';
import { fetchAnalytics } from '../services/api';
import SummaryCards from './SummaryCards';
import SentimentChart from './SentimentChart';
import ComplaintsChart from './ComplaintsChart';
import PraisesChart from './PraisesChart';
import FileUpload from './FileUpload';
import { Sparkles, RefreshCw, Layers } from 'lucide-react';

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [error, setError] = useState(null);

  const loadDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetchAnalytics({
        product: selectedProduct !== 'all' ? selectedProduct : undefined,
      });

      if (response && response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedProduct]);

  const handleUploadSuccess = () => {
    loadDashboardData(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-100 text-blue-700">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              AI Review Insights Dashboard
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time customer feedback analytics powered by Google Gemini & Mongoose
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Product Filter for Dashboard */}
          {analytics?.filterOptions?.products && analytics.filterOptions.products.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 hidden md:inline">Product:</span>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Products ({analytics.summary.totalReviews})</option>
                {analytics.filterOptions.products.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* CSV File Upload Section */}
      <FileUpload onUploadSuccess={handleUploadSuccess} />

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => loadDashboardData()}
            className="underline font-semibold hover:text-rose-950"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards
        summary={analytics?.summary || {}}
        cacheStats={analytics?.cacheTelemetry || {}}
      />

      {/* Visualizations Grid (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Sentiment Distribution Donut Chart */}
        <div className="h-full">
          <SentimentChart distribution={analytics?.sentimentDistribution || []} />
        </div>

        {/* 2. Top 3 Customer Complaints Bar Chart */}
        <div className="h-full">
          <ComplaintsChart complaints={analytics?.topComplaints || []} />
        </div>

        {/* 3. Top 3 Customer Praises Bar Chart */}
        <div className="h-full">
          <PraisesChart praises={analytics?.topPraises || []} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
