import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { TabTransition } from '../components/animation';
import {
  activateAdminUser,
  AdminCourse,
  CoursePublishChecklist,
  AdminUser,
  createAdminCourse,
  createAdminUser,
  deactivateAdminUser,
  deleteAdminCourse,
  deleteAdminUser,
  getAdminCourses,
  getAdminUsers,
  getSystemHealth,
  publishAdminCourse,
  SystemHealth,
  unpublishAdminCourse,
  updateAdminCourse,
  updateAdminUser,
} from '../api/admin';
import { extractErrorMessage } from '../api/client';
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BeakerIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  ServerIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { AdminCoursesTab } from './admin-dashboard/AdminCoursesTab';
import { AdminServicesTab } from './admin-dashboard/AdminServicesTab';
import { AdminUsersTab } from './admin-dashboard/AdminUsersTab';
import { AdminCourseManagerTab } from './admin-dashboard/AdminCourseManagerTab';
import { AdminImportExportTab } from './admin-dashboard/AdminImportExportTab';
import { AdminTestLabTab } from './admin-dashboard/AdminTestLabTab';
import { AdminAnalyticsTab } from './admin-dashboard/AdminAnalyticsTab';
import { AdminPluginsTab } from './admin-dashboard/AdminPluginsTab';
import { Button, Modal } from '../components';
import {
  AdminTab,
  CreateCourseForm,
  CreateUserForm,
  Feedback,
  initialCreateCourseForm,
  initialCreateUserForm,
  initialUpdateCourseForm,
  initialUpdateUserForm,
  toOptionalString,
  UpdateCourseForm,
  UpdateUserForm,
} from './admin-dashboard/adminDashboardTypes';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [usersTotalElements, setUsersTotalElements] = useState(0);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | CreateUserForm['role']>('ALL');
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>(initialCreateUserForm);
  const [updateUserForm, setUpdateUserForm] = useState<UpdateUserForm>(initialUpdateUserForm);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(null);

  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesPage, setCoursesPage] = useState(0);
  const [coursesTotalPages, setCoursesTotalPages] = useState(0);
  const [coursesTotalElements, setCoursesTotalElements] = useState(0);
  const [courseSearchInput, setCourseSearchInput] = useState('');
  const [createCourseForm, setCreateCourseForm] = useState<CreateCourseForm>(initialCreateCourseForm);
  const [updateCourseForm, setUpdateCourseForm] = useState<UpdateCourseForm>(initialUpdateCourseForm);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [courseActionLoadingId, setCourseActionLoadingId] = useState<string | null>(null);
  const [showPublishChecklistModal, setShowPublishChecklistModal] = useState(false);
  const [publishChecklist, setPublishChecklist] = useState<CoursePublishChecklist | null>(null);
  const [publishTargetCourse, setPublishTargetCourse] = useState<AdminCourse | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [isForcePublishing, setIsForcePublishing] = useState(false);
  const [publishChecklistError, setPublishChecklistError] = useState<string | null>(null);

  const loadSystemHealth = useCallback(async () => {
    setServicesLoading(true);
    try {
      const response = await getSystemHealth();
      setSystemHealth(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load system health';
      setFeedback({ type: 'error', message });
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await getAdminUsers({
        query: userQuery || undefined,
        role: userRoleFilter === 'ALL' ? undefined : userRoleFilter,
        page: usersPage,
        size: 20,
      });
      setUsers(response.content);
      setUsersTotalPages(response.totalPages);
      setUsersTotalElements(response.totalElements);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load users';
      setFeedback({ type: 'error', message });
    } finally {
      setUsersLoading(false);
    }
  }, [userQuery, userRoleFilter, usersPage]);

  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const response = await getAdminCourses({ page: coursesPage, size: 20 });
      setCourses(response.content);
      setCoursesTotalPages(response.totalPages);
      setCoursesTotalElements(response.totalElements);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load courses';
      setFeedback({ type: 'error', message });
    } finally {
      setCoursesLoading(false);
    }
  }, [coursesPage]);

  useEffect(() => { if (activeTab === 'services') void loadSystemHealth(); }, [activeTab, loadSystemHealth]);
  useEffect(() => { if (activeTab === 'users') void loadUsers(); }, [activeTab, loadUsers]);
  useEffect(() => { if (activeTab === 'courses') void loadCourses(); }, [activeTab, loadCourses]);

  const startEditingUser = (user: AdminUser) => {
    setEditingUser(user);
    setUpdateUserForm({
      displayName: user.displayName ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      bio: user.bio ?? '',
      locale: user.locale ?? 'UK',
      theme: user.theme === 'dark' ? 'dark' : 'light',
    });
  };

  const submitCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await createAdminUser({
        email: createUserForm.email.trim(),
        password: createUserForm.password,
        displayName: toOptionalString(createUserForm.displayName),
        firstName: toOptionalString(createUserForm.firstName),
        lastName: toOptionalString(createUserForm.lastName),
        studentId: toOptionalString(createUserForm.studentId),
        role: createUserForm.role,
        locale: createUserForm.locale,
      });
      setCreateUserForm(initialCreateUserForm);
      setFeedback({ type: 'success', message: 'User created.' });
      await loadUsers();
    } catch (error) {
      const axiosErr = error as import('axios').AxiosError<{ message?: string; details?: Record<string, string> }>;
      const data = axiosErr?.response?.data;
      let message = 'Failed to create user';
      if (data?.details) {
        message = Object.entries(data.details).map(([k, v]) => `${k}: ${v}`).join('; ');
      } else if (data?.message) {
        message = data.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setFeedback({ type: 'error', message });
    }
  };

  const submitUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;
    setFeedback(null);
    try {
      await updateAdminUser(editingUser.id, {
        displayName: toOptionalString(updateUserForm.displayName),
        firstName: toOptionalString(updateUserForm.firstName),
        lastName: toOptionalString(updateUserForm.lastName),
        bio: toOptionalString(updateUserForm.bio),
        locale: updateUserForm.locale,
        theme: updateUserForm.theme,
      });
      setFeedback({ type: 'success', message: 'User updated.' });
      setEditingUser(null);
      setUpdateUserForm(initialUpdateUserForm);
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user';
      setFeedback({ type: 'error', message });
    }
  };

  const toggleUserActive = async (user: AdminUser) => {
    setFeedback(null);
    setUserActionLoadingId(user.id);
    try {
      if (user.isActive) await deactivateAdminUser(user.id);
      else await activateAdminUser(user.id);
      setFeedback({ type: 'success', message: user.isActive ? 'User deactivated.' : 'User activated.' });
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change user status';
      setFeedback({ type: 'error', message });
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const removeUser = async (user: AdminUser) => {
    if (!window.confirm(`Delete user ${user.email}?`)) return;
    setFeedback(null);
    setUserActionLoadingId(user.id);
    try {
      await deleteAdminUser(user.id);
      setFeedback({ type: 'success', message: 'User deleted.' });
      if (editingUser?.id === user.id) { setEditingUser(null); setUpdateUserForm(initialUpdateUserForm); }
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      setFeedback({ type: 'error', message });
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const submitCreateCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const maxStudents = createCourseForm.maxStudents.trim();
    const maxStudentsNumber = maxStudents ? Number(maxStudents) : undefined;
    if (maxStudentsNumber !== undefined && Number.isNaN(maxStudentsNumber)) {
      setFeedback({ type: 'error', message: 'Max students must be a valid number.' });
      return;
    }
    try {
      await createAdminCourse({
        code: createCourseForm.code.trim().toUpperCase(),
        titleUk: createCourseForm.titleUk.trim(),
        titleEn: toOptionalString(createCourseForm.titleEn),
        descriptionUk: toOptionalString(createCourseForm.descriptionUk),
        descriptionEn: toOptionalString(createCourseForm.descriptionEn),
        visibility: createCourseForm.visibility,
        maxStudents: maxStudentsNumber,
        isPublished: createCourseForm.isPublished,
      });
      setCreateCourseForm(initialCreateCourseForm);
      setFeedback({ type: 'success', message: 'Course created.' });
      await loadCourses();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create course';
      setFeedback({ type: 'error', message });
    }
  };

  const startEditingCourse = (course: AdminCourse) => {
    setEditingCourse(course);
    setUpdateCourseForm({
      titleUk: course.titleUk ?? '',
      titleEn: course.titleEn ?? '',
      descriptionUk: course.descriptionUk ?? '',
      descriptionEn: course.descriptionEn ?? '',
      visibility: course.visibility,
      maxStudents: course.maxStudents ? String(course.maxStudents) : '',
      isPublished: Boolean(course.isPublished),
    });
  };

  const submitUpdateCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCourse) return;
    const maxStudents = updateCourseForm.maxStudents.trim();
    const maxStudentsNumber = maxStudents ? Number(maxStudents) : undefined;
    if (maxStudentsNumber !== undefined && Number.isNaN(maxStudentsNumber)) {
      setFeedback({ type: 'error', message: 'Max students must be a valid number.' });
      return;
    }
    setFeedback(null);
    try {
      await updateAdminCourse(editingCourse.id, {
        titleUk: toOptionalString(updateCourseForm.titleUk),
        titleEn: toOptionalString(updateCourseForm.titleEn),
        descriptionUk: toOptionalString(updateCourseForm.descriptionUk),
        descriptionEn: toOptionalString(updateCourseForm.descriptionEn),
        visibility: updateCourseForm.visibility,
        maxStudents: maxStudentsNumber,
        isPublished: updateCourseForm.isPublished,
      });
      setFeedback({ type: 'success', message: 'Course updated.' });
      setEditingCourse(null);
      setUpdateCourseForm(initialUpdateCourseForm);
      await loadCourses();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update course';
      setFeedback({ type: 'error', message });
    }
  };

  const toggleCoursePublished = async (course: AdminCourse) => {
    setFeedback(null);
    setCourseActionLoadingId(course.id);
    try {
      if (course.isPublished) await unpublishAdminCourse(course.id);
      else await publishAdminCourse(course.id);
      setFeedback({ type: 'success', message: course.isPublished ? 'Course unpublished.' : 'Course published.' });
      await loadCourses();
    } catch (error) {
      const conflictStatus = (error as { response?: { status?: number } })?.response?.status;
      const checklist = (
        error as { response?: { data?: { checklist?: CoursePublishChecklist } } }
      )?.response?.data?.checklist;

      if (!course.isPublished && conflictStatus === 409 && checklist) {
        setPublishTargetCourse(course);
        setPublishChecklist(checklist);
        setOverrideReason('');
        setPublishChecklistError(null);
        setShowPublishChecklistModal(true);
      } else {
        const message = extractErrorMessage(error);
        setFeedback({ type: 'error', message });
      }
    } finally {
      setCourseActionLoadingId(null);
    }
  };

  const closePublishChecklistModal = useCallback(() => {
    if (isForcePublishing) return;
    setShowPublishChecklistModal(false);
    setPublishChecklist(null);
    setPublishTargetCourse(null);
    setOverrideReason('');
    setPublishChecklistError(null);
  }, [isForcePublishing]);

  const forcePublishCourse = useCallback(async () => {
    if (!publishTargetCourse) return;
    if (!overrideReason.trim()) {
      setPublishChecklistError('Override reason is required.');
      return;
    }

    setIsForcePublishing(true);
    setPublishChecklistError(null);
    try {
      await publishAdminCourse(publishTargetCourse.id, {
        forcePublish: true,
        overrideReason: overrideReason.trim(),
      });
      setFeedback({ type: 'success', message: 'Course published with checklist override.' });
      closePublishChecklistModal();
      await loadCourses();
    } catch (error) {
      setPublishChecklistError(extractErrorMessage(error));
    } finally {
      setIsForcePublishing(false);
    }
  }, [closePublishChecklistModal, loadCourses, overrideReason, publishTargetCourse]);

  const removeCourse = async (course: AdminCourse) => {
    if (!window.confirm(`Delete course ${course.code}?`)) return;
    setFeedback(null);
    setCourseActionLoadingId(course.id);
    try {
      await deleteAdminCourse(course.id);
      setFeedback({ type: 'success', message: 'Course deleted.' });
      if (editingCourse?.id === course.id) { setEditingCourse(null); setUpdateCourseForm(initialUpdateCourseForm); }
      await loadCourses();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete course';
      setFeedback({ type: 'error', message });
    } finally {
      setCourseActionLoadingId(null);
    }
  };

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
  }, []);

  const tabs: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: 'users', label: 'Users', icon: UserGroupIcon },
    { key: 'courses', label: 'Courses', icon: BookOpenIcon },
    { key: 'course-manager', label: 'Course Manager', icon: WrenchScrewdriverIcon },
    { key: 'import-export', label: 'Import / Export', icon: ArrowUpTrayIcon },
    { key: 'analytics', label: 'Analytics', icon: ServerIcon },
    { key: 'services', label: 'Services', icon: ServerIcon },
    { key: 'plugins', label: 'Plugins', icon: PuzzlePieceIcon },
    { key: 'test-lab', label: 'Test Lab', icon: BeakerIcon },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Admin
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Full system control — courses, users, services, import/export
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'services') void loadSystemHealth();
              else if (activeTab === 'users') void loadUsers();
              else if (activeTab === 'courses') void loadCourses();
            }}
            className="btn btn-secondary btn-sm"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className="rounded-md px-3 py-2 text-sm"
            style={{
              background: feedback.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
              color: feedback.type === 'success' ? 'var(--fn-success)' : 'var(--fn-error)',
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid var(--border-default)' }}>
          <nav className="-mb-px flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="pb-2.5 text-sm font-medium transition-colors flex items-center gap-1.5"
                style={{
                  borderBottom: activeTab === tab.key ? '1px solid var(--text-primary)' : '1px solid transparent',
                  color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <TabTransition tabKey={activeTab}>
          {activeTab === 'users' && (
            <AdminUsersTab
              createUserForm={createUserForm} setCreateUserForm={setCreateUserForm} submitCreateUser={submitCreateUser}
              editingUser={editingUser} setEditingUser={setEditingUser}
              updateUserForm={updateUserForm} setUpdateUserForm={setUpdateUserForm} submitUpdateUser={submitUpdateUser}
              users={users} usersLoading={usersLoading}
              usersPage={usersPage} setUsersPage={setUsersPage}
              usersTotalPages={usersTotalPages} usersTotalElements={usersTotalElements}
              userSearchInput={userSearchInput} setUserSearchInput={setUserSearchInput}
              userRoleFilter={userRoleFilter} setUserRoleFilter={setUserRoleFilter} setUserQuery={setUserQuery}
              userActionLoadingId={userActionLoadingId}
              onStartEditingUser={startEditingUser} onToggleUserActive={toggleUserActive} onRemoveUser={removeUser}
            />
          )}

          {activeTab === 'courses' && (
            <AdminCoursesTab
              createCourseForm={createCourseForm} setCreateCourseForm={setCreateCourseForm} submitCreateCourse={submitCreateCourse}
              editingCourse={editingCourse} setEditingCourse={setEditingCourse}
              updateCourseForm={updateCourseForm} setUpdateCourseForm={setUpdateCourseForm} submitUpdateCourse={submitUpdateCourse}
              courses={courses} coursesLoading={coursesLoading}
              coursesPage={coursesPage} setCoursesPage={setCoursesPage}
              coursesTotalPages={coursesTotalPages} coursesTotalElements={coursesTotalElements}
              courseSearchInput={courseSearchInput} setCourseSearchInput={setCourseSearchInput}
              courseActionLoadingId={courseActionLoadingId}
              onStartEditingCourse={startEditingCourse} onToggleCoursePublished={toggleCoursePublished} onRemoveCourse={removeCourse}
            />
          )}

          {activeTab === 'course-manager' && (
            <AdminCourseManagerTab onFeedback={showFeedback} />
          )}

          {activeTab === 'import-export' && (
            <AdminImportExportTab onFeedback={showFeedback} />
          )}

          {activeTab === 'services' && (
            <AdminServicesTab servicesLoading={servicesLoading} systemHealth={systemHealth} />
          )}

          {activeTab === 'analytics' && (
            <AdminAnalyticsTab onFeedback={showFeedback} />
          )}

          {activeTab === 'plugins' && (
            <AdminPluginsTab onFeedback={showFeedback} />
          )}

          {activeTab === 'test-lab' && (
            <AdminTestLabTab onFeedback={showFeedback} />
          )}
        </TabTransition>
      </div>

      <Modal
        isOpen={showPublishChecklistModal}
        onClose={closePublishChecklistModal}
        title="Course Publish Checklist"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Complete all required checks before publishing this course.
          </p>

          <div className="space-y-2">
            {(publishChecklist?.items || []).map((item) => (
              <div
                key={item.key}
                className="rounded-md p-3"
                style={{
                  border: `1px solid ${item.passed ? 'rgba(34,197,94,0.25)' : 'rgba(248,113,113,0.25)'}`,
                  background: item.passed ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.08)',
                }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                {item.details && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.details}</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Override reason
            </label>
            <textarea
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              rows={3}
              className="input w-full"
              placeholder="Provide reason for force publishing"
            />
          </div>

          {publishChecklistError && (
            <p className="text-sm" style={{ color: 'var(--fn-error)' }}>
              {publishChecklistError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={closePublishChecklistModal}
              disabled={isForcePublishing}
            >
              Close
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void forcePublishCourse();
              }}
              isLoading={isForcePublishing}
            >
              Force Publish
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default AdminDashboard;
