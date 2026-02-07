import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Loading } from '../components/Loading';
import {
  activateAdminUser,
  AdminCourse,
  AdminCourseVisibility,
  AdminUser,
  AdminUserLocale,
  AdminUserRole,
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
import {
  ArrowPathIcon,
  BookOpenIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  ServerIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

type AdminTab = 'services' | 'users' | 'courses';

type Feedback = {
  type: 'success' | 'error';
  message: string;
} | null;

interface CreateUserForm {
  email: string;
  password: string;
  displayName: string;
  firstName: string;
  lastName: string;
  studentId: string;
  role: AdminUserRole;
  locale: AdminUserLocale;
}

interface UpdateUserForm {
  displayName: string;
  firstName: string;
  lastName: string;
  bio: string;
  locale: AdminUserLocale;
  theme: 'light' | 'dark';
}

interface CreateCourseForm {
  code: string;
  titleUk: string;
  titleEn: string;
  descriptionUk: string;
  descriptionEn: string;
  visibility: AdminCourseVisibility;
  maxStudents: string;
  isPublished: boolean;
}

interface UpdateCourseForm {
  titleUk: string;
  titleEn: string;
  descriptionUk: string;
  descriptionEn: string;
  visibility: AdminCourseVisibility;
  maxStudents: string;
  isPublished: boolean;
}

const initialCreateUserForm: CreateUserForm = {
  email: '',
  password: '',
  displayName: '',
  firstName: '',
  lastName: '',
  studentId: '',
  role: 'STUDENT',
  locale: 'UK',
};

const initialUpdateUserForm: UpdateUserForm = {
  displayName: '',
  firstName: '',
  lastName: '',
  bio: '',
  locale: 'UK',
  theme: 'light',
};

const initialCreateCourseForm: CreateCourseForm = {
  code: '',
  titleUk: '',
  titleEn: '',
  descriptionUk: '',
  descriptionEn: '',
  visibility: 'PRIVATE',
  maxStudents: '',
  isPublished: false,
};

const initialUpdateCourseForm: UpdateCourseForm = {
  titleUk: '',
  titleEn: '',
  descriptionUk: '',
  descriptionEn: '',
  visibility: 'PRIVATE',
  maxStudents: '',
  isPublished: false,
};

const toOptionalString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const formatDate = (value?: string): string => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const displayUserName = (user: AdminUser): string => {
  if (user.displayName && user.displayName.trim().length > 0) {
    return user.displayName;
  }
  const firstLast = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return firstLast.length > 0 ? firstLast : user.email;
};

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
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | AdminUserRole>('ALL');
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

  useEffect(() => {
    if (activeTab === 'services') {
      loadSystemHealth();
    }
  }, [activeTab, loadSystemHealth]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === 'courses') {
      loadCourses();
    }
  }, [activeTab, loadCourses]);

  const filteredCourses = useMemo(() => {
    const search = courseSearchInput.trim().toLowerCase();
    if (!search) {
      return courses;
    }

    return courses.filter((course) => {
      const title = `${course.titleUk ?? ''} ${course.titleEn ?? ''}`.toLowerCase();
      return course.code.toLowerCase().includes(search) || title.includes(search);
    });
  }, [courseSearchInput, courses]);

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
      const message = error instanceof Error ? error.message : 'Failed to create user';
      setFeedback({ type: 'error', message });
    }
  };

  const submitUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) {
      return;
    }

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
      if (user.isActive) {
        await deactivateAdminUser(user.id);
      } else {
        await activateAdminUser(user.id);
      }
      setFeedback({
        type: 'success',
        message: user.isActive ? 'User deactivated.' : 'User activated.',
      });
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change user status';
      setFeedback({ type: 'error', message });
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const removeUser = async (user: AdminUser) => {
    const confirmed = window.confirm(`Delete user ${user.email}?`);
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setUserActionLoadingId(user.id);

    try {
      await deleteAdminUser(user.id);
      setFeedback({ type: 'success', message: 'User deleted.' });
      if (editingUser?.id === user.id) {
        setEditingUser(null);
        setUpdateUserForm(initialUpdateUserForm);
      }
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
    if (!editingCourse) {
      return;
    }

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
      if (course.isPublished) {
        await unpublishAdminCourse(course.id);
      } else {
        await publishAdminCourse(course.id);
      }
      setFeedback({
        type: 'success',
        message: course.isPublished ? 'Course unpublished.' : 'Course published.',
      });
      await loadCourses();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change course state';
      setFeedback({ type: 'error', message });
    } finally {
      setCourseActionLoadingId(null);
    }
  };

  const removeCourse = async (course: AdminCourse) => {
    const confirmed = window.confirm(`Delete course ${course.code}?`);
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setCourseActionLoadingId(course.id);

    try {
      await deleteAdminCourse(course.id);
      setFeedback({ type: 'success', message: 'Course deleted.' });
      if (editingCourse?.id === course.id) {
        setEditingCourse(null);
        setUpdateCourseForm(initialUpdateCourseForm);
      }
      await loadCourses();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete course';
      setFeedback({ type: 'error', message });
    } finally {
      setCourseActionLoadingId(null);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Control Center</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage services, users, and courses from one panel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'services') {
                  void loadSystemHealth();
                } else if (activeTab === 'users') {
                  void loadUsers();
                } else {
                  void loadCourses();
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {feedback && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200'
                  : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex flex-wrap gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === 'users'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5" />
                  Users
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('courses')}
                className={`border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === 'courses'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpenIcon className="h-5 w-5" />
                  Courses
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('services')}
                className={`border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === 'services'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <ServerIcon className="h-5 w-5" />
                  Services
                </span>
              </button>
            </nav>
          </div>

          {activeTab === 'users' && (
            <div className="space-y-6">
              <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create User</h2>
                <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitCreateUser}>
                  <input
                    type="email"
                    required
                    value={createUserForm.email}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="password"
                    required
                    value={createUserForm.password}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Password"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="text"
                    value={createUserForm.displayName}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, displayName: event.target.value }))}
                    placeholder="Display name"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="text"
                    value={createUserForm.studentId}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, studentId: event.target.value }))}
                    placeholder="Student ID"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="text"
                    value={createUserForm.firstName}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    placeholder="First name"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="text"
                    value={createUserForm.lastName}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    placeholder="Last name"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <select
                    value={createUserForm.role}
                    onChange={(event) =>
                      setCreateUserForm((prev) => ({
                        ...prev,
                        role: event.target.value as AdminUserRole,
                      }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TA">TA</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="SUPERADMIN">Super Admin</option>
                  </select>
                  <select
                    value={createUserForm.locale}
                    onChange={(event) =>
                      setCreateUserForm((prev) => ({
                        ...prev,
                        locale: event.target.value as AdminUserLocale,
                      }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="UK">UK</option>
                    <option value="EN">EN</option>
                  </select>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                      Create User
                    </button>
                  </div>
                </form>
              </section>

              {editingUser && (
                <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Edit User: {editingUser.email}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(null);
                        setUpdateUserForm(initialUpdateUserForm);
                      }}
                      className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitUpdateUser}>
                    <input
                      type="text"
                      value={updateUserForm.displayName}
                      onChange={(event) => setUpdateUserForm((prev) => ({ ...prev, displayName: event.target.value }))}
                      placeholder="Display name"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      type="text"
                      value={updateUserForm.bio}
                      onChange={(event) => setUpdateUserForm((prev) => ({ ...prev, bio: event.target.value }))}
                      placeholder="Bio"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      type="text"
                      value={updateUserForm.firstName}
                      onChange={(event) => setUpdateUserForm((prev) => ({ ...prev, firstName: event.target.value }))}
                      placeholder="First name"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      type="text"
                      value={updateUserForm.lastName}
                      onChange={(event) => setUpdateUserForm((prev) => ({ ...prev, lastName: event.target.value }))}
                      placeholder="Last name"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <select
                      value={updateUserForm.locale}
                      onChange={(event) =>
                        setUpdateUserForm((prev) => ({
                          ...prev,
                          locale: event.target.value as AdminUserLocale,
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <option value="UK">UK</option>
                      <option value="EN">EN</option>
                    </select>
                    <select
                      value={updateUserForm.theme}
                      onChange={(event) =>
                        setUpdateUserForm((prev) => ({
                          ...prev,
                          theme: event.target.value as 'light' | 'dark',
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                        Save User
                      </button>
                    </div>
                  </form>
                </section>
              )}

              <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-800">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="text"
                    value={userSearchInput}
                    onChange={(event) => setUserSearchInput(event.target.value)}
                    placeholder="Search by email/name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 md:max-w-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  <select
                    value={userRoleFilter}
                    onChange={(event) => {
                      setUsersPage(0);
                      setUserRoleFilter(event.target.value as 'ALL' | AdminUserRole);
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="ALL">All roles</option>
                    <option value="STUDENT">Student</option>
                    <option value="TA">TA</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="SUPERADMIN">Super Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setUsersPage(0);
                      setUserQuery(userSearchInput.trim());
                    }}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                  >
                    Search
                  </button>
                </div>

                <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">
                  Total users: {usersTotalElements}
                </div>

                {usersLoading ? (
                  <Loading />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                          <th className="px-4 py-2">User</th>
                          <th className="px-4 py-2">Role</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Created</th>
                          <th className="px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">{displayUserName(user)}</div>
                              <div className="text-gray-500 dark:text-gray-400">{user.email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{user.role}</td>
                            <td className="px-4 py-3 text-sm">
                              {user.isActive ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                  <CheckCircleIcon className="h-4 w-4" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-200">
                                  <XCircleIcon className="h-4 w-4" />
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(user.createdAt)}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditingUser(user)}
                                  className="rounded-md bg-blue-100 px-2 py-1 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void toggleUserActive(user);
                                  }}
                                  disabled={userActionLoadingId === user.id}
                                  className="rounded-md bg-amber-100 px-2 py-1 text-amber-700 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-200"
                                >
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void removeUser(user);
                                  }}
                                  disabled={userActionLoadingId === user.id}
                                  className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-200"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={usersPage <= 0}
                    onClick={() => setUsersPage((prev) => prev - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Page {usersPage + 1} / {Math.max(usersTotalPages, 1)}
                  </span>
                  <button
                    type="button"
                    disabled={usersPage + 1 >= usersTotalPages}
                    onClick={() => setUsersPage((prev) => prev + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
                  >
                    Next
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-6">
              <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Course</h2>
                <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitCreateCourse}>
                  <input
                    type="text"
                    required
                    value={createCourseForm.code}
                    onChange={(event) => setCreateCourseForm((prev) => ({ ...prev, code: event.target.value }))}
                    placeholder="Course code (e.g. CS101)"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <select
                    value={createCourseForm.visibility}
                    onChange={(event) =>
                      setCreateCourseForm((prev) => ({
                        ...prev,
                        visibility: event.target.value as AdminCourseVisibility,
                      }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="PRIVATE">Private</option>
                    <option value="PUBLIC">Public</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={createCourseForm.titleUk}
                    onChange={(event) => setCreateCourseForm((prev) => ({ ...prev, titleUk: event.target.value }))}
                    placeholder="Title (UK)"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="text"
                    value={createCourseForm.titleEn}
                    onChange={(event) => setCreateCourseForm((prev) => ({ ...prev, titleEn: event.target.value }))}
                    placeholder="Title (EN)"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="text"
                    value={createCourseForm.descriptionUk}
                    onChange={(event) =>
                      setCreateCourseForm((prev) => ({
                        ...prev,
                        descriptionUk: event.target.value,
                      }))
                    }
                    placeholder="Description (UK)"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="text"
                    value={createCourseForm.descriptionEn}
                    onChange={(event) =>
                      setCreateCourseForm((prev) => ({
                        ...prev,
                        descriptionEn: event.target.value,
                      }))
                    }
                    placeholder="Description (EN)"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <input
                    type="number"
                    min={1}
                    value={createCourseForm.maxStudents}
                    onChange={(event) =>
                      setCreateCourseForm((prev) => ({
                        ...prev,
                        maxStudents: event.target.value,
                      }))
                    }
                    placeholder="Max students"
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                    <input
                      type="checkbox"
                      checked={createCourseForm.isPublished}
                      onChange={(event) =>
                        setCreateCourseForm((prev) => ({
                          ...prev,
                          isPublished: event.target.checked,
                        }))
                      }
                    />
                    Publish immediately
                  </label>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                      Create Course
                    </button>
                  </div>
                </form>
              </section>

              {editingCourse && (
                <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Edit Course: {editingCourse.code}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourse(null);
                        setUpdateCourseForm(initialUpdateCourseForm);
                      }}
                      className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitUpdateCourse}>
                    <input
                      type="text"
                      value={updateCourseForm.titleUk}
                      onChange={(event) =>
                        setUpdateCourseForm((prev) => ({
                          ...prev,
                          titleUk: event.target.value,
                        }))
                      }
                      placeholder="Title (UK)"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      type="text"
                      value={updateCourseForm.titleEn}
                      onChange={(event) =>
                        setUpdateCourseForm((prev) => ({
                          ...prev,
                          titleEn: event.target.value,
                        }))
                      }
                      placeholder="Title (EN)"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      type="text"
                      value={updateCourseForm.descriptionUk}
                      onChange={(event) =>
                        setUpdateCourseForm((prev) => ({
                          ...prev,
                          descriptionUk: event.target.value,
                        }))
                      }
                      placeholder="Description (UK)"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      type="text"
                      value={updateCourseForm.descriptionEn}
                      onChange={(event) =>
                        setUpdateCourseForm((prev) => ({
                          ...prev,
                          descriptionEn: event.target.value,
                        }))
                      }
                      placeholder="Description (EN)"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <select
                      value={updateCourseForm.visibility}
                      onChange={(event) =>
                        setUpdateCourseForm((prev) => ({
                          ...prev,
                          visibility: event.target.value as AdminCourseVisibility,
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <option value="PRIVATE">Private</option>
                      <option value="PUBLIC">Public</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={updateCourseForm.maxStudents}
                      onChange={(event) =>
                        setUpdateCourseForm((prev) => ({
                          ...prev,
                          maxStudents: event.target.value,
                        }))
                      }
                      placeholder="Max students"
                      className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                      <input
                        type="checkbox"
                        checked={updateCourseForm.isPublished}
                        onChange={(event) =>
                          setUpdateCourseForm((prev) => ({
                            ...prev,
                            isPublished: event.target.checked,
                          }))
                        }
                      />
                      Mark as published in update payload
                    </label>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                        Save Course
                      </button>
                    </div>
                  </form>
                </section>
              )}

              <section className="rounded-xl bg-white p-5 shadow dark:bg-gray-800">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <input
                    type="text"
                    value={courseSearchInput}
                    onChange={(event) => setCourseSearchInput(event.target.value)}
                    placeholder="Filter by code/title"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 md:max-w-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  <div className="text-sm text-gray-600 dark:text-gray-300">Total courses: {coursesTotalElements}</div>
                </div>

                {coursesLoading ? (
                  <Loading />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                          <th className="px-4 py-2">Course</th>
                          <th className="px-4 py-2">Owner</th>
                          <th className="px-4 py-2">Visibility</th>
                          <th className="px-4 py-2">Published</th>
                          <th className="px-4 py-2">Members</th>
                          <th className="px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredCourses.map((course) => (
                          <tr key={course.id}>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">{course.code}</div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {course.titleUk || course.titleEn || 'Untitled'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              {course.ownerName || course.ownerId || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{course.visibility}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {course.isPublished ? 'Yes' : 'No'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {course.memberCount ?? course.currentEnrollment ?? 0}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditingCourse(course)}
                                  className="rounded-md bg-blue-100 px-2 py-1 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void toggleCoursePublished(course);
                                  }}
                                  disabled={courseActionLoadingId === course.id}
                                  className="rounded-md bg-amber-100 px-2 py-1 text-amber-700 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-200"
                                >
                                  {course.isPublished ? 'Unpublish' : 'Publish'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void removeCourse(course);
                                  }}
                                  disabled={courseActionLoadingId === course.id}
                                  className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-200"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={coursesPage <= 0}
                    onClick={() => setCoursesPage((prev) => prev - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Page {coursesPage + 1} / {Math.max(coursesTotalPages, 1)}
                  </span>
                  <button
                    type="button"
                    disabled={coursesPage + 1 >= coursesTotalPages}
                    onClick={() => setCoursesPage((prev) => prev + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-700"
                  >
                    Next
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'services' && (
            <section className="space-y-4 rounded-xl bg-white p-5 shadow dark:bg-gray-800">
              {servicesLoading && !systemHealth ? (
                <Loading />
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Overall</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">
                        {systemHealth?.overallStatus ?? 'UNKNOWN'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total services</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">
                        {systemHealth?.totalServices ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Healthy</p>
                      <p className="text-xl font-semibold text-green-600">{systemHealth?.healthyServices ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Unhealthy</p>
                      <p className="text-xl font-semibold text-red-600">{systemHealth?.unhealthyServices ?? 0}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                          <th className="px-4 py-2">Service</th>
                          <th className="px-4 py-2">Instance</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Host</th>
                          <th className="px-4 py-2">Port</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {(systemHealth?.services ?? []).map((service) => (
                          <tr key={`${service.serviceName}-${service.instanceId}-${service.host}-${service.port}`}>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{service.serviceName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{service.instanceId}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{service.status}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{service.host}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{service.port}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    Updated: {formatDate(systemHealth?.timestamp)}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
