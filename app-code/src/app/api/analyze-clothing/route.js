import OpenAI from 'openai'

export async function POST(request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const { label, front } = await request.json()

    if (!front) {
      return Response.json({ error: 'front image required' }, { status: 400 })
    }

    const images = []
    if (label) images.push({ type: 'image_url', image_url: { url: label } })
    images.push({ type: 'image_url', image_url: { url: front } })

    const labelNote = label
      ? 'The FIRST image is the clothing LABEL (read brand, size, material). The LAST image is the FRONT of the garment.'
      : 'You only have the FRONT photo of the garment. No label photo.'

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a secondhand fashion expert listing items on a clothing swap app.

${labelNote}

IMPORTANT: Always do your best to analyze the photo, even if the image quality is not perfect, the lighting is poor, or the angle is unusual. Real secondhand sellers take imperfect photos — that is normal. Only return an error if the image clearly shows something that is absolutely not a clothing item (e.g. a food dish, a car, a landscape, a blank wall with no clothes visible at all).

Analyze the image(s) and return ONLY a valid JSON object with no backticks, no markdown, no extra text:

{
  "category": "clothing type in English (e.g. T-shirt, Jeans, Jacket, Hoodie, Dress, Sneakers, Coat, Sweatshirt, Blazer, Shorts, Skirt, Shirt)",
  "brand": "Exact brand name from the label or clearly visible logo. Read the label carefully — exact spelling matters. If no brand is visible, return 'Unknown'. Do NOT guess or invent a brand.",
  "size": "exact size from the label (e.g. S, M, L, XL, 38, 42) or 'Unknown' if not visible",
  "color": "main color(s) in English (e.g. Black, White, Navy Blue, Forest Green, Cream)",
  "material": "fabric composition from label (e.g. 100% Cotton, 80% Polyester 20% Cotton) or 'Unknown'",
  "style": "one of: Casual / Streetwear / Vintage / Sport / Formal / Minimal",
  "condition": "one of: New / Like New / Good / Worn / Very Worn — assess honestly based on visible wear, fading, pilling, stains",
  "description": "Write 4 to 6 sentences in English as a genuine secondhand seller would. Cover: (1) what it is and exact brand/model if known, (2) color and how the fabric feels/looks, (3) honest condition with specific visible details (fading, pills, stains, hardware wear), (4) fit and cut style, (5) how to style it, (6) why it's a good trade. Be specific and genuine — avoid generic phrases. Example: 'White Nike hoodie in size M, classic pullover style with embroidered swoosh. Soft 80% cotton 20% polyester blend, feels substantial and warm. Good condition — slight logo fading from washing, no holes or visible stains. Relaxed fit, slightly oversized, hits at the hip. Pairs perfectly with slim jeans or joggers and white sneakers. A wardrobe staple at a fraction of retail price.'",
  "coins_value": "integer between 5 and 150. Calculate realistically: brand prestige base (luxury Gucci/Prada/LV/Balenciaga/Moncler = 80-150, premium streetwear Supreme/Stone Island/Off-White/Carhartt = 55-95, sportswear Nike/Adidas/New Balance/Puma = 25-55, fast fashion Zara/H&M/Shein/Primark = 10-25, no brand = 5-15). Then apply condition multiplier (New ×1.5, Like New ×1.25, Good ×1.0, Worn ×0.75, Very Worn ×0.5). Category adjustment (outerwear/coats +15, shoes +10, t-shirts/basics -5). Round to nearest 5. Examples: Nike hoodie Good = 40, Supreme tee Like New = 75, H&M jeans Worn = 10, Gucci belt Good = 110.",
  "counterfeit_warning": "boolean — true ONLY if there are clear signs of counterfeiting: logo clearly misaligned or wrong font, stitching quality inconsistent with brand standards, label text with typos or wrong country of origin, obvious quality mismatch. Be conservative — default false when uncertain.",
  "counterfeit_reason": "short reason in English if counterfeit_warning is true, empty string otherwise"
}

If and ONLY IF the image clearly shows something that is absolutely not a clothing item, return only: {"error":"invalid_image","reason":"brief reason in French"}`
            },
            ...images,
          ],
        },
      ],
      max_tokens: 1100,
    })

    const content = response.choices[0].message.content?.trim() ?? ''
    console.log('[analyze-clothing] raw:', content.substring(0, 300))

    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let json
    try {
      json = JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (!match) {
        console.error('[analyze-clothing] parse failed:', content)
        return Response.json({ error: 'parse_error' }, { status: 500 })
      }
      json = JSON.parse(match[0])
    }

    if (json.error === 'invalid_image') {
      return Response.json({ error: 'invalid_image', reason: json.reason ?? '' }, { status: 422 })
    }

    // Ensure coins_value is a reasonable number
    if (typeof json.coins_value !== 'number' || json.coins_value < 5 || json.coins_value > 150) {
      json.coins_value = null // fallback to client-side calculation
    }

    console.log('[analyze-clothing] success:', JSON.stringify(json).substring(0, 300))
    return Response.json(json)

  } catch (err) {
    console.error('[analyze-clothing] error:', err?.message ?? err)
    return Response.json({ error: err?.message ?? 'analyse failed' }, { status: 500 })
  }
}
