import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans antialiased">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black text-xl">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-gray-900 tracking-tight">
                  ReviewLens
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  AI Insights
                </span>
              </div>
              <p className="text-xs text-gray-500 hidden sm:block">
                CEDCOSS Technical Assessment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gemini 3.8 Flash Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-16 text-xs text-gray-500 text-center">
        <p className="font-medium text-gray-700">ReviewLens – AI Review Insights Platform</p>
        <p className="mt-1 text-gray-400">
          Built with React 19, Tailwind CSS, Recharts, Express.js, MongoDB & Google Gemini AI
        </p>
      </footer>
    </div>
  );
}

export default App;
