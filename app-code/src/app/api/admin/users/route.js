import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'crosamyel@gmail.com';

// Service role key bypasses RLS — server-side only
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // Verify the requester is the admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all profiles (bypasses RLS via service role key)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Count items per user
    const ids = (profiles ?? []).map(p => p.id);
    const itemCounts = {};
    if (ids.length > 0) {
      const { data: items } = await supabase
        .from('clothing')
        .select('user_id')
        .in('user_id', ids);
      for (const r of items ?? []) {
        itemCounts[r.user_id] = (itemCounts[r.user_id] ?? 0) + 1;
      }
    }

    const result = (profiles ?? []).map(p => ({
      ...p,
      item_count: itemCounts[p.id] ?? 0,
    }));

    return Response.json({ users: result });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
