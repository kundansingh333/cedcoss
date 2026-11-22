import React from 'react';
import {
  Star,
  MessageSquareWarning,
  CheckCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const renderRatingStars = (rating) => {
  const num = Number(rating);
  if (isNaN(num) || num < 1 || num > 5) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
        Unknown
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5" title={`Rating: ${num}/5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= num
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-200 fill-gray-100'
          }`}
        />
      ))}
      <span className="text-xs font-semibold text-gray-700 ml-1">{num}</span>
    </div>
  );
};

const renderSentimentBadge = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Positive
        </span>
      );
    case 'negative':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          Negative
        </span>
      );
    case 'neutral':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
          Neutral
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Pending
        </span>
      );
  }
};

const formatTopicBadge = (topic) => {
  return (
    <span
      key={topic}
      className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider"
    >
      {topic.replace('_', ' ')}
    </span>
  );
};

const ReviewTable = ({
  reviews = [],
  loading = false,
  pagination = {},
  onPageChange,
  onGenerateReply, // Wireable for Phase 13
}) => {
  const { currentPage = 1, totalPages = 1, totalReviews = 0, limit = 10 } = pagination;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Table Title Bar */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Analyzed Customer Reviews</h2>
          <p className="text-xs text-gray-500">
            Full audit log of customer feedback, AI summaries, ratings, and triage statuses
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
          {totalReviews} Total
        </span>
      </div>

      {/* Responsive Table Scroll Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-20">Review ID</th>
              <th className="py-3 px-4 w-36">Product</th>
              <th className="py-3 px-4 w-28">Rating</th>
              <th className="py-3 px-4 min-w-[200px]">Customer Review</th>
              <th className="py-3 px-4 w-24">Sentiment</th>
              <th className="py-3 px-4 w-36">Topics</th>
              <th className="py-3 px-4 min-w-[180px]">AI Summary</th>
              <th className="py-3 px-4 w-28 text-center">Reply Status</th>
              <th className="py-3 px-4 w-28 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                  <td className="py-4 px-4"><div className="h-5 bg-gray-200 rounded-full w-14" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-36" /></td>
                  <td className="py-4 px-4"><div className="h-5 bg-gray-200 rounded-full w-20 mx-auto" /></td>
                  <td className="py-4 px-4"><div className="h-6 bg-gray-200 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-sm font-medium text-gray-600">No reviews found matching criteria</p>
                    <p className="text-xs text-gray-400">Try adjusting your filters or upload a reviews.csv file</p>
                  </div>
                </td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr
                  key={review._id || review.reviewId}
                  className={`hover:bg-blue-50/30 transition-colors ${
                    review.isRatingSentimentMismatch ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* Review ID */}
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                    {review.reviewId}
                    {review.isDuplicate && (
                      <span
                        className="block text-[10px] text-gray-400 font-sans font-normal"
                        title={`Duplicate of ${review.duplicateOf}`}
                      >
                        (dup of {review.duplicateOf})
                      </span>
                    )}
                  </td>

                  {/* Product */}
                  <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                    {review.product}
                  </td>

                  {/* Rating */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderRatingStars(review.rating)}
                    {review.isRatingSentimentMismatch && (
                      <span
                        className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded"
                        title="Rating does not align with sentiment classification"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" /> Mismatch
                      </span>
                    )}
                  </td>

                  {/* Original Review Text */}
                  <td className="py-3 px-4 text-gray-700 max-w-xs">
                    <p className="line-clamp-2" title={review.reviewText}>
                      {review.reviewText || <span className="italic text-gray-400">No text provided</span>}
                    </p>
                  </td>

                  {/* Sentiment */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderSentimentBadge(review.sentiment)}
                  </td>

                  {/* Topics */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {review.topics && review.topics.length > 0 ? (
                        review.topics.map((t) => formatTopicBadge(t))
                      ) : (
                        <span className="text-gray-400 text-[10px]">None</span>
                      )}
                    </div>
                  </td>

                  {/* AI Summary */}
                  <td className="py-3 px-4 text-gray-600">
                    <p className="line-clamp-2" title={review.summary}>
                      {review.summary || <span className="italic text-gray-400">Pending analysis</span>}
                    </p>
                  </td>

                  {/* Needs Reply */}
                  <td className="py-3 px-4 whitespace-nowrap text-center">
                    {review.needsReply ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <MessageSquareWarning className="w-3 h-3" />
                        Needs Reply
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                        <CheckCircle className="w-3 h-3 text-gray-400" />
                        No Action
                      </span>
                    )}
                  </td>

                  {/* Action / Suggested Reply button (Phase 13 ready) */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {review.needsReply ? (
                      review.suggestedReply ? (
                        <button
                          onClick={() => onGenerateReply && onGenerateReply(review)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[11px] font-semibold transition-colors"
                        >
                          View Reply
                        </button>
                      ) : (
                        <button
                          onClick={() => onGenerateReply && onGenerateReply(review)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          Reply
                        </button>
                      )
                    ) : (
                      <span className="text-gray-300 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <div>
          Showing page <span className="font-bold text-gray-900">{currentPage}</span> of{' '}
          <span className="font-bold text-gray-900">{totalPages}</span> (
          <span className="font-bold text-gray-900">{totalReviews}</span> total reviews)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewTable;
