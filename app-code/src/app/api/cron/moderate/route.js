import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Use service role key — this runs server-side only
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request) {
  // Security: verify this is called by Vercel Cron or admin
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Get all pending items
  const { data: pendingItems } = await supabase
    .from('clothing')
    .select('id, image_url, title, brand, user_id, profiles(username)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(50); // process max 50 per run

  const results = { approved: [], rejected: [], errors: [] };

  if (!pendingItems || pendingItems.length === 0) {
    // Still send the nightly report even if nothing to process
    let resendResult = null;
    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TRADE <onboarding@resend.dev>',
          to: 'tradebrussel@gmail.com',
          subject: `🛡️ Nightly Moderation Report — nothing to review`,
          html: `
            <h2>TRADE Nightly Moderation Report</h2>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-BE')}</p>
            <p>✅ No items pending review tonight. All clear!</p>
            <p><a href="https://tradebe.app/admin">Open Admin Dashboard</a></p>
          `,
        }),
      });
      resendResult = await resendRes.json();
      console.log('[cron/moderate] Resend response:', JSON.stringify(resendResult));
    }
    return Response.json({ message: 'No pending items', processed: 0, resend: resendResult });
  }

  // 2. Analyze each item with OpenAI Vision
  for (const item of pendingItems) {
    if (!item.image_url) {
      await supabase.from('clothing').update({ status: 'rejected' }).eq('id', item.id);
      results.rejected.push({ id: item.id, reason: 'No image' });
      continue;
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a clothing marketplace moderator. Analyze this image and respond with JSON only.

Check:
1. Is this a real clothing item or fashion accessory? (shirt, pants, jacket, shoes, bag, hat, etc.)
2. Is the photo clear enough to see the item?
3. Does it appear to be a counterfeit/fake luxury brand?
4. Is there anything inappropriate (nudity, offensive content)?

Respond with:
{
  "approved": true/false,
  "reason": "brief reason if rejected",
  "category": "detected category if approved"
}

Be lenient — approve if it's clearly a clothing item even if photo quality is average.
Reject only if: not clothing, obviously fake luxury brand, inappropriate content, or unidentifiable.`
            },
            {
              type: 'image_url',
              image_url: { url: item.image_url, detail: 'low' }
            }
          ]
        }],
        max_tokens: 150,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);

      if (result.approved) {
        await supabase
          .from('clothing')
          .update({ status: 'active' })
          .eq('id', item.id);
        results.approved.push({ id: item.id, title: item.title });
      } else {
        await supabase
          .from('clothing')
          .update({ status: 'rejected' })
          .eq('id', item.id);

        // Notify the user their item was rejected
        await supabase.from('notifications').insert({
          user_id: item.user_id,
          type: 'item_rejected',
          body: `Your item "${item.title}" was not approved. Reason: ${result.reason}. Please upload a clear photo of a real clothing item.`,
          read: false,
          link: '/upload'
        });

        results.rejected.push({
          id: item.id,
          title: item.title,
          reason: result.reason,
          username: item.profiles?.username
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      results.errors.push({ id: item.id, error: err.message });
    }
  }

  // 3. Send nightly report email via Resend
  if (process.env.RESEND_API_KEY) {
    const totalProcessed = results.approved.length + results.rejected.length;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TRADE <noreply@tradebe.app>',
        to: 'tradebrussel@gmail.com',
        subject: `🛡️ Nightly Moderation Report — ${totalProcessed} items processed`,
        html: `
          <h2>TRADE Nightly Moderation Report</h2>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-BE')}</p>

          <h3>✅ Approved: ${results.approved.length}</h3>
          ${results.approved.map(i => `<p>• ${i.title} (${i.id})</p>`).join('')}

          <h3>❌ Rejected: ${results.rejected.length}</h3>
          ${results.rejected.map(i => `<p>• ${i.title} — ${i.reason} (@${i.username})</p>`).join('')}

          ${results.errors.length > 0 ? `<h3>⚠️ Errors: ${results.errors.length}</h3>
          ${results.errors.map(e => `<p>• ${e.id}: ${e.error}</p>`).join('')}` : ''}

          <p><a href="https://tradebe.app/admin">Open Admin Dashboard</a></p>
        `,
      }),
    });
  }

  return Response.json({
    success: true,
    processed: pendingItems.length,
    approved: results.approved.length,
    rejected: results.rejected.length,
    errors: results.errors.length
  });
}
