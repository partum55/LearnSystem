export const isDev = process.env.NODE_ENV === 'development';
export const isProd = process.env.NODE_ENV === 'production';

export const publicEnv = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  aiServiceUrl: process.env.NEXT_PUBLIC_AI_SERVICE_URL || '/api/ai',
  requireUcuEmail: process.env.NEXT_PUBLIC_REQUIRE_UCU_EMAIL === 'true',
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  pdfEmbedAllowlist: process.env.NEXT_PUBLIC_PDF_EMBED_ALLOWLIST || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};
