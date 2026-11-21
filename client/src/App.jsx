/**
 * App.jsx - Root component of ReviewLens
 *
 * Currently shows a landing page to verify React + Tailwind work.
 * React Router and dashboard components will be added in later phases.
 */

import { useState, useEffect } from 'react';

function App() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if the backend is running by calling /api/health
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        setHealthStatus({ status: 'error', message: err.message });
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ReviewLens</h1>
              <p className="text-sm text-gray-500">AI Review Insights</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Welcome to ReviewLens
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Upload customer reviews, get AI-powered sentiment analysis,
            topic extraction, and actionable insights — all in one dashboard.
          </p>
        </div>

        {/* Backend Health Check Card */}
        <div className="mt-10 max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🔗 Backend Connection
            </h3>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span>Checking backend...</span>
              </div>
            ) : healthStatus?.status === 'ok' ? (
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-2xl">✅</span>
                <span className="font-medium">API server is running</span>
              </div>
            ) : (
              <div className="text-red-600">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">❌</span>
                  <span className="font-medium">Backend not reachable</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Start the backend: <code className="bg-gray-100 px-2 py-0.5 rounded">cd server && npm run dev</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feature Cards - Preview of what's coming */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="font-semibold text-gray-800">CSV Upload</h3>
            <p className="text-sm text-gray-500 mt-1">
              Upload reviews and get them cleaned and deduplicated automatically.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold text-gray-800">AI Analysis</h3>
            <p className="text-sm text-gray-500 mt-1">
              Sentiment, topics, and summaries powered by Google Gemini.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-800">Dashboard</h3>
            <p className="text-sm text-gray-500 mt-1">
              Charts, filters, and actionable insights at a glance.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
