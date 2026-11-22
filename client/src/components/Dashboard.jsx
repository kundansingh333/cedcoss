import React, { useState, useEffect, useCallback } from 'react';
import { fetchAnalytics, fetchReviews } from '../services/api';
import SummaryCards from './SummaryCards';
import SentimentChart from './SentimentChart';
import ComplaintsChart from './ComplaintsChart';
import PraisesChart from './PraisesChart';
import FileUpload from './FileUpload';
import Filters from './Filters';
import ReviewTable from './ReviewTable';
import { Sparkles, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Reviews & Filtering State
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalReviews: 0,
    limit: 10,
  });

  const [filters, setFilters] = useState({
    search: '',
    product: 'all',
    sentiment: 'all',
    topic: 'all',
    needsReply: 'all',
    mismatch: 'all',
    page: 1,
  });

  // 1. Fetch High-Level Analytics
  const loadAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoadingAnalytics(true);
    setError(null);

    try {
      const response = await fetchAnalytics({
        product: filters.product !== 'all' ? filters.product : undefined,
      });

      if (response && response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoadingAnalytics(false);
      setRefreshing(false);
    }
  };

  // 2. Fetch Filtered Reviews Table
  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const params = {
        page: filters.page,
        limit: 10,
        search: filters.search.trim() || undefined,
        product: filters.product !== 'all' ? filters.product : undefined,
        sentiment: filters.sentiment !== 'all' ? filters.sentiment : undefined,
        topic: filters.topic !== 'all' ? filters.topic : undefined,
        needsReply: filters.needsReply !== 'all' ? filters.needsReply : undefined,
        mismatch: filters.mismatch !== 'all' ? filters.mismatch : undefined,
      };

      const response = await fetchReviews(params);
      if (response && response.success) {
        setReviews(response.reviews);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  }, [filters]);

  // Load analytics when product filter changes
  useEffect(() => {
    loadAnalytics();
  }, [filters.product]);

  // Load reviews when any filter or page changes
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Handle filter changes with page reset
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      product: 'all',
      sentiment: 'all',
      topic: 'all',
      needsReply: 'all',
      mismatch: 'all',
      page: 1,
    });
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleUploadSuccess = () => {
    loadAnalytics(true);
    loadReviews();
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
          <button
            onClick={() => {
              loadAnalytics(true);
              loadReviews();
            }}
            disabled={refreshing || loadingAnalytics}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh All'}</span>
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
            onClick={() => loadAnalytics()}
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

      {/* Filters Bar */}
      <Filters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        products={analytics?.filterOptions?.products || []}
        sentiments={analytics?.filterOptions?.sentiments || []}
        topics={analytics?.filterOptions?.topics || []}
        totalResults={pagination.totalReviews}
      />

      {/* Filterable Review Table */}
      <ReviewTable
        reviews={reviews}
        loading={loadingReviews}
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Dashboard;
