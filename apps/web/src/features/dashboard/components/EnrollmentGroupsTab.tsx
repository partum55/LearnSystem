'use client';

import { useState } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  EnvelopeIcon,
  UserMinusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  useEnrollmentGroups,
  useCreateEnrollmentGroup,
  useDeleteEnrollmentGroup,
  useEnrollmentGroupMembers,
  useAddEnrollmentGroupMember,
  useRemoveEnrollmentGroupMember,
} from '@/features/courses/hooks/useCourseQueries';
import { Loading } from '@/components/Loading';

export function EnrollmentGroupsTab() {
  const { data: groups, isLoading: isGroupsLoading } = useEnrollmentGroups();
  const createGroupMutation = useCreateEnrollmentGroup();
  const deleteGroupMutation = useDeleteEnrollmentGroup();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId) ?? null;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const created = await createGroupMutation.mutateAsync(newGroupName.trim());
      setNewGroupName('');
      setSelectedGroupId(created.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this group? This will unlink it from any courses (enrolled students will remain enrolled).')) {
      return;
    }
    try {
      await deleteGroupMutation.mutateAsync(groupId);
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  const filteredGroups = groups?.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  ) ?? [];

  if (isGroupsLoading) {
    return <Loading />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Groups List Column */}
      <div className="lg:col-span-1 space-y-4">
        {/* Create Group Form */}
        <form onSubmit={handleCreateGroup} className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <h3 className="text-sm font-semibold">Create global group</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. ПМ-31"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="input text-sm py-1.5"
              required
            />
            <button
              type="submit"
              disabled={createGroupMutation.isPending}
              className="button text-sm py-1.5 flex items-center justify-center"
              style={{ background: 'var(--bg-active)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Groups List */}
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
            <h3 className="text-sm font-semibold">Enrollment groups</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-active)', color: 'var(--text-secondary)' }}>
              {groups?.length ?? 0}
            </span>
          </div>

          <div className="p-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
              <input
                type="text"
                placeholder="Search groups..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="input text-xs"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          <div className="divide-y max-h-[400px] overflow-y-auto" style={{ borderColor: 'var(--border-subtle)' }}>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className="p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-hover"
                  style={{
                    background: selectedGroupId === group.id ? 'var(--bg-active)' : 'transparent',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{group.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {group.memberCount} active members
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteGroup(group.id, e)}
                    className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No groups found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group Details Column */}
      <div className="lg:col-span-2">
        {selectedGroup ? (
          <GroupDetailsPanel group={selectedGroup} />
        ) : (
          <div className="rounded-lg border p-12 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <UserGroupIcon className="mx-auto h-12 w-12" style={{ color: 'var(--text-faint)' }} />
            <h3 className="mt-4 text-sm font-semibold">No group selected</h3>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Select a group from the list or create a new one to manage its members.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupDetailsPanel({ group }: { group: any }) {
  const { data: members, isLoading: isMembersLoading } = useEnrollmentGroupMembers(group.id);
  const addMemberMutation = useAddEnrollmentGroupMember(group.id);
  const removeMemberMutation = useRemoveEnrollmentGroupMember(group.id);

  const [emailInput, setEmailInput] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    try {
      await addMemberMutation.mutateAsync(emailInput.trim());
      setEmailInput('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add user to group');
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName || 'this user'} from the group?`)) {
      return;
    }
    try {
      await removeMemberMutation.mutateAsync(userId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const filteredMembers = members?.filter((m) =>
    (m.userName?.toLowerCase() ?? '').includes(memberSearch.toLowerCase()) ||
    (m.userEmail?.toLowerCase() ?? '').includes(memberSearch.toLowerCase())
  ) ?? [];

  return (
    <div className="rounded-lg border overflow-hidden space-y-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div className="p-4 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
        <div>
          <h2 className="text-md font-semibold">{group.name}</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Manage the user catalog of the group. Enrolling this group into a course will provision all members.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 rounded-full text-center" style={{ background: 'var(--bg-active)', color: 'var(--text-primary)' }}>
          {members?.length ?? 0} members
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Add User by Email Form */}
        <form onSubmit={handleAddMember} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Add user by email
            </label>
            <div className="relative">
              <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
              <input
                type="email"
                placeholder="e.g. student@university.edu"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="input text-sm"
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={addMemberMutation.isPending}
            className="button text-sm py-2 px-4"
            style={{ background: 'var(--bg-active)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          >
            {addMemberMutation.isPending ? 'Adding...' : 'Add to group'}
          </button>
        </form>

        {/* Members Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Members List
            </h3>
            <input
              type="text"
              placeholder="Filter members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="input text-xs max-w-xs"
            />
          </div>

          {isMembersLoading ? (
            <Loading />
          ) : filteredMembers.length > 0 ? (
            <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
              <table className="w-full text-left text-xs">
                <thead style={{ background: 'var(--bg-active)', color: 'var(--text-muted)' }}>
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-hover transition-colors">
                      <td className="px-3 py-2.5 font-medium">{member.userName || 'No display name'}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>
                        {member.userEmail || 'No email'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.userId, member.userName || '')}
                          disabled={removeMemberMutation.isPending}
                          className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors inline-flex items-center gap-1.5"
                        >
                          <UserMinusIcon className="h-4 w-4" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-8 text-center text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
              No members found in this group.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
