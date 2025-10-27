import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Header,
  Sidebar,
  Card,
  CardBody,
  Button,
  Loading,
  CreateQuestionModal,
} from '../components';
import apiClient from '../api/client';
import { PlusIcon, PencilIcon, TrashIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface Question {
  id: string;
  question_type: string;
  stem: string;
  options?: any;
  correct_answer: any;
  explanation?: string;
  points: number;
  metadata?: any;
  created_at: string;
  created_by_name?: string;
}

export const QuestionBank: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const dataLoadedRef = useRef<string | undefined>(undefined); // Allow undefined to match courseId type

  useEffect(() => {
    // If courseId changed, reset
    if (dataLoadedRef.current !== courseId) {
      dataLoadedRef.current = courseId;

      if (courseId) {
        fetchQuestions();
      }
    } else {
      // Data already loaded for this courseId, skip
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/assessments/questions/?course=${courseId}`);
      const data = response.data as any;
      const questionsList = Array.isArray(data) ? data : data.results || [];
      setQuestions(questionsList);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm(t('question.confirmDelete'))) return;

    try {
      await apiClient.delete(`/assessments/questions/${questionId}/`);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert(t('question.deleteFailed'));
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
    const colors: Record<string, string> = {
      'MULTIPLE_CHOICE': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'TRUE_FALSE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'FILL_BLANK': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'SHORT_ANSWER': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'ESSAY': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'MATCHING': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'NUMERICAL': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('questionBank.title')}
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {questions.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('questionBank.totalQuestions')}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {questions.filter(q => q.question_type === 'MULTIPLE_CHOICE').length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Multiple Choice
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {questions.filter(q => ['SHORT_ANSWER', 'ESSAY'].includes(q.question_type)).length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Open-Ended
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {questions.reduce((sum, q) => sum + q.points, 0)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('questionBank.totalPoints')}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

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
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
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
              <div className="space-y-4">
                {filteredQuestions.map((question) => (
                  <Card key={question.id}>
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Question Type Badge */}
                          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-3 ${getQuestionTypeBadgeColor(question.question_type)}`}>
                            {getQuestionTypeLabel(question.question_type)}
                          </span>

                          {/* Question Stem */}
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {question.stem}
                          </h3>

                          {/* Multiple Choice Options Preview */}
                          {question.question_type === 'MULTIPLE_CHOICE' && question.options?.choices && (
                            <div className="mt-3 space-y-1">
                              {question.options.choices.slice(0, 3).map((choice: string, idx: number) => (
                                <div key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <span className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded mr-2">
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span>{choice}</span>
                                  {question.correct_answer?.index === idx && (
                                    <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                                  )}
                                </div>
                              ))}
                              {question.options.choices.length > 3 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                                  +{question.options.choices.length - 3} more options
                                </p>
                              )}
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>{question.points} {t('question.points')}</span>
                            {question.created_by_name && (
                              <span>{t('question.createdBy')}: {question.created_by_name}</span>
                            )}
                            <span>{new Date(question.created_at).toLocaleDateString()}</span>
                          </div>

                          {/* Explanation Preview */}
                          {question.explanation && (
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                              {t('question.explanation')}: {question.explanation.substring(0, 100)}
                              {question.explanation.length > 100 && '...'}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={handleEditQuestion}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination Info */}
            {filteredQuestions.length > 0 && (
              <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                {t('questionBank.showing')} {filteredQuestions.length} {t('questionBank.of')} {questions.length} {t('questionBank.questions')}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create/Edit Question Modal */}
      <CreateQuestionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        courseId={courseId} // pass optional courseId (can be undefined) so questions may be global
        onQuestionCreated={() => fetchQuestions()}
      />
    </div>
  );
};

export default QuestionBank;
