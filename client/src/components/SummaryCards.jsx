import React from 'react';
import {
  FileText,
  Smile,
  Meh,
  Frown,
  MessageSquareWarning,
  CheckCircle2,
  Database,
} from 'lucide-react';

const SummaryCards = ({ summary = {}, cacheStats = {} }) => {
  const {
    totalReviews = 0,
    positivePercentage = 0,
    neutralPercentage = 0,
    negativePercentage = 0,
    needsReplyCount = 0,
    needsReplyPercentage = 0,
    ratingAgreementPercentage = 100,
    mismatchCount = 0,
  } = summary;

  const cards = [
    {
      title: 'Total Reviews',
      value: totalReviews.toLocaleString(),
      subtitle: 'Analysed & Processed',
      icon: FileText,
      color: 'blue',
      badge: `${totalReviews} total`,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      title: 'Positive Sentiment',
      value: `${positivePercentage}%`,
      subtitle: 'Satisfied customers',
      icon: Smile,
      color: 'emerald',
      badge: 'Positive',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      progressBar: positivePercentage,
      progressColor: 'bg-emerald-500',
    },
    {
      title: 'Neutral Sentiment',
      value: `${neutralPercentage}%`,
      subtitle: 'Balanced or routine feedback',
      icon: Meh,
      color: 'gray',
      badge: 'Neutral',
      badgeColor: 'bg-gray-100 text-gray-800',
      progressBar: neutralPercentage,
      progressColor: 'bg-gray-400',
    },
    {
      title: 'Negative Sentiment',
      value: `${negativePercentage}%`,
      subtitle: 'Issues or dissatisfaction',
      icon: Frown,
      color: 'rose',
      badge: 'Negative',
      badgeColor: 'bg-rose-100 text-rose-800',
      progressBar: negativePercentage,
      progressColor: 'bg-rose-500',
    },
    {
      title: 'Requires Reply',
      value: needsReplyCount.toLocaleString(),
      subtitle: `${needsReplyPercentage}% of all reviews`,
      icon: MessageSquareWarning,
      color: 'amber',
      badge: 'Action Needed',
      badgeColor: 'bg-amber-100 text-amber-800 font-semibold',
    },
    {
      title: 'Rating Agreement',
      value: `${ratingAgreementPercentage}%`,
      subtitle: `${mismatchCount} review-rating mismatch${mismatchCount === 1 ? '' : 'es'}`,
      icon: CheckCircle2,
      color: 'indigo',
      badge: 'Bonus Metric',
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'emerald':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
      case 'rose':
        return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' };
      case 'amber':
        return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
      case 'indigo':
        return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' };
      case 'gray':
        return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
      default:
        return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const styles = getColorClasses(card.color);

          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-lg ${styles.bg}`}>
                    <Icon className={`w-5 h-5 ${styles.text}`} />
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{card.value}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              </div>

              {card.progressBar !== undefined && (
                <div className="mt-4 pt-2 border-t border-gray-100">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${card.progressColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, card.progressBar))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cacheStats && cacheStats.totalCachedUniqueReviews > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-gray-300">Cache Telemetry Engine:</span>
            <span className="text-white">
              {cacheStats.totalCachedUniqueReviews} unique review fingerprints cached via SHA-256
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
              ⚡ {cacheStats.totalCacheHits} cache hits recorded
            </span>
            <span className="text-gray-400">Saving external AI API latency and quota</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryCards;
