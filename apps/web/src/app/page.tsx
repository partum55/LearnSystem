import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../lib/supabase/server';

export default async function AppEntryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  redirect(user ? '/dashboard' : '/login');
}
