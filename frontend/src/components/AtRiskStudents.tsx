import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../api/client';

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
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRiskPrediction[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRiskPrediction | null>(null);

  const fetchAtRiskStudents = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<StudentRiskPrediction[]>(
        `/analytics/courses/${courseId}/at-risk-students`
      );
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch at-risk students:', error);
      setError(extractErrorMessage(error));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchAtRiskStudents();
    }
  }, [courseId, fetchAtRiskStudents]);

  const getRiskBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return { background: 'rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'HIGH':
        return { background: 'rgba(239, 68, 68, 0.08)', color: 'var(--fn-error)', border: '1px solid rgba(239, 68, 68, 0.15)' };
      case 'MEDIUM':
        return { background: 'rgba(234, 179, 8, 0.08)', color: 'var(--fn-warning)', border: '1px solid rgba(234, 179, 8, 0.15)' };
      default:
        return { background: 'rgba(34, 197, 94, 0.08)', color: 'var(--fn-success)', border: '1px solid rgba(34, 197, 94, 0.15)' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'var(--fn-error)';
      case 'medium':
        return 'var(--fn-warning)';
      default:
        return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid var(--text-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {t('analytics.atRisk.title', 'At-Risk Students')}
        </h2>
        <button
          onClick={fetchAtRiskStudents}
          className="btn btn-primary"
        >
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}>
          {error}
        </div>
      )}

      {students.length === 0 ? (
        <div className="rounded-lg p-6 text-center" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
          <p className="font-medium" style={{ color: 'var(--fn-success)' }}>
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
                className="border-2 rounded-lg p-4 cursor-pointer transition"
                style={{
                  borderColor: selectedStudent?.studentId === student.studentId
                    ? 'var(--text-primary)'
                    : 'var(--border-default)',
                  background: selectedStudent?.studentId === student.studentId
                    ? 'var(--bg-elevated)'
                    : 'transparent',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{student.studentName}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('analytics.atRisk.riskScore', 'Risk Score')}: {student.riskScore.toFixed(1)}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={getRiskBadgeStyle(student.riskLevel)}
                  >
                    {student.riskLevel}
                  </span>
                </div>

                <div className="space-y-1">
                  {student.riskFactors.slice(0, 2).map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span style={{ color: 'var(--fn-warning)' }}>&#9888;</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{factor.description}</span>
                    </div>
                  ))}
                  {student.riskFactors.length > 2 && (
                    <p className="text-xs ml-6" style={{ color: 'var(--text-faint)' }}>
                      +{student.riskFactors.length - 2} more factors
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Student Details */}
          <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            {selectedStudent ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {selectedStudent.studentName}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {selectedStudent.courseCode} - {selectedStudent.courseTitle}
                  </p>
                  <div className="mt-3">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={getRiskBadgeStyle(selectedStudent.riskLevel)}
                    >
                      {selectedStudent.riskLevel} RISK
                    </span>
                    <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Score: {selectedStudent.riskScore.toFixed(1)}/100
                    </span>
                  </div>
                </div>

                {/* Risk Factors */}
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {t('analytics.atRisk.riskFactors', 'Risk Factors')}
                  </h4>
                  <div className="space-y-2">
                    {selectedStudent.riskFactors.map((factor, idx) => (
                      <div key={idx} className="rounded p-3" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <div className="flex items-start gap-2">
                          <span className="text-xl" style={{ color: 'var(--fn-warning)' }}>&#9888;</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {factor.category.toUpperCase()}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {factor.description}
                            </p>
                            <div className="mt-2 rounded-full h-2" style={{ background: 'var(--bg-overlay)' }}>
                              <div
                                className="h-2 rounded-full"
                                style={{ width: `${factor.impact * 100}%`, background: 'var(--fn-error)' }}
                              />
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
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
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {t('analytics.atRisk.recommendations', 'Recommended Actions')}
                  </h4>
                  <div className="space-y-3">
                    {selectedStudent.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg p-4"
                        style={{ border: '1px solid var(--border-default)' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 text-2xl">
                            {rec.type === 'intervention' && String.fromCodePoint(0x1F468, 0x200D, 0x1F3EB)}
                            {rec.type === 'resource' && String.fromCodePoint(0x1F4DA)}
                            {rec.type === 'contact' && String.fromCodePoint(0x1F4E7)}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium" style={{ color: getPriorityColor(rec.priority) }}>
                              {rec.title}
                            </h5>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                              {rec.description}
                            </p>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
                              Priority: <span style={{ color: getPriorityColor(rec.priority), fontWeight: 600 }}>{rec.priority}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <button className="btn btn-primary flex-1">
                    {t('analytics.atRisk.contact', 'Contact Student')}
                  </button>
                  <button className="btn btn-secondary flex-1">
                    {t('analytics.atRisk.viewProgress', 'View Full Progress')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
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
