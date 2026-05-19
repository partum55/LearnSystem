import { getSupabaseBrowserClient } from '../lib/supabase/browser';
import { Database } from '../types/supabase';
import { apiClient } from '../lib/api/client';

type CourseRow = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type CourseUpdate = Database['public']['Tables']['courses']['Update'];

export const courseService = {
  async getMyCourses() {
    // Domain action: getting user-specific course list with roles
    const { data } = await apiClient.get('/courses/my');
    return data;
  },

  async getCourseById(id: string) {
    // Could be direct Supabase if protected by RLS, but user said important actions go through Java.
    // We'll use Java to ensure we fetch modules and membership status correctly.
    const { data } = await apiClient.get(`/courses/${id}`);
    return data;
  },

  async createCourse(course: CourseInsert) {
    // Domain action: creation MUST go through Java
    const { data } = await apiClient.post('/courses', course);
    return data;
  },

  async updateCourse(id: string, updates: CourseUpdate) {
    // Domain action: update MUST go through Java
    const { data } = await apiClient.patch(`/courses/${id}`, updates);
    return data;
  },

  async publishCourse(id: string) {
    const { data } = await apiClient.post(`/courses/${id}/publish`);
    return data;
  }
};
