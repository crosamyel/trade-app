import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'crosamyel@gmail.com';

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  try {
    // Verify the requester is the admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });

    // 1. Delete all their clothing items
    await supabase.from('clothing').delete().eq('user_id', userId);

    // 2. Delete their matches
    await supabase.from('matches').delete().or(`user_a_uid.eq.${userId},user_b_uid.eq.${userId}`);

    // 3. Delete their notifications
    await supabase.from('notifications').delete().eq('user_id', userId);

    // 4. Delete their messages
    await supabase.from('messages').delete().eq('sender_id', userId);

    // 5. Delete their likes
    await supabase.from('likes').delete().eq('user_id', userId);

    // 6. Delete their profile
    await supabase.from('profiles').delete().eq('id', userId);

    // 7. Delete the auth account (requires service role key)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
