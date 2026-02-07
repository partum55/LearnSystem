import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

interface RiskFactor {
  category: string;
  description: string;
  impact: number;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  priority: string;
}

interface StudentRiskPrediction {
  studentId: number;
  studentName: string;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  riskFactors: RiskFactor[];
  recommendations: Recommendation[];
  lastUpdated: string;
}

export const AtRiskStudents: React.FC = () => {
  const { t } = useTranslation();
  const { courseId: routeCourseId, id } = useParams<{ courseId?: string; id?: string }>();
  const courseId = routeCourseId || id;
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRiskPrediction[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRiskPrediction | null>(null);

  const fetchAtRiskStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/courses/${courseId}/at-risk-students`);
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch at-risk students:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchAtRiskStudents();
    }
  }, [courseId, fetchAtRiskStudents]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 font-semibold';
      case 'medium':
        return 'text-orange-600 font-semibold';
      default:
        return 'text-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('analytics.atRisk.title', 'At-Risk Students')}
        </h2>
        <button
          onClick={fetchAtRiskStudents}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {students.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-800 font-medium">
            {t('analytics.atRisk.none', 'No at-risk students identified. Great job!')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Students List */}
          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.studentId}
                onClick={() => setSelectedStudent(student)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${selectedStudent?.studentId === student.studentId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.studentName}</h3>
                    <p className="text-sm text-gray-500">
                      {t('analytics.atRisk.riskScore', 'Risk Score')}: {student.riskScore.toFixed(1)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskLevelColor(
                      student.riskLevel
                    )}`}
                  >
                    {student.riskLevel}
                  </span>
                </div>

                <div className="space-y-1">
                  {student.riskFactors.slice(0, 2).map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-red-500">⚠</span>
                      <span className="text-gray-700">{factor.description}</span>
                    </div>
                  ))}
                  {student.riskFactors.length > 2 && (
                    <p className="text-xs text-gray-500 ml-6">
                      +{student.riskFactors.length - 2} more factors
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Student Details */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            {selectedStudent ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedStudent.studentName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedStudent.courseCode} - {selectedStudent.courseTitle}
                  </p>
                  <div className="mt-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRiskLevelColor(
                        selectedStudent.riskLevel
                      )}`}
                    >
                      {selectedStudent.riskLevel} RISK
                    </span>
                    <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                      Score: {selectedStudent.riskScore.toFixed(1)}/100
                    </span>
                  </div>
                </div>

                {/* Risk Factors */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    {t('analytics.atRisk.riskFactors', 'Risk Factors')}
                  </h4>
                  <div className="space-y-2">
                    {selectedStudent.riskFactors.map((factor, idx) => (
                      <div key={idx} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-red-500 text-xl">⚠</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {factor.category.toUpperCase()}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {factor.description}
                            </p>
                            <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full"
                                style={{ width: `${factor.impact * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Impact: {(factor.impact * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    {t('analytics.atRisk.recommendations', 'Recommended Actions')}
                  </h4>
                  <div className="space-y-3">
                    {selectedStudent.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 text-2xl">
                            {rec.type === 'intervention' && '👨‍🏫'}
                            {rec.type === 'resource' && '📚'}
                            {rec.type === 'contact' && '📧'}
                          </div>
                          <div className="flex-1">
                            <h5 className={`font-medium ${getPriorityColor(rec.priority)}`}>
                              {rec.title}
                            </h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {rec.description}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              Priority: <span className={getPriorityColor(rec.priority)}>{rec.priority}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {t('analytics.atRisk.contact', 'Contact Student')}
                  </button>
                  <button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                    {t('analytics.atRisk.viewProgress', 'View Full Progress')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {t('analytics.atRisk.selectStudent', 'Select a student to view details')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AtRiskStudents;
