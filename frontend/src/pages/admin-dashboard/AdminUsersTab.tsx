import React from 'react';
import {
  CheckCircleIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { AdminUser } from '../../api/admin';
import { Loading } from '../../components/Loading';
import {
  CreateUserForm,
  displayUserName,
  formatDate,
  initialUpdateUserForm,
  UpdateUserForm,
} from './adminDashboardTypes';

const inputClass = 'input';
const selectClass = 'input';

interface AdminUsersTabProps {
  createUserForm: CreateUserForm;
  setCreateUserForm: React.Dispatch<React.SetStateAction<CreateUserForm>>;
  submitCreateUser: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  editingUser: AdminUser | null;
  setEditingUser: React.Dispatch<React.SetStateAction<AdminUser | null>>;
  updateUserForm: UpdateUserForm;
  setUpdateUserForm: React.Dispatch<React.SetStateAction<UpdateUserForm>>;
  submitUpdateUser: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  users: AdminUser[];
  usersLoading: boolean;
  usersPage: number;
  setUsersPage: React.Dispatch<React.SetStateAction<number>>;
  usersTotalPages: number;
  usersTotalElements: number;
  userSearchInput: string;
  setUserSearchInput: React.Dispatch<React.SetStateAction<string>>;
  userRoleFilter: 'ALL' | CreateUserForm['role'];
  setUserRoleFilter: React.Dispatch<React.SetStateAction<'ALL' | CreateUserForm['role']>>;
  setUserQuery: React.Dispatch<React.SetStateAction<string>>;
  userActionLoadingId: string | null;
  onStartEditingUser: (user: AdminUser) => void;
  onToggleUserActive: (user: AdminUser) => Promise<void>;
  onRemoveUser: (user: AdminUser) => Promise<void>;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  createUserForm, setCreateUserForm, submitCreateUser,
  editingUser, setEditingUser, updateUserForm, setUpdateUserForm, submitUpdateUser,
  users, usersLoading, usersPage, setUsersPage, usersTotalPages, usersTotalElements,
  userSearchInput, setUserSearchInput, userRoleFilter, setUserRoleFilter, setUserQuery,
  userActionLoadingId, onStartEditingUser, onToggleUserActive, onRemoveUser,
}) => (
  <div className="space-y-4">
    {/* Create User */}
    <section className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Create User</h2>
      <form className="grid gap-2.5 md:grid-cols-2" onSubmit={submitCreateUser}>
        <input type="email" required value={createUserForm.email} onChange={(e) => setCreateUserForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className={inputClass} />
        <input type="password" required value={createUserForm.password} onChange={(e) => setCreateUserForm(p => ({ ...p, password: e.target.value }))} placeholder="Password" className={inputClass} />
        <input type="text" value={createUserForm.displayName} onChange={(e) => setCreateUserForm(p => ({ ...p, displayName: e.target.value }))} placeholder="Display name" className={inputClass} />
        <input type="text" value={createUserForm.studentId} onChange={(e) => setCreateUserForm(p => ({ ...p, studentId: e.target.value }))} placeholder="Student ID" className={inputClass} />
        <input type="text" value={createUserForm.firstName} onChange={(e) => setCreateUserForm(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" className={inputClass} />
        <input type="text" value={createUserForm.lastName} onChange={(e) => setCreateUserForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className={inputClass} />
        <select value={createUserForm.role} onChange={(e) => setCreateUserForm(p => ({ ...p, role: e.target.value as CreateUserForm['role'] }))} className={selectClass}>
          <option value="STUDENT">Student</option>
          <option value="TA">TA</option>
          <option value="TEACHER">Teacher</option>
          <option value="SUPERADMIN">Super Admin</option>
        </select>
        <select value={createUserForm.locale} onChange={(e) => setCreateUserForm(p => ({ ...p, locale: e.target.value as CreateUserForm['locale'] }))} className={selectClass}>
          <option value="UK">UK</option>
          <option value="EN">EN</option>
        </select>
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm">
            <PlusCircleIcon className="h-4 w-4" />
            Create
          </button>
        </div>
      </form>
    </section>

    {/* Edit User */}
    {editingUser && (
      <section className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Edit: {editingUser.email}</h2>
          <button type="button" onClick={() => { setEditingUser(null); setUpdateUserForm(initialUpdateUserForm); }} className="btn btn-ghost btn-sm">Cancel</button>
        </div>
        <form className="grid gap-2.5 md:grid-cols-2" onSubmit={submitUpdateUser}>
          <input type="text" value={updateUserForm.displayName} onChange={(e) => setUpdateUserForm(p => ({ ...p, displayName: e.target.value }))} placeholder="Display name" className={inputClass} />
          <input type="text" value={updateUserForm.bio} onChange={(e) => setUpdateUserForm(p => ({ ...p, bio: e.target.value }))} placeholder="Bio" className={inputClass} />
          <input type="text" value={updateUserForm.firstName} onChange={(e) => setUpdateUserForm(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" className={inputClass} />
          <input type="text" value={updateUserForm.lastName} onChange={(e) => setUpdateUserForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className={inputClass} />
          <select value={updateUserForm.locale} onChange={(e) => setUpdateUserForm(p => ({ ...p, locale: e.target.value as UpdateUserForm['locale'] }))} className={selectClass}>
            <option value="UK">UK</option>
            <option value="EN">EN</option>
          </select>
          <select value={updateUserForm.theme} onChange={(e) => setUpdateUserForm(p => ({ ...p, theme: e.target.value as UpdateUserForm['theme'] }))} className={selectClass}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm">
              <PencilSquareIcon className="h-4 w-4" />
              Save
            </button>
          </div>
        </form>
      </section>
    )}

    {/* Users list */}
    <section className="rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="p-4 flex flex-col gap-2.5 md:flex-row md:items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={userSearchInput} onChange={(e) => setUserSearchInput(e.target.value)} placeholder="Search by email/name" className="input w-full md:max-w-xs" />
        <select value={userRoleFilter} onChange={(e) => { setUsersPage(0); setUserRoleFilter(e.target.value as 'ALL' | CreateUserForm['role']); }} className="input w-auto">
          <option value="ALL">All roles</option>
          <option value="STUDENT">Student</option>
          <option value="TA">TA</option>
          <option value="TEACHER">Teacher</option>
          <option value="SUPERADMIN">Super Admin</option>
        </select>
        <button type="button" onClick={() => { setUsersPage(0); setUserQuery(userSearchInput.trim()); }} className="btn btn-primary btn-sm">Search</button>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{usersTotalElements} users</span>
      </div>

      {usersLoading ? (
        <div className="p-6"><Loading /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{displayUserName(user)}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</div>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    {user.isActive ? (
                      <span className="badge badge-success"><CheckCircleIcon className="h-3 w-3" /> Active</span>
                    ) : (
                      <span className="badge badge-error"><XCircleIcon className="h-3 w-3" /> Inactive</span>
                    )}
                  </td>
                  <td className="text-xs">{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => onStartEditingUser(user)} className="btn btn-secondary btn-sm">Edit</button>
                      <button type="button" onClick={() => { void onToggleUserActive(user); }} disabled={userActionLoadingId === user.id} className="btn btn-ghost btn-sm">
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button type="button" onClick={() => { void onRemoveUser(user); }} disabled={userActionLoadingId === user.id} className="btn btn-danger btn-sm">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="p-3 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button type="button" disabled={usersPage <= 0} onClick={() => setUsersPage(p => p - 1)} className="btn btn-ghost btn-sm">Prev</button>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{usersPage + 1} / {Math.max(usersTotalPages, 1)}</span>
        <button type="button" disabled={usersPage + 1 >= usersTotalPages} onClick={() => setUsersPage(p => p + 1)} className="btn btn-ghost btn-sm">Next</button>
      </div>
    </section>
  </div>
);
