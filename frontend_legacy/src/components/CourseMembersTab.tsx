import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardBody } from './Card';
import { Button } from './Button';
import { Loading } from './Loading';
import apiClient from '../api/client';
import { coursesApi } from '../api/courses';
import { useAuthStore } from '../store/authStore';
import {
  UserGroupIcon,
  TrashIcon,
  AcademicCapIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface CourseMemberDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleInCourse: string;
  addedAt: string;
  finalGrade?: number;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
}

interface Member {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleInCourse: string;
  addedAt: string;
  finalGrade?: number;
}

interface CourseMembers {
  courseId: string;
  canManage: boolean;
  onMemberRemoved?: () => void;
}

export const CourseMembersTab: React.FC<CourseMembers> = ({ courseId, canManage, onMemberRemoved }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<'ALL' | 'STUDENT' | 'TA' | 'TEACHER'>('ALL');
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const roleParam = filterRole !== 'ALL' ? `?role=${filterRole}` : '';
      const response = await apiClient.get<PageResponse<CourseMemberDto>>(`/courses/${courseId}/members${roleParam}`);
      const mappedMembers = (response.data.content || []).map((member) => ({
        id: member.id,
        userId: member.userId,
        userName: member.userName,
        userEmail: member.userEmail,
        roleInCourse: member.roleInCourse,
        addedAt: member.addedAt,
        finalGrade: member.finalGrade,
      }));
      setMembers(mappedMembers);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, filterRole]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    setEnrollmentLoading(true);
    void coursesApi.checkEnrollment(courseId)
      .then((response) => setIsEnrolled(Boolean(response.data)))
      .catch(() => setIsEnrolled(null))
      .finally(() => setEnrollmentLoading(false));
  }, [courseId]);

  const handleUnenroll = async (memberId: string, userId: string) => {
    if (!window.confirm(t('enrollment.confirmUnenroll'))) {
      return;
    }

    try {
      await apiClient.delete(`/courses/${courseId}/enroll/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (onMemberRemoved) {
        onMemberRemoved();
      }
    } catch (error) {
      console.error('Failed to unenroll student:', error);
      alert(t('enrollment.errors.unenrollFailed'));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'TEACHER':
        return <AcademicCapIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />;
      case 'TA':
        return <UserIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />;
      default:
        return <UserGroupIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />;
    }
  };

  if (loading) {
    return <Loading />;
  }

  const students = members.filter(m => m.roleInCourse === 'STUDENT');
  const tas = members.filter(m => m.roleInCourse === 'TA');
  const teachers = members.filter(m => m.roleInCourse === 'TEACHER');

  const handleDropCourse = async () => {
    if (!window.confirm(t('enrollment.confirmDropCourse', 'Leave this course?'))) {
      return;
    }

    try {
      await coursesApi.dropEnrollment(courseId);
      setIsEnrolled(false);
      if (user?.id) {
        setMembers((prev) => prev.filter((member) => String(member.userId) !== String(user.id)));
      }
      if (onMemberRemoved) onMemberRemoved();
    } catch (error) {
      console.error('Failed to drop course:', error);
      alert(t('enrollment.errors.dropFailed', 'Unable to leave course.'));
    }
  };

  return (
    <div className="space-y-6">
      {!canManage && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('enrollment.myEnrollmentStatus', 'My enrollment status')}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {enrollmentLoading ? 'Checking…' : isEnrolled ? 'Enrolled' : 'Not enrolled'}
                </p>
              </div>
              {isEnrolled && (
                <Button variant="secondary" onClick={() => void handleDropCourse()}>
                  {t('enrollment.dropCourse', 'Leave Course')}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('enrollment.totalStudents')}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{students.length}</p>
              </div>
              <UserGroupIcon className="h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('enrollment.totalTAs')}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{tas.length}</p>
              </div>
              <UserIcon className="h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('enrollment.totalTeachers')}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{teachers.length}</p>
              </div>
              <AcademicCapIcon className="h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="label">
          {t('enrollment.filterByRole')}:
        </label>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as 'ALL' | 'STUDENT' | 'TA' | 'TEACHER')}
          className="input"
        >
          <option value="ALL">{t('enrollment.allRoles')}</option>
          <option value="STUDENT">{t('enrollment.roles.student')}</option>
          <option value="TA">{t('enrollment.roles.ta')}</option>
          <option value="TEACHER">{t('enrollment.roles.teacher')}</option>
        </select>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
              <p style={{ color: 'var(--text-muted)' }}>
                {t('enrollment.noMembers')}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('enrollment.membersList')} ({members.length})
            </h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {t('enrollment.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {t('enrollment.email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {t('enrollment.role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {t('enrollment.enrolledDate')}
                    </th>
                    {canManage && (
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {t('common.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRoleIcon(member.roleInCourse)}
                          <span className="ml-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {member.userName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-muted)' }}>
                        {member.userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge">
                          {t(`enrollment.roles.${member.roleInCourse.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-muted)' }}>
                        {new Date(member.addedAt).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {member.roleInCourse !== 'TEACHER' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnenroll(member.id, member.userId)}
                              style={{ color: 'var(--fn-error)' }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
