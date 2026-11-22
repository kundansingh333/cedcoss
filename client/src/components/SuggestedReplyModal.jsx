import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  Star,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { generateSuggestedReply } from '../services/api';

const SuggestedReplyModal = ({ isOpen, onClose, review, onReplyUpdated }) => {
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [replyGeneratedAt, setReplyGeneratedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!isOpen || !review) return;

    setCopied(false);
    setError(null);

    // If review already has a generated reply, display it immediately
    if (review.suggestedReply) {
      setReplyText(review.suggestedReply);
      setReplyGeneratedAt(review.replyGeneratedAt || new Date());
      setFromCache(true);
      setLoading(false);
    } else {
      // Trigger generation on open
      handleGenerate(false);
    }
  }, [isOpen, review]);

  const handleGenerate = async (force = false) => {
    if (!review) return;
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const targetId = review.reviewId || review._id;
      const res = await generateSuggestedReply(targetId, force);

      if (res && res.success && res.data) {
        setReplyText(res.data.suggestedReply);
        setReplyGeneratedAt(res.data.replyGeneratedAt);
        setFromCache(res.data.fromCache);

        // Notify parent to update review in table state
        if (onReplyUpdated) {
          onReplyUpdated(targetId, res.data.suggestedReply, res.data.replyGeneratedAt);
        }
      } else {
        throw new Error(res?.message || 'Failed to generate response.');
      }
    } catch (err) {
      console.error('Error generating reply:', err);
      setError(err.message || 'Failed to generate customer support reply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!replyText) return;
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (!isOpen || !review) return null;

  const numRating = Number(review.rating);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">AI Suggested Reply</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-blue-50 border border-white/20">
                  On-Demand
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Review {review.reviewId} • {review.product}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Review Details Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700">Rating:</span>
                {!isNaN(numRating) && numRating >= 1 && numRating <= 5 ? (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= numRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'
                        }`}
                      />
                    ))}
                    <span className="font-bold text-gray-800 ml-1">({numRating}/5)</span>
                  </div>
                ) : (
                  <span className="font-mono text-gray-500">Unknown</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700">Sentiment:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    review.sentiment === 'positive'
                      ? 'bg-emerald-100 text-emerald-800'
                      : review.sentiment === 'negative'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {review.sentiment || 'Pending'}
                </span>
              </div>

              {review.topics && review.topics.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700">Topics:</span>
                  <div className="flex gap-1">
                    {review.topics.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 bg-blue-100/70 text-blue-800 rounded font-semibold text-[10px]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Customer Review Text */}
            <div>
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                Customer Feedback:
              </span>
              <p className="text-gray-800 italic bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                "{review.reviewText || 'No text provided.'}"
              </p>
            </div>

            {/* AI Summary */}
            {review.summary && (
              <div className="flex items-start gap-1.5 text-gray-600 pt-1">
                <span className="font-semibold text-gray-700 whitespace-nowrap">AI Summary:</span>
                <span>{review.summary}</span>
              </div>
            )}
          </div>

          {/* AI Response Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Empathetic Customer Support Response</span>
              </label>

              {replyGeneratedAt && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {fromCache ? 'Cached' : 'Generated'}:{' '}
                  {new Date(replyGeneratedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {loading ? (
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-8 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
                <p className="text-xs font-semibold text-indigo-900">
                  Synthesizing empathetic reply with Gemini 3.8 Flash...
                </p>
                <p className="text-[11px] text-indigo-500 text-center max-w-sm">
                  Tailoring resolution, tone, and action items to address the customer's specific review.
                </p>
              </div>
            ) : error ? (
              <div className="border border-rose-200 bg-rose-50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-rose-900">Generation Failed</p>
                  <p className="text-rose-700">{error}</p>
                  <button
                    onClick={() => handleGenerate(true)}
                    className="inline-flex items-center gap-1 font-bold text-rose-800 underline mt-2 hover:text-rose-950"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry Generation
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  className="w-full text-xs text-gray-800 p-3.5 bg-white border border-gray-300 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed font-sans resize-none"
                  placeholder="Suggested reply will appear here..."
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-1 text-[10px] text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Prompt-Injection Protected</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            title="Generate a fresh variation with Gemini"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Regenerate</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-lg transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleCopy}
              disabled={loading || !replyText}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all ${
                copied
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } disabled:opacity-50`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Reply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestedReplyModal;
