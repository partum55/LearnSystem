import { getSupabaseBrowserClient } from '../lib/supabase/browser';

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  courseMedia: 'course-media',
  submissions: 'submissions',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const storageService = {
  async uploadFile(bucket: StorageBucket, path: string, file: File, options?: { upsert?: boolean }) {
    const { data, error } = await getSupabaseBrowserClient()
      .storage
      .from(bucket)
      .upload(path, file, {
        upsert: options?.upsert ?? false,
        contentType: file.type || undefined,
      });

    if (error) throw error;
    return data;
  },

  getPublicUrl(bucket: StorageBucket, path: string) {
    const { data } = getSupabaseBrowserClient().storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async createSignedUrl(bucket: StorageBucket, path: string, expiresInSeconds = 60 * 10) {
    const { data, error } = await getSupabaseBrowserClient()
      .storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  },

  async removeFile(bucket: StorageBucket, path: string) {
    const { error } = await getSupabaseBrowserClient().storage.from(bucket).remove([path]);
    if (error) throw error;
  },
};
