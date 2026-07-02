import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  let photos = [];
  try {
    const body = await request.json();
    photos = body.photos ?? [];

    if (photos.length === 0) {
      return Response.json({ groups: [] });
    }

    // Single photo → no grouping needed
    if (photos.length === 1) {
      return Response.json({
        groups: [{ photos: [0], front: 0, label: null }],
      });
    }

    const n = photos.length;

    // Build GPT-4o vision request: all photos + instructions
    const content = [
      {
        type: 'text',
        text: `You are a fashion AI. You receive ${n} clothing photos numbered 0 to ${n - 1}.

Your task: group photos that show the SAME clothing item (e.g. front/back/label/detail of the same sweater belong together).

For each group also identify:
- "front": index of the best front-view photo showing the full item
- "label": index of a clothing label/tag/care-label photo (null if none)

Rules:
- Every index 0–${n - 1} must appear in exactly one group
- "front" must be an index that appears in that group's "photos" array
- "label" must be an index that appears in that group's "photos" array (or null)
- If a photo is ambiguous or shows something that's not clothing, put it in its own group
- Respond with JSON only, no other text

JSON format:
{
  "groups": [
    {"photos": [0, 1, 2], "front": 0, "label": 2},
    {"photos": [3, 4], "front": 3, "label": null}
  ]
}`,
      },
      ...photos.map((photo) => ({
        type: 'image_url',
        image_url: { url: photo, detail: 'low' },
      })),
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content;
    const result = JSON.parse(raw);

    // Validate: ensure every index 0..n-1 is covered
    const seen = new Set();
    for (const g of result.groups ?? []) {
      for (const idx of g.photos ?? []) seen.add(idx);
    }

    // Add any missing indices as their own group
    for (let i = 0; i < n; i++) {
      if (!seen.has(i)) {
        result.groups.push({ photos: [i], front: i, label: null });
      }
    }

    return Response.json(result);
  } catch (err) {
    console.error('group-photos error:', err);

    // Fallback: each photo is its own group
    const fallbackGroups = photos.map((_, i) => ({
      photos: [i],
      front: i,
      label: null,
    }));
    return Response.json({ groups: fallbackGroups });
  }
}
