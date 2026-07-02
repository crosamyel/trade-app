import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const formData = await request.formData();
  const file = formData.get('file');
  const userId = formData.get('userId');

  if (!file || !userId) {
    return Response.json({ error: 'Missing data' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from('avatars')
    .upload(`${userId}/avatar.jpg`, buffer, {
      upsert: true,
      contentType: 'image/jpeg',
    });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(`${userId}/avatar.jpg`);

  // Add cache-busting timestamp so browser always loads the new photo
  const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

  await supabase
    .from('profiles')
    .update({ avatar_url: cacheBustedUrl })
    .eq('id', userId);

  return Response.json({ url: cacheBustedUrl });
}
