import { createBrowserClient } from '@supabase/ssr'

// Client navigateur : stocke la session dans les cookies
// (et non le localStorage) pour que le middleware la reconnaisse.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
