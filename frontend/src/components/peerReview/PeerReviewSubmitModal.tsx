import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { PeerReview } from '../../api/peerReviews';

interface PeerReviewSubmitModalProps {
  open: boolean;
  review: PeerReview | null;
  onClose: () => void;
  onSubmit: (reviewId: number, score: number, feedback?: string) => Promise<void>;
}

export const PeerReviewSubmitModal: React.FC<PeerReviewSubmitModalProps> = ({
  open,
  review,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [score, setScore] = useState<number>(review?.overallScore ?? 50);
  const [feedback, setFeedback] = useState(review?.overallFeedback ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when review changes
  React.useEffect(() => {
    if (review) {
      setScore(review.overallScore ?? 50);
      setFeedback(review.overallFeedback ?? '');
      setError(null);
    }
  }, [review]);

  const handleSubmit = async () => {
    if (!review) return;
    if (score < 0 || score > 100) {
      setError(t('peerReview.invalidScore', 'Score must be between 0 and 100'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(review.id, score, feedback || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!review) return null;

  return (
    <Transition show={open} as={React.Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              className="w-full max-w-md rounded-lg p-6"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <Dialog.Title
                className="text-lg font-semibold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                {t('peerReview.submitReview', 'Submit Peer Review')}
              </Dialog.Title>

              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                {t('peerReview.reviewFor', 'Review for')} {review.revieweeName || `User ${review.revieweeUserId}`}
              </p>

              {/* Score slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {t('peerReview.score', 'Score')}
                  </label>
                  <span
                    className="text-lg font-semibold px-2 py-0.5 rounded"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-overlay)',
                    }}
                  >
                    {score}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full accent-white"
                  style={{ accentColor: 'var(--text-primary)' }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {/* Feedback textarea */}
              <div className="mb-5">
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {t('peerReview.feedback', 'Feedback')}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="input w-full"
                  style={{ background: 'var(--bg-sunken)' }}
                  placeholder={t('peerReview.feedbackPlaceholder', 'Provide constructive feedback...')}
                />
              </div>

              {error && (
                <p className="text-xs mb-3" style={{ color: 'var(--fn-error)' }}>{error}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={onClose}
                  disabled={submitting}
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting ? t('common.saving', 'Saving...') : t('peerReview.submit', 'Submit Review')}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};
