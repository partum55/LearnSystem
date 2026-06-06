import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { utapi } from '@/lib/uploadthing-server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fileKey = body && typeof body === 'object'
    ? (body as { fileKey?: unknown }).fileKey
    : undefined;

  if (typeof fileKey !== 'string' || !fileKey.trim()) {
    return NextResponse.json({ error: 'fileKey is required' }, { status: 400 });
  }

  try {
    const result = await utapi.deleteFiles(fileKey.trim());
    return NextResponse.json(result);
  } catch (deleteError) {
    const message = deleteError instanceof Error
      ? deleteError.message
      : 'Failed to delete file';

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
