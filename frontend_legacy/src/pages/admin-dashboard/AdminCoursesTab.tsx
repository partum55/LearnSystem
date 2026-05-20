import React, { useMemo } from 'react';
import { PencilSquareIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AdminCourse } from '../../api/admin';
import { Loading } from '../../components/Loading';
import {
  CreateCourseForm,
  filterCoursesBySearch,
  initialUpdateCourseForm,
  UpdateCourseForm,
} from './adminDashboardTypes';

const inputClass = 'input';
const selectClass = 'input';

interface AdminCoursesTabProps {
  createCourseForm: CreateCourseForm;
  setCreateCourseForm: React.Dispatch<React.SetStateAction<CreateCourseForm>>;
  submitCreateCourse: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  editingCourse: AdminCourse | null;
  setEditingCourse: React.Dispatch<React.SetStateAction<AdminCourse | null>>;
  updateCourseForm: UpdateCourseForm;
  setUpdateCourseForm: React.Dispatch<React.SetStateAction<UpdateCourseForm>>;
  submitUpdateCourse: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  courses: AdminCourse[];
  coursesLoading: boolean;
  coursesPage: number;
  setCoursesPage: React.Dispatch<React.SetStateAction<number>>;
  coursesTotalPages: number;
  coursesTotalElements: number;
  courseSearchInput: string;
  setCourseSearchInput: React.Dispatch<React.SetStateAction<string>>;
  courseActionLoadingId: string | null;
  onStartEditingCourse: (course: AdminCourse) => void;
  onToggleCoursePublished: (course: AdminCourse) => Promise<void>;
  onRemoveCourse: (course: AdminCourse) => Promise<void>;
}

