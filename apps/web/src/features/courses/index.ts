export { default as CourseList } from './views/CourseList';
export { default as CourseDetail } from './views/CourseDetail';
export { default as CourseCreate } from './views/CourseCreate';
export { default as CourseEdit } from './views/CourseEdit';
export { default as CoursePreview } from './views/CoursePreview';
export { default as CourseArchive } from './views/CourseArchive';
export { coursesApi, modulesApi } from './api/courses';
export {
  useCoursesQuery,
  useCourseQuery,
  useEnrolledCoursesQuery,
  useCourseMembers,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useEnrollStudentsMutation,
  useModulesQuery,
  useModuleQuery,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useDeleteModuleMutation,
} from './hooks/useCourseQueries';
