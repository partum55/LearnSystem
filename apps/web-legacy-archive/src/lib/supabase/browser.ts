'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../../types/supabase';

export const getSupabaseBrowserClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
};
