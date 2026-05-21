import { User, UserRole } from '../types';
import { getSupabaseBrowserClient } from '../lib/supabase/browser';
import { UserLocale, UserProfileInsert, UserProfileRow, UserProfileUpdate } from '../types/supabase';

const mapProfileToUser = (profile: UserProfileRow | null | undefined): User | null => {
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name ?? '',
    firstName: profile.first_name ?? undefined,
    lastName: profile.last_name ?? undefined,
    studentId: profile.student_id ?? undefined,
    role: profile.role as UserRole,
    locale: profile.locale?.toLowerCase() as 'uk' | 'en',
    theme: profile.theme === 'dark' || profile.theme === 'obsidian' ? 'dark' : 'light',
    avatar: profile.avatar_url ?? undefined,
    bio: profile.bio ?? undefined,
    createdAt: profile.created_at ?? '',
    updatedAt: profile.updated_at ?? '',
  };
};

export const profileService = {
  mapProfileToUser,

  async getCurrentProfile(): Promise<User | null> {
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;

    if (sessionError || !authUser) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return mapProfileToUser(data);

    const fallbackProfile: UserProfileInsert = {
      id: authUser.id,
      email: authUser.email ?? '',
      display_name: authUser.user_metadata?.display_name ?? authUser.email ?? '',
      first_name: authUser.user_metadata?.first_name,
      last_name: authUser.user_metadata?.last_name,
      role: authUser.user_metadata?.role ?? 'STUDENT',
      locale: 'UK',
      theme: 'light',
      email_verified: Boolean(authUser.email_confirmed_at),
    };

    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert(fallbackProfile)
      .select('*')
      .single();

    if (insertError) throw insertError;
    return mapProfileToUser(created);
  },

  async updateCurrentProfile(userId: string, updates: UserProfileUpdate): Promise<User | null> {
    const { data, error } = await getSupabaseBrowserClient()
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return mapProfileToUser(data);
  },

  normalizeLocale(locale: 'uk' | 'en'): UserLocale {
    return locale === 'uk' ? 'UK' : 'EN';
  },
};
