'use client';

import React, { useState } from 'react';
import {
  UserPlusIcon,
  ArrowUpTrayIcon,
  UserGroupIcon,
  TrashIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import {
  useCourseMembers,
  useAddCourseMember,
  useUpdateCourseMember,
  useRemoveCourseMember,
  useCourseEnrollmentGroups,
  useEnrollmentGroups,
  useEnrollGroupToCourse,
  useRemoveCourseEnrollmentGroup,
  useBulkEnrollPreview,
  useBulkEnrollConfirm,
} from '@/features/courses/hooks/useCourseQueries';
import type {
  BulkPreviewResponse,
  BulkPreviewResult,
  CourseMemberDto,
  CourseMemberRequest,
} from '@/features/courses/api/canonical.types';
import type { CourseRole, UserProfileDto } from '@/features/users/api/users.types';

interface MembersPanelProps {
  courseId: string;
  currentUser: UserProfileDto | null | undefined;
  permissions: {
    canManageStudents: boolean;
    canManageStaff: boolean;
    canManageCourseContent: boolean;
    canAccessTeacherTools: boolean;
  };
}

type AddMemberRole = 'TEACHER' | 'TA' | 'STUDENT';

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function MembersPanel({
  courseId,
  permissions: { canManageStudents, canManageStaff },
}: MembersPanelProps) {
  const { data: membersPage, isLoading: isMembersLoading } = useCourseMembers(courseId, { size: 200 });
  const members = membersPage?.content ?? [];

  const addMemberMutation = useAddCourseMember(courseId);
  const updateMemberMutation = useUpdateCourseMember(courseId);
  const removeMemberMutation = useRemoveCourseMember(courseId);

  const { data: enrolledGroups, isLoading: isGroupsLoading } = useCourseEnrollmentGroups(courseId);
  const { data: globalGroups } = useEnrollmentGroups();
  const enrollGroupMutation = useEnrollGroupToCourse(courseId);
  const removeGroupMutation = useRemoveCourseEnrollmentGroup(courseId);

  const bulkPreviewMutation = useBulkEnrollPreview(courseId);
  const bulkConfirmMutation = useBulkEnrollConfirm(courseId);

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<AddMemberRole>('STUDENT');

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<BulkPreviewResponse | null>(null);

  const canManageAny = canManageStaff;

  // Split staff and students
  const staffMembers = members.filter(
    (m) => m.roleInCourse === 'OWNER' || m.roleInCourse === 'TEACHER' || m.roleInCourse === 'TA'
  );
  
  const studentMembers = members.filter((m) => m.roleInCourse === 'STUDENT');

  const filteredStudents = studentMembers.filter(
    (m) =>
      (m.userName?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (m.userEmail?.toLowerCase() ?? '').includes(search.toLowerCase())
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    try {
      await addMemberMutation.mutateAsync({
        email: addEmail.trim(),
        roleInCourse: addRole,
      } as unknown as CourseMemberRequest);
      setAddEmail('');
      setIsAddOpen(false);
      alert('Member enrolled successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRoleChange = async (member: CourseMemberDto, newRole: CourseRole) => {
    if (member.roleInCourse === 'OWNER' && !confirm('Are you sure you want to change the owner role? This will transfer ownership.')) {
      return;
    }
    try {
      await updateMemberMutation.mutateAsync({
        userId: member.userId,
        request: {
          userId: member.userId,
          roleInCourse: newRole,
        },
      });
      alert('Role updated successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (member: CourseMemberDto) => {
    if (!confirm(`Are you sure you want to remove ${member.userName || 'this member'} from the course?`)) {
      return;
    }
    try {
      await removeMemberMutation.mutateAsync(member.userId);
      alert('Member removed successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleEnrollGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    try {
      await enrollGroupMutation.mutateAsync(selectedGroupId);
      setSelectedGroupId('');
      setIsGroupOpen(false);
      alert('Group enrolled successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enroll group');
    }
  };

  const handleUnlinkGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to unlink group ${groupName}? Active students enrolled via this group will remain enrolled in the course.`)) {
      return;
    }
    try {
      await removeGroupMutation.mutateAsync(groupId);
      alert('Group unlinked successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unlink group');
    }
  };

  const handleCsvParse = async () => {
    if (!csvText.trim()) return;
    // Parse CSV
    const lines = csvText.split('\n');
    const rows: Array<{ email: string; role: string }> = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(',');
      const email = parts[0]?.trim();
      const role = parts[1]?.trim() || 'STUDENT';
      if (email && email.includes('@')) {
        rows.push({ email, role });
      }
    }

    if (rows.length === 0) {
      alert('No valid email rows found. Format: email,role (one per line)');
      return;
    }

    try {
      const preview = await bulkPreviewMutation.mutateAsync(rows);
      setBulkPreview(preview);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  };

  const handleBulkConfirm = async () => {
    if (!bulkPreview || bulkPreview.validRows.length === 0) return;
    const enrollments = bulkPreview.validRows.flatMap((r) =>
      r.userId ? [{ userId: r.userId, role: r.role }] : []
    );
    try {
      await bulkConfirmMutation.mutateAsync(enrollments);
      alert(`Successfully enrolled ${enrollments.length} members.`);
      setIsBulkOpen(false);
      setCsvText('');
      setBulkPreview(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm bulk enrollment');
    }
  };

  if (isMembersLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Header */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Enrolled</p>
          <p className="text-lg font-bold mt-1">{members.length}</p>
        </div>
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Teaching Staff</p>
          <p className="text-lg font-bold mt-1">{staffMembers.length}</p>
        </div>
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Students</p>
          <p className="text-lg font-bold mt-1">{studentMembers.length}</p>
        </div>
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enrolled Groups</p>
          <p className="text-lg font-bold mt-1">{enrolledGroups?.length ?? 0}</p>
        </div>
      </section>

      {/* Action Bar */}
      {canManageStudents && (
        <section className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Add member</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBulkOpen(true)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            <span>Bulk CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGroupOpen(true)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <UserGroupIcon className="h-4 w-4" />
            <span>Add group</span>
          </button>
        </section>
      )}

      {/* Course Staff Card List */}
      <section className="card">
        <div className="card-header border-b p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <h2 className="text-sm font-semibold">Course teaching staff</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Owners, Teachers, and operational Teaching Assistants.</p>
        </div>
        <div className="card-body p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffMembers.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border p-3 flex flex-col justify-between gap-3"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full font-bold text-sm flex items-center justify-center shrink-0" style={{ background: 'var(--bg-active)', color: 'var(--text-secondary)' }}>
                  {(m.userName || m.userEmail || 'CM').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{m.userName || 'Staff Member'}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{m.userEmail || 'No email'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="badge text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--bg-active)' }}>
                  {m.roleInCourse}
                </span>

                {canManageAny && (
                  <div className="flex items-center gap-2">
                    {m.roleInCourse !== 'OWNER' && (
                      <select
                        value={m.roleInCourse}
                        onChange={(e) => handleRoleChange(m, e.target.value as CourseRole)}
                        className="input text-[11px] py-0.5 px-1 bg-transparent border rounded"
                      >
                        <option value="TEACHER">TEACHER</option>
                        <option value="TA">TA</option>
                        <option value="STUDENT">STUDENT</option>
                      </select>
                    )}
                    {m.roleInCourse !== 'OWNER' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m)}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Students Table Section */}
      <section className="card">
        <div className="card-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <div>
            <h2 className="text-sm font-semibold">Enrolled students</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Search and manage students enrolled in the course.</p>
          </div>
          <input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs max-w-xs"
          />
        </div>
        <div className="card-body p-0">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                  <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Enrollment Date</th>
                    {canManageStudents && <th className="px-4 py-2 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-hover transition-colors">
                      <td className="px-4 py-2.5 font-medium">{s.userName || 'Student'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{s.userEmail || 'No email'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{formatDate(s.addedAt)}</td>
                      {canManageStudents && (
                        <td className="px-4 py-2.5 text-right flex items-center justify-end gap-2">
                          <select
                            value={s.roleInCourse}
                            onChange={(e) => handleRoleChange(s, e.target.value as CourseRole)}
                            className="input text-[11px] py-0.5 px-1 bg-transparent border rounded"
                          >
                            <option value="STUDENT">STUDENT</option>
                            {canManageAny && <option value="TEACHER">TEACHER</option>}
                            {canManageAny && <option value="TA">TA</option>}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(s)}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No students found matching the query.
            </div>
          )}
        </div>
      </section>

      {/* Enrolled Groups Section */}
      <section className="card">
        <div className="card-header border-b p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <h2 className="text-sm font-semibold">Enrolled Groups</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enrollment groups linked to this course. Unlinking groups does not unenroll active students.</p>
        </div>
        <div className="card-body p-0">
          {isGroupsLoading ? (
            <Loading />
          ) : enrolledGroups && enrolledGroups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                  <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <th className="px-4 py-2 font-medium">Group Name</th>
                    <th className="px-4 py-2 font-medium">Registered Members</th>
                    {canManageStudents && <th className="px-4 py-2 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {enrolledGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-hover transition-colors">
                      <td className="px-4 py-2.5 font-medium">{g.name}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>{g.memberCount}</td>
                      {canManageStudents && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleUnlinkGroup(g.id, g.name)}
                            className="text-xs text-red-500 hover:underline inline-flex items-center gap-1.5"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            <span>Unlink group</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No groups enrolled in this course yet.
            </div>
          )}
        </div>
      </section>

      {/* Add Member Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-lg border max-w-md w-full p-4 space-y-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <h3 className="text-sm font-semibold">Add course member</h3>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>User Email</label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
                  <input
                    type="email"
                    placeholder="e.g. user@university.edu"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="input text-xs"
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>Course Role</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as AddMemberRole)}
                  className="input text-xs"
                >
                  <option value="STUDENT">STUDENT</option>
                  {canManageAny && <option value="TEACHER">TEACHER</option>}
                  {canManageAny && <option value="TA">TA</option>}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'transparent', border: '1px solid var(--border-default)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {addMemberMutation.isPending ? 'Enrolling...' : 'Enroll Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {isGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-lg border max-w-md w-full p-4 space-y-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <h3 className="text-sm font-semibold">Enroll existing group</h3>
            <form onSubmit={handleEnrollGroup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>Select Group</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="input text-xs"
                  required
                >
                  <option value="">-- Choose enrollment group --</option>
                  {globalGroups
                    ?.filter((g) => !enrolledGroups?.some((eg) => eg.id === g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.memberCount} members)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGroupOpen(false)}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'transparent', border: '1px solid var(--border-default)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollGroupMutation.isPending}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {enrollGroupMutation.isPending ? 'Enrolling...' : 'Enroll Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="rounded-lg border max-w-2xl w-full p-4 space-y-4 my-8" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <h3 className="text-sm font-semibold">Bulk enroll students via CSV</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
                Format: <code className="px-1 rounded" style={{ background: 'var(--bg-active)' }}>email,role</code> (role defaults to STUDENT, OWNER is not allowed)
              </label>
              <textarea
                rows={6}
                placeholder="student1@university.edu,STUDENT&#10;student2@university.edu&#10;teacher@university.edu,TEACHER"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="input text-xs font-mono py-2"
              />
              <button
                type="button"
                onClick={handleCsvParse}
                disabled={bulkPreviewMutation.isPending}
                className="button text-xs py-1.5 px-3"
                style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)' }}
              >
                {bulkPreviewMutation.isPending ? 'Validating CSV...' : 'Parse and Preview'}
              </button>
            </div>

            {/* Live Preview List */}
            {bulkPreview && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold">Enrollment preview report</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {/* Valid Rows */}
                  {bulkPreview.validRows.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Ready for Enrollment ({bulkPreview.validRows.length})</p>
                      <div className="divide-y rounded-md border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                        {bulkPreview.validRows.map((r: BulkPreviewResult, idx: number) => (
                          <div key={idx} className="p-2 flex items-center justify-between text-xs gap-3">
                            <span className="font-semibold truncate">{r.userName || r.email}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.email}</span>
                              <span className="badge text-[10px]" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>{r.role}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invalid Rows */}
                  {bulkPreview.invalidRows.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Invalid Rows ({bulkPreview.invalidRows.length})</p>
                      <div className="divide-y rounded-md border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                        {bulkPreview.invalidRows.map((r: BulkPreviewResult, idx: number) => (
                          <div key={idx} className="p-2 flex items-center justify-between text-xs gap-3">
                            <span className="font-semibold truncate" style={{ color: 'var(--text-muted)' }}>{r.email}</span>
                            <div className="flex items-center gap-2">
                              <span className="badge text-[10px]" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                                {r.reason === 'NOT_FOUND' ? 'User not found' :
                                 r.reason === 'DUPLICATE_IN_CSV' ? 'Duplicate in CSV' :
                                 r.reason === 'ALREADY_ENROLLED' ? 'Already enrolled' :
                                 r.reason === 'OWNER_NOT_ALLOWED' ? 'OWNER not allowed' :
                                 r.reason === 'ROLE_CONFLICT' ? 'Role conflict' : r.reason}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCsvText('');
                      setBulkPreview(null);
                      setIsBulkOpen(false);
                    }}
                    className="button text-xs py-1.5 px-3"
                    style={{ background: 'transparent', border: '1px solid var(--border-default)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkConfirm}
                    disabled={bulkConfirmMutation.isPending || bulkPreview.validRows.length === 0}
                    className="button text-xs py-1.5 px-3"
                    style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    {bulkConfirmMutation.isPending ? 'Enrolling...' : 'Confirm Enrollments'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
