import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardBody } from './Card';
import { Button } from './Button';
import { Loading } from './Loading';
import apiClient from '../api/client';
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
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<'ALL' | 'STUDENT' | 'TA' | 'TEACHER'>('ALL');

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
        return <AcademicCapIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'TA':
        return <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <UserGroupIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'TEACHER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'TA':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loading) {
    return <Loading />;
  }

  const students = members.filter(m => m.roleInCourse === 'STUDENT');
  const tas = members.filter(m => m.roleInCourse === 'TA');
  const teachers = members.filter(m => m.roleInCourse === 'TEACHER');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('enrollment.totalStudents')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{students.length}</p>
              </div>
              <UserGroupIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('enrollment.totalTAs')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tas.length}</p>
              </div>
              <UserIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('enrollment.totalTeachers')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{teachers.length}</p>
              </div>
              <AcademicCapIcon className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('enrollment.filterByRole')}:
        </label>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as 'ALL' | 'STUDENT' | 'TA' | 'TEACHER')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
              <UserGroupIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                {t('enrollment.noMembers')}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('enrollment.membersList')} ({members.length})
            </h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('enrollment.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('enrollment.email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('enrollment.role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('enrollment.enrolledDate')}
                    </th>
                    {canManage && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRoleIcon(member.roleInCourse)}
                          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                            {member.userName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {member.userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.roleInCourse)}`}>
                          {t(`enrollment.roles.${member.roleInCourse.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(member.addedAt).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {member.roleInCourse !== 'TEACHER' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnenroll(member.id, member.userId)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
