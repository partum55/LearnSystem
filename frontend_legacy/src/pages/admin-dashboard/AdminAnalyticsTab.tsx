import React, { useEffect, useState } from 'react';
import { adminAnalyticsApi, CourseEffectiveness, InstructorProductivity, PlatformUsage } from '../../api/adminAnalytics';
import { aiApi, ABTestResultsResponse } from '../../api/ai';
import { extractErrorMessage } from '../../api/client';
import { AIAdminDashboard } from '../../components/ai/AIAdminDashboard';

interface Props {
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

export const AdminAnalyticsTab: React.FC<Props> = ({ onFeedback }) => {
  const [loading, setLoading] = useState(false);
  const [platformUsage, setPlatformUsage] = useState<PlatformUsage | null>(null);
  const [courseEffectiveness, setCourseEffectiveness] = useState<CourseEffectiveness[]>([]);
  const [instructorProductivity, setInstructorProductivity] = useState<InstructorProductivity[]>([]);

  const [experiments, setExperiments] = useState<string[]>([]);
  const [activeExperiments, setActiveExperiments] = useState<string[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState('');
  const [results, setResults] = useState<ABTestResultsResponse | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [usage, courses, instructors, allExperiments, active] = await Promise.all([
        adminAnalyticsApi.getPlatformUsage(),
        adminAnalyticsApi.getCourseEffectiveness(),
        adminAnalyticsApi.getInstructorProductivity(),
        aiApi.abTests.list(),
        aiApi.abTests.listActive(),
      ]);
      setPlatformUsage(usage);
      setCourseEffectiveness(courses);
      setInstructorProductivity(instructors);
      setExperiments(allExperiments);
      setActiveExperiments(active);
      if (!selectedExperiment && allExperiments.length > 0) {
        setSelectedExperiment(allExperiments[0]);
      }
    } catch (err) {
      onFeedback('error', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadResults = async () => {
      if (!selectedExperiment) {
        setResults(null);
        return;
      }

      try {
        const response = await aiApi.abTests.getResults(selectedExperiment);
        setResults(response);
      } catch {
        setResults(null);
      }
    };

    void loadResults();
  }, [selectedExperiment]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Admin Analytics
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={() => void loadAnalytics()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total users</p>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{platformUsage?.totalUsers ?? 0}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active courses</p>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{platformUsage?.activeCourses ?? 0}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total submissions</p>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{platformUsage?.totalSubmissions ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Course effectiveness</h3>
          {courseEffectiveness.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No course effectiveness data.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {courseEffectiveness.map((course) => (
                <div key={course.courseId} className="rounded-md p-2" style={{ background: 'var(--bg-base)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {course.courseCode || `Course ${course.courseId}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Completion: {course.completionRate?.toFixed(1) ?? 0}% · Avg grade: {course.averageGrade?.toFixed(1) ?? 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Instructor productivity</h3>
          {instructorProductivity.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No instructor productivity data.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {instructorProductivity.map((instructor) => (
                <div key={instructor.instructorId} className="rounded-md p-2" style={{ background: 'var(--bg-base)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {instructor.instructorName || `Instructor ${instructor.instructorId}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Courses: {instructor.coursesTeaching ?? 0} · Graded: {instructor.assignmentsGraded ?? 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>AI A/B tests</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            className="input text-sm"
            value={selectedExperiment}
            onChange={(event) => setSelectedExperiment(event.target.value)}
          >
            <option value="">Select experiment</option>
            {experiments.map((experiment) => (
              <option key={experiment} value={experiment}>{experiment}</option>
            ))}
          </select>
          {selectedExperiment && activeExperiments.includes(selectedExperiment) && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                void aiApi.abTests.stopExperiment(selectedExperiment)
                  .then(() => {
                    onFeedback('success', 'Experiment stopped.');
                    return loadAnalytics();
                  })
                  .catch((err) => onFeedback('error', extractErrorMessage(err)));
              }}
            >
              Stop experiment
            </button>
          )}
        </div>

        {results ? (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Winning variant: <strong>{results.winningVariant || 'N/A'}</strong>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Samples: {results.totalSamples} · Significant: {results.statisticallySignificant ? 'Yes' : 'No'}
            </p>
            <div className="space-y-2">
              {(results.variants || []).map((variant) => (
                <div key={variant.variantName} className="rounded-md p-2" style={{ background: 'var(--bg-base)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{variant.variantName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Success: {variant.successRate.toFixed(1)}% · Avg rating: {variant.averageUserRating.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select an experiment to view results.</p>
        )}
      </div>

      <AIAdminDashboard />
    </div>
  );
};

export default AdminAnalyticsTab;
