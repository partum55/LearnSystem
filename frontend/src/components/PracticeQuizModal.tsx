import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, type PracticeQuizResponse } from '../api/ai';
import { Modal } from './Modal';
import { Button } from './index';
import type { Module } from '../types';

interface PracticeQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  modules: Module[];
}

export const PracticeQuizModal: React.FC<PracticeQuizModalProps> = ({
  isOpen, onClose, courseId, modules,
}) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'config' | 'loading' | 'quiz' | 'results'>('config');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState<PracticeQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedModuleId) return;
    setStep('loading');
    setError(null);
    try {
      const result = await aiApi.practiceQuiz(courseId, selectedModuleId, questionCount, difficulty, i18n.language);
      setQuiz(result);
      setAnswers({});
      setShowResults(false);
      setStep('quiz');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
      setStep('config');
    }
  };

  const handleCheckAnswers = () => {
    setShowResults(true);
    setStep('results');
  };

  const score = quiz?.questions.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? q.points : 0), 0) ?? 0;
  const maxScore = quiz?.questions.reduce((acc, q) => acc + q.points, 0) ?? 0;

  const handleClose = () => {
    setStep('config');
    setQuiz(null);
    setAnswers({});
    setShowResults(false);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('ai.practiceQuiz', 'Practice Quiz')} size="large">
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--fn-error)' }}>
          {error}
        </div>
      )}

      {step === 'config' && (
        <div className="space-y-4">
          <div className="input-group">
            <label className="label">{t('ai.selectModule', 'Select Module')}</label>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="input"
            >
              <option value="">{t('ai.chooseModule', '-- Choose a module --')}</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="label">{t('ai.questionCount', 'Questions')}</label>
              <input
                type="number" min={3} max={10} value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="input"
              />
            </div>
            <div className="input-group">
              <label className="label">{t('ai.difficulty', 'Difficulty')}</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input">
                <option value="easy">{t('ai.easy', 'Easy')}</option>
                <option value="medium">{t('ai.medium', 'Medium')}</option>
                <option value="hard">{t('ai.hard', 'Hard')}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={!selectedModuleId}>
              {t('ai.generateQuiz', 'Generate Quiz')}
            </Button>
          </div>
        </div>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-muted)' }}>{t('ai.generatingQuiz', 'Generating practice quiz...')}</p>
        </div>
      )}

      {(step === 'quiz' || step === 'results') && quiz && (
        <div className="space-y-6">
          {step === 'results' && (
            <div className="p-4 rounded-lg text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{score}/{maxScore}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('ai.yourScore', 'Your Score')}</p>
            </div>
          )}

          {quiz.questions.map((q, qi) => (
            <div key={qi} className="p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                {qi + 1}. {q.questionText}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const isSelected = answers[qi] === opt;
                  const isCorrect = opt === q.correctAnswer;
                  let optStyle: React.CSSProperties = {
                    background: isSelected ? 'var(--bg-active)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--text-secondary)' : 'var(--border-default)'}`,
                    color: 'var(--text-primary)',
                  };
                  if (showResults) {
                    if (isCorrect) optStyle = { ...optStyle, border: '1px solid var(--fn-success)', background: 'rgba(34,197,94,0.08)' };
                    else if (isSelected && !isCorrect) optStyle = { ...optStyle, border: '1px solid var(--fn-error)', background: 'rgba(239,68,68,0.08)' };
                  }
                  return (
                    <button
                      key={opt}
                      onClick={() => !showResults && setAnswers({ ...answers, [qi]: opt })}
                      disabled={showResults}
                      className="w-full text-left p-3 rounded-lg text-sm transition-all"
                      style={optStyle}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {showResults && (
                <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {q.explanation}
                </p>
              )}
            </div>
          ))}

          {step === 'quiz' && (
            <div className="flex justify-end">
              <Button onClick={handleCheckAnswers}>
                {t('ai.checkAnswers', 'Check Answers')}
              </Button>
            </div>
          )}

          {step === 'results' && (
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => { setStep('config'); setQuiz(null); setAnswers({}); setShowResults(false); }}>
                {t('ai.tryAgain', 'Try Again')}
              </Button>
              <Button onClick={handleClose}>
                {t('common.close', 'Close')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default PracticeQuizModal;