export const AdminCoursesTab: React.FC<AdminCoursesTabProps> = ({
  createCourseForm, setCreateCourseForm, submitCreateCourse,
  editingCourse, setEditingCourse, updateCourseForm, setUpdateCourseForm, submitUpdateCourse,
  courses, coursesLoading, coursesPage, setCoursesPage, coursesTotalPages, coursesTotalElements,
  courseSearchInput, setCourseSearchInput, courseActionLoadingId,
  onStartEditingCourse, onToggleCoursePublished, onRemoveCourse,
}) => {
  const filteredCourses = useMemo(() => filterCoursesBySearch(courses, courseSearchInput), [courseSearchInput, courses]);

  return (
    <div className="space-y-4">
      {/* Create Course */}
      <section className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Create Course</h2>
        <form className="grid gap-2.5 md:grid-cols-2" onSubmit={submitCreateCourse}>
          <input type="text" required value={createCourseForm.code} onChange={(e) => setCreateCourseForm(p => ({ ...p, code: e.target.value }))} placeholder="Course code (e.g. CS101)" className={inputClass} />
          <select value={createCourseForm.visibility} onChange={(e) => setCreateCourseForm(p => ({ ...p, visibility: e.target.value as CreateCourseForm['visibility'] }))} className={selectClass}>
            <option value="PRIVATE">Private</option>
            <option value="PUBLIC">Public</option>
            <option value="DRAFT">Draft</option>
          </select>
          <input type="text" required value={createCourseForm.titleUk} onChange={(e) => setCreateCourseForm(p => ({ ...p, titleUk: e.target.value }))} placeholder="Title (UK)" className={inputClass} />
          <input type="text" value={createCourseForm.titleEn} onChange={(e) => setCreateCourseForm(p => ({ ...p, titleEn: e.target.value }))} placeholder="Title (EN)" className={inputClass} />
          <input type="text" value={createCourseForm.descriptionUk} onChange={(e) => setCreateCourseForm(p => ({ ...p, descriptionUk: e.target.value }))} placeholder="Description (UK)" className={inputClass} />
          <input type="text" value={createCourseForm.descriptionEn} onChange={(e) => setCreateCourseForm(p => ({ ...p, descriptionEn: e.target.value }))} placeholder="Description (EN)" className={inputClass} />
          <input type="number" min={1} value={createCourseForm.maxStudents} onChange={(e) => setCreateCourseForm(p => ({ ...p, maxStudents: e.target.value }))} placeholder="Max students" className={inputClass} />
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={createCourseForm.isPublished} onChange={(e) => setCreateCourseForm(p => ({ ...p, isPublished: e.target.checked }))} />
            Publish immediately
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm">
              <PlusCircleIcon className="h-4 w-4" />
              Create
            </button>
          </div>
        </form>
      </section>

      {/* Edit Course */}
      {editingCourse && (
        <section className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Edit: {editingCourse.code}</h2>
            <button type="button" onClick={() => { setEditingCourse(null); setUpdateCourseForm(initialUpdateCourseForm); }} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
          <form className="grid gap-2.5 md:grid-cols-2" onSubmit={submitUpdateCourse}>
            <input type="text" value={updateCourseForm.titleUk} onChange={(e) => setUpdateCourseForm(p => ({ ...p, titleUk: e.target.value }))} placeholder="Title (UK)" className={inputClass} />
            <input type="text" value={updateCourseForm.titleEn} onChange={(e) => setUpdateCourseForm(p => ({ ...p, titleEn: e.target.value }))} placeholder="Title (EN)" className={inputClass} />
            <input type="text" value={updateCourseForm.descriptionUk} onChange={(e) => setUpdateCourseForm(p => ({ ...p, descriptionUk: e.target.value }))} placeholder="Description (UK)" className={inputClass} />
            <input type="text" value={updateCourseForm.descriptionEn} onChange={(e) => setUpdateCourseForm(p => ({ ...p, descriptionEn: e.target.value }))} placeholder="Description (EN)" className={inputClass} />
            <select value={updateCourseForm.visibility} onChange={(e) => setUpdateCourseForm(p => ({ ...p, visibility: e.target.value as UpdateCourseForm['visibility'] }))} className={selectClass}>
              <option value="PRIVATE">Private</option>
              <option value="PUBLIC">Public</option>
              <option value="DRAFT">Draft</option>
            </select>
            <input type="number" min={1} value={updateCourseForm.maxStudents} onChange={(e) => setUpdateCourseForm(p => ({ ...p, maxStudents: e.target.value }))} placeholder="Max students" className={inputClass} />
            <label className="md:col-span-2 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={updateCourseForm.isPublished} onChange={(e) => setUpdateCourseForm(p => ({ ...p, isPublished: e.target.checked }))} />
              Published
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="btn btn-primary btn-sm">
                <PencilSquareIcon className="h-4 w-4" />
                Save
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Courses list */}
      <section className="rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="p-4 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <input type="text" value={courseSearchInput} onChange={(e) => setCourseSearchInput(e.target.value)} placeholder="Filter by code/title" className="input w-full md:max-w-xs" />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{coursesTotalElements} courses</span>
        </div>

        {coursesLoading ? (
          <div className="p-6"><Loading /></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Owner</th>
                  <th>Visibility</th>
                  <th>Published</th>
                  <th>Members</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{course.code}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{course.titleUk || course.titleEn || 'Untitled'}</div>
                    </td>
                    <td className="text-xs">{course.ownerName || course.ownerId || 'Unknown'}</td>
                    <td>{course.visibility}</td>
                    <td>{course.isPublished ? 'Yes' : 'No'}</td>
                    <td>{course.memberCount ?? course.currentEnrollment ?? 0}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => onStartEditingCourse(course)} className="btn btn-secondary btn-sm">Edit</button>
                        <button type="button" onClick={() => { void onToggleCoursePublished(course); }} disabled={courseActionLoadingId === course.id} className="btn btn-ghost btn-sm">
                          {course.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button type="button" onClick={() => { void onRemoveCourse(course); }} disabled={courseActionLoadingId === course.id} className="btn btn-danger btn-sm">
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

        <div className="p-3 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" disabled={coursesPage <= 0} onClick={() => setCoursesPage(p => p - 1)} className="btn btn-ghost btn-sm">Prev</button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{coursesPage + 1} / {Math.max(coursesTotalPages, 1)}</span>
          <button type="button" disabled={coursesPage + 1 >= coursesTotalPages} onClick={() => setCoursesPage(p => p + 1)} className="btn btn-ghost btn-sm">Next</button>
        </div>
      </section>
    </div>
  );
};
