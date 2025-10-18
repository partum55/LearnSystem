import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { CreateModuleModal } from '../components/CreateModuleModal';
import { CreateAssignmentModal } from '../components/CreateAssignmentModal';
import { useCourseStore } from '../store/courseStore';
import { useAuthStore } from '../store/authStore';
import {
  AcademicCapIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PlusIcon,
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Module, Assignment, Resource } from '../types';

export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currentCourse, modules, assignments, fetchCourseById, fetchModules, fetchAssignments, isLoading } = useCourseStore();
  const [activeTab, setActiveTab] = useState<'modules' | 'assignments' | 'members'>('modules');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourseById(id);
      fetchModules(id);
      fetchAssignments(id);
    }
  }, [id, fetchCourseById, fetchModules, fetchAssignments]);

  const handleModuleCreated = () => {
    if (id) {
      fetchModules(id);
    }
  };

  const handleAssignmentCreated = () => {
    if (id) {
      fetchAssignments(id);
    }
  };

  if (isLoading || !currentCourse) {
    return <Loading />;
  }

  const isInstructor = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN';

  const tabs = [
    { id: 'modules', name: t('courses.modules'), icon: FolderIcon },
    { id: 'assignments', name: t('assignments.title'), icon: DocumentTextIcon },
    { id: 'members', name: t('courses.students'), icon: UserGroupIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Course Header */}
            <div className="mb-8">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Link to="/courses" className="hover:text-blue-600 dark:hover:text-blue-400">
                  {t('courses.title')}
                </Link>
                <span className="mx-2">/</span>
                <span>{currentCourse.code}</span>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <AcademicCapIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                          {currentCourse.code}
                        </h1>
                      </div>
                      <h2 className="text-xl text-gray-700 dark:text-gray-300">
                        {currentCourse.title}
                      </h2>
                    </div>
                    {isInstructor && (
                      <div className="flex gap-2">
                        <Link to={`/courses/${id}/edit`}>
                          <Button variant="secondary" size="sm">
                            {t('common.edit')}
                          </Button>
                        </Link>
                        <Button size="sm">
                          <PlusIcon className="h-4 w-4 mr-1" />
                          {t('courses.enrollStudents')}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="text-gray-600 dark:text-gray-400">
                    {currentCourse.description}
                  </p>
                  <div className="mt-4 flex gap-6 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('courses.instructor')}:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {currentCourse.owner_name || 'Unknown'}
                      </span>
                    </div>
                    {currentCourse.member_count !== undefined && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('courses.students')}:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {currentCourse.member_count}
                        </span>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <tab.icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'modules' && (
                <div className="space-y-4">
                  {isInstructor && (
                    <div className="flex justify-end mb-4">
                      <Button onClick={() => setShowModuleModal(true)}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        {t('modules.addModule')}
                      </Button>
                    </div>
                  )}
                  {!modules || modules.length === 0 ? (
                    <Card>
                      <CardBody>
                        <p className="text-center text-gray-600 dark:text-gray-400 py-12">
                          {t('modules.noModules')}
                        </p>
                      </CardBody>
                    </Card>
                  ) : (
                    (modules || []).map((module: Module) => (
                      <Card key={module.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {module.title}
                            </h3>
                            {module.published && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                {t('common.published')}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardBody>
                          {module.description && (
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                              {module.description}
                            </p>
                          )}
                          {module.resources && module.resources.length > 0 ? (
                            <div className="space-y-2">
                              {module.resources.map((resource: Resource) => (
                                <div
                                  key={resource.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                                >
                                  <div className="flex items-center">
                                    <DocumentTextIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                                    <span className="text-sm text-gray-900 dark:text-white">
                                      {resource.title}
                                    </span>
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    {t('common.view')}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t('modules.noResources')}
                            </p>
                          )}
                        </CardBody>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'assignments' && (
                <div className="space-y-4">
                  {isInstructor && (
                    <div className="flex justify-end mb-4">
                      <Button onClick={() => setShowAssignmentModal(true)}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        {t('assignments.createAssignment')}
                      </Button>
                    </div>
                  )}
                  {!assignments || assignments.length === 0 ? (
                    <Card>
                      <CardBody>
                        <p className="text-center text-gray-600 dark:text-gray-400 py-12">
                          {t('assignments.noAssignments')}
                        </p>
                      </CardBody>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {(assignments || []).map((assignment: Assignment) => (
                        <Link key={assignment.id} to={`/assignments/${assignment.id}`}>
                          <Card hoverable>
                            <CardBody>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {assignment.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    {assignment.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center text-gray-500 dark:text-gray-400">
                                      <ClockIcon className="h-4 w-4 mr-1" />
                                      {assignment.due_date
                                        ? new Date(assignment.due_date).toLocaleDateString()
                                        : t('assignments.noDueDate')}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {assignment.max_points} {t('assignments.points')}
                                    </span>
                                  </div>
                                </div>
                                {assignment.submission && (
                                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    {t('assignments.submitted')}
                                  </span>
                                )}
                              </div>
                            </CardBody>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'members' && (
                <Card>
                  <CardBody>
                    <p className="text-center text-gray-600 dark:text-gray-400 py-12">
                      {t('courses.membersComingSoon')}
                    </p>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {isInstructor && (
        <>
          <CreateModuleModal
            isOpen={showModuleModal}
            onClose={() => setShowModuleModal(false)}
            courseId={id!}
            onModuleCreated={handleModuleCreated}
          />
          <CreateAssignmentModal
            isOpen={showAssignmentModal}
            onClose={() => setShowAssignmentModal(false)}
            courseId={id!}
            onAssignmentCreated={handleAssignmentCreated}
          />
        </>
      )}
    </div>
  );
};

export default CourseDetail;
