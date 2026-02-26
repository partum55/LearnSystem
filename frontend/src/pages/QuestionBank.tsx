import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Layout,
  Card,
  CardBody,
  Button,
  Loading,
  CreateQuestionModal,
} from '../components';
import { StaggeredList, StaggeredItem } from '../components/animation';
import { ConfirmModal } from '../components/common/ConfirmModal';
import apiClient from '../api/client';
import { PlusIcon, PencilIcon, TrashIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface QuestionOption {
  choices?: string[];
  [key: string]: unknown;
}

interface Question {
  id: string;
  question_type: string;
  stem: string;
  options?: QuestionOption;
  correct_answer: string | number | boolean | string[] | number[] | Record<string, unknown>; // Dynamic based on question type
  explanation?: string;
  points: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  created_by_name?: string;
}

interface ApiQuestion {
  id: string;
  questionType: string;
  stem: string;
  options?: QuestionOption;
  correctAnswer: string | number | boolean | string[] | number[] | Record<string, unknown>;
  explanation?: string;
  points: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface PageResponse<T> {
  content: T[];
}

export const QuestionBank: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; questionId: string | null }>({
    isOpen: false,
    questionId: null,
  });
  const [deleting, setDeleting] = useState(false);
  const dataLoadedRef = useRef<string | undefined>(undefined); // Allow undefined to match courseId type

  useEffect(() => {
    // If courseId changed, reset
    if (dataLoadedRef.current !== courseId) {
      dataLoadedRef.current = courseId;
      fetchQuestions();
    } else {
      // Data already loaded for this courseId, skip
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = courseId
        ? await apiClient.get<PageResponse<ApiQuestion>>(`/assessments/questions/course/${courseId}`)
        : await apiClient.get<PageResponse<ApiQuestion>>('/assessments/questions/global');

      const questionsList = (response.data.content || []).map((q) => ({
        id: q.id,
        question_type: q.questionType,
        stem: q.stem,
        options: q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        points: Number(q.points),
        metadata: q.metadata,
        created_at: q.createdAt,
      }));
      setQuestions(questionsList);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setDeleteConfirm({ isOpen: true, questionId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.questionId) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/assessments/questions/${deleteConfirm.questionId}`);
      setDeleteConfirm({ isOpen: false, questionId: null });
      fetchQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert(t('question.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleEditQuestion = () => {
    setShowCreateModal(true);
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'MULTIPLE_CHOICE': 'Multiple Choice',
      'TRUE_FALSE': 'True/False',
      'FILL_BLANK': 'Fill in the Blank',
      'SHORT_ANSWER': 'Short Answer',
      'ESSAY': 'Essay',
      'MATCHING': 'Matching',
      'NUMERICAL': 'Numerical',
    };
    return labels[type] || type;
  };

  const getQuestionTypeBadgeColor = (type: string) => {
    void type;
    return 'badge';
  };

  const filteredQuestions = questions.filter(q => {
    const matchesType = filterType === 'ALL' || q.question_type === filterType;
    const matchesSearch = !searchQuery || q.stem.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const questionTypes = [
    'ALL',
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'FILL_BLANK',
    'SHORT_ANSWER',
    'ESSAY',
    'MATCHING',
    'NUMERICAL',
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  {t('questionBank.title')}
                </h1>
                <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                  {t('questionBank.description')}
                </p>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                {t('question.create')}
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <StaggeredList className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StaggeredItem><Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {questions.length}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('questionBank.totalQuestions')}
                  </p>
                </div>
              </CardBody>
            </Card></StaggeredItem>

            <StaggeredItem><Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {questions.filter(q => q.question_type === 'MULTIPLE_CHOICE').length}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Multiple Choice
                  </p>
                </div>
              </CardBody>
            </Card></StaggeredItem>

            <StaggeredItem><Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {questions.filter(q => ['SHORT_ANSWER', 'ESSAY'].includes(q.question_type)).length}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Open-Ended
                  </p>
                </div>
              </CardBody>
            </Card></StaggeredItem>

            <StaggeredItem><Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {questions.reduce((sum, q) => sum + q.points, 0)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('questionBank.totalPoints')}
                  </p>
                </div>
              </CardBody>
            </Card></StaggeredItem>
          </StaggeredList>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('questionBank.searchPlaceholder')}
                    className="input w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="input"
                  >
                    {questionTypes.map(type => (
                      <option key={type} value={type}>
                        {type === 'ALL' ? t('questionBank.allTypes') : getQuestionTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Questions List */}
          {filteredQuestions.length === 0 ? (
            <Card>
              <CardBody>
                <div className="text-center py-12">
                  <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                    {searchQuery || filterType !== 'ALL'
                      ? t('questionBank.noQuestionsFiltered')
                      : t('questionBank.noQuestions')}
                  </p>
                  {!searchQuery && filterType === 'ALL' && (
                    <Button onClick={() => setShowCreateModal(true)}>
                      <PlusIcon className="h-5 w-5 mr-2" />
                      {t('question.createFirst')}
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ) : (
            <StaggeredList className="space-y-4">
              {filteredQuestions.map((question) => (
                <StaggeredItem key={question.id}>
                <Card>
                  <CardBody>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Question Type Badge */}
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-3 ${getQuestionTypeBadgeColor(question.question_type)}`}>
                          {getQuestionTypeLabel(question.question_type)}
                        </span>

                        {/* Question Stem */}
                        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                          {question.stem}
                        </h3>

                        {/* Multiple Choice Options Preview */}
                        {question.question_type === 'MULTIPLE_CHOICE' && question.options?.choices && (
                          <div className="mt-3 space-y-1">
                            {question.options.choices.slice(0, 3).map((choice: string, idx: number) => (
                              <div key={idx} className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                <span className="w-6 h-6 flex items-center justify-center border rounded mr-2" style={{ borderColor: 'var(--border-default)' }}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span>{choice}</span>
                                {((question.correct_answer as unknown) as { index: number })?.index === idx && (
                                  <span className="ml-2" style={{ color: 'var(--fn-success)' }}>✓</span>
                                )}
                              </div>
                            ))}
                            {(question.options.choices.length || 0) > 3 && (
                              <p className="text-xs ml-8" style={{ color: 'var(--text-muted)' }}>
                                +{(question.options.choices.length || 0) - 3} more options
                              </p>
                            )}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                          <span>{question.points} {t('question.points')}</span>
                          {question.created_by_name && (
                            <span>{t('question.createdBy')}: {question.created_by_name}</span>
                          )}
                          <span>{new Date(question.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Explanation Preview */}
                        {question.explanation && (
                          <div className="mt-2 text-sm italic" style={{ color: 'var(--text-muted)' }}>
                            {t('question.explanation')}: {question.explanation.substring(0, 100)}
                            {question.explanation.length > 100 && '...'}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={handleEditQuestion}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--text-faint)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fn-error)'; e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}

          {/* Pagination Info */}
          {filteredQuestions.length > 0 && (
            <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('questionBank.showing')} {filteredQuestions.length} {t('questionBank.of')} {questions.length} {t('questionBank.questions')}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Question Modal */}
      <CreateQuestionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        courseId={courseId} // pass optional courseId (can be undefined) so questions may be global
        onQuestionCreated={() => fetchQuestions()}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, questionId: null })}
        onConfirm={confirmDelete}
        title={t('question.confirmDeleteTitle', 'Delete Question')}
        message={t('question.confirmDelete', 'Are you sure you want to delete this question?')}
        details={t('question.deleteWarning', 'This action cannot be undone. The question will be permanently removed from all quizzes that use it.')}
        variant="danger"
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        isLoading={deleting}
      />
    </Layout>
  );
};

export default QuestionBank;
