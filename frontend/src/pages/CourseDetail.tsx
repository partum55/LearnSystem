import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { Card, CardHeader, CardBody } from '../components';
import { Button } from '../components';
import { Loading } from '../components';
import { CreateModuleModal } from '../components';
import { CreateAssignmentModal } from '../components';
import { CreateResourceModal } from '../components/CreateResourceModal';
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
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Module, Assignment } from '../types';
import { TeacherGradebook } from '../components';
import { CourseGradesTab } from '../components';
import { EnrollStudentsModal } from '../components';


export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currentCourse, modules, assignments, fetchCourseById, fetchModules, fetchAssignments, isLoadingCourse } = useCourseStore();
  const [activeTab, setActiveTab] = useState<'modules' | 'assignments' | 'members' | 'grades'>('modules');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

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
      fetchModules(id);
    }
  };

  const handleResourceCreated = () => {
    if (id) {
      fetchModules(id);
    }
  };

  const handleAddResource = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setShowResourceModal(true);
  };

  const handleAddAssignment = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setShowAssignmentModal(true);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  if (isLoadingCourse || !currentCourse) {
    return <Loading />;
  }

  const isInstructor = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN';

  const tabs = [
    { id: 'modules', name: t('courses.modules'), icon: FolderIcon },
    { id: 'assignments', name: t('assignments.title'), icon: DocumentTextIcon },
    { id: 'members', name: t('courses.students'), icon: UserGroupIcon },
    { id: 'grades', name: t('gradebook.title'), icon: AcademicCapIcon },
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            {/* Course Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Link to="/courses" className="hover:text-blue-600 dark:hover:text-blue-400">
                  {t('courses.title')}
                </Link>
                <span className="mx-2">/</span>
                <span className="truncate">{currentCourse.code}</span>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <AcademicCapIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                          {currentCourse.code}
                        </h1>
                      </div>
                      <h2 className="text-base sm:text-xl text-gray-700 dark:text-gray-300">
                        {currentCourse.title}
                      </h2>
                    </div>
                    {isInstructor && (
                      <div className="flex gap-2">
                        <Link to={`/courses/${id}/edit`}>
                          <Button variant="secondary" size="sm">
                            <span className="hidden sm:inline">{t('common.edit')}</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        </Link>
                        <Button size="sm" onClick={() => setShowEnrollModal(true)}>
                          <PlusIcon className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">{t('courses.enrollStudents')}</span>
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
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
              <nav className="flex space-x-4 sm:space-x-8 min-w-max sm:min-w-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap
                      ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
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
                    modules.map((module: Module) => (
                      <Card key={module.id}>
                        <CardHeader>
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleModule(module.id)}
                          >
                            <div className="flex items-center gap-2">
                              {expandedModules.has(module.id) ? (
                                <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                              )}
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {module.title}
                              </h3>
                            </div>
                            {module.is_published && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                {t('common.published')}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        {expandedModules.has(module.id) && (
                          <CardBody>
                            {module.description && (
                              <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {module.description}
                              </p>
                            )}

                            {/* Action Buttons for Instructor */}
                            {isInstructor && (
                              <div className="flex gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddResource(module.id);
                                  }}
                                >
                                  <PlusIcon className="h-4 w-4 mr-1" />
                                  {t('modules.addResource')}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddAssignment(module.id);
                                  }}
                                >
                                  <PlusIcon className="h-4 w-4 mr-1" />
                                  {t('assignments.addAssignment')}
                                </Button>
                              </div>
                            )}

                            {/* Resources Section */}
                            {(module as any).resources && (module as any).resources.length > 0 && (
                              <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                  <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                  <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                                    {t('modules.resources')}
                                  </h4>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({(module as any).resources.length})
                                  </span>
                                </div>
                                <div className="space-y-2 pl-2">
                                  {(module as any).resources.map((resource: any) => (
                                    <div
                                      key={resource.id}
                                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                                    >
                                      <DocumentTextIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <a
                                          href={resource.file_url || resource.external_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium block truncate"
                                        >
                                          {resource.title}
                                        </a>
                                        {resource.description && (
                                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {resource.description}
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                                        {resource.resource_type}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Assignments Section */}
                            {(module as any).assignments && (module as any).assignments.length > 0 && (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                  <DocumentTextIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                                    {t('assignments.title')}
                                  </h4>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({(module as any).assignments.length})
                                  </span>
                                </div>
                                <div className="space-y-2 pl-2">
                                  {(module as any).assignments.map((assignment: any) => (
                                    <Link
                                      key={assignment.id}
                                      to={`/assignments/${assignment.id}`}
                                      className="block"
                                    >
                                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group border border-transparent hover:border-green-200 dark:hover:border-green-800">
                                        <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                                            {assignment.title}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {assignment.due_date && (
                                              <span className="flex items-center gap-1">
                                                <ClockIcon className="h-4 w-4" />
                                                {new Date(assignment.due_date).toLocaleDateString()}
                                              </span>
                                            )}
                                            <span>{assignment.max_points} {t('assignments.points')}</span>
                                          </div>
                                        </div>
                                        {assignment.is_published && (
                                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            {t('common.published')}
                                          </span>
                                        )}
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Empty State */}
                            {(!(module as any).resources || (module as any).resources.length === 0) &&
                             (!(module as any).assignments || (module as any).assignments.length === 0) && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
                                {t('modules.noContent')}
                              </p>
                            )}
                          </CardBody>
                        )}
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

              {activeTab === 'grades' && (
                isInstructor ? (
                  <TeacherGradebook courseId={id!} />
                ) : (
                  <CourseGradesTab courseId={id!} />
                )
              )}
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
                  onClose={() => {
                    setShowAssignmentModal(false);
                    setSelectedModuleId(null);
                  }}
                  courseId={id!}
                  moduleId={selectedModuleId || undefined}
                  onAssignmentCreated={handleAssignmentCreated}
                />
                {selectedModuleId && (
                  <CreateResourceModal
                    isOpen={showResourceModal}
                    onClose={() => {
                      setShowResourceModal(false);
                      setSelectedModuleId(null);
                    }}
                    moduleId={selectedModuleId}
                    onResourceCreated={handleResourceCreated}
                  />
                )}
                {/* Enroll students modal */}
                <EnrollStudentsModal
                  isOpen={showEnrollModal}
                  onClose={() => setShowEnrollModal(false)}
                  courseId={id!}
                  onEnrolled={() => {
                    // Refresh course and lists when new students are enrolled
                    if (id) {
                      fetchCourseById(id);
                      fetchModules(id);
                      fetchAssignments(id);
                    }
                    setShowEnrollModal(false);
                  }}
                />
              </>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetail;
