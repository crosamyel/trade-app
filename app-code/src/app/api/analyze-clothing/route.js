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
  "category": "clothing type in French (ex: T-shirt, Jean, Veste, Hoodie, Robe, Sneakers, Manteau)",
  "brand": "brand from label or visible logo, or 'Inconnue'",
  "size": "size from label (ex: S, M, L, 42, 38) or 'Inconnue'",
  "color": "main color(s) in French (ex: Noir, Blanc, Bleu marine)",
  "material": "composition from label (ex: 100% Coton) or 'Inconnue'",
  "style": "one of: Casual / Streetwear / Vintage / Sport / Formel / Minimaliste",
  "condition": "one of: Neuf / Comme neuf / Bon état / Usé / Très usé",
  "description": "Write 4 to 6 sentences in French as a real secondhand seller would. Cover: (1) what it is and brand, (2) color and material feel, (3) honest condition with any visible details like fading, pills, stains, (4) fit and cut, (5) styling suggestion, (6) why it is a good trade. Be specific and genuine. Example: 'Hoodie blanc Nike en taille M, parfait pour un look casual. Composition 80% coton 20% polyester, très doux au toucher. En bon état, légère décoloration du logo après lavage, aucun trou ni tache visible. Coupe légèrement oversize, idéale à porter avec un jean slim ou un jogging. À associer avec des sneakers blanches pour un style sport-chic. Un classique Nike à saisir à prix doux.'",
  "coins_value": integer between 5 and 150. Calculate realistically based on: brand prestige (luxury like Gucci/Prada/Louis Vuitton/Balenciaga = 80-150, premium streetwear like Supreme/Stone Island/Off-White = 60-100, sportswear like Nike/Adidas/New Balance = 30-60, mainstream like Zara/H&M/Uniqlo = 15-30, no brand = 10-20), condition modifier (Neuf +40%, Comme neuf +25%, Bon état 0%, Usé -20%, Très usé -40%), category weight (coats/jackets higher than t-shirts). Round to nearest 5. Example: Nike hoodie Bon état = 40, Supreme tee Comme neuf = 80, H&M jean Usé = 10.,
  "counterfeit_warning": boolean — true ONLY if there are clear signs of counterfeiting: logo clearly misaligned, fonts wrong for the brand, stitching quality that screams fake, label inconsistencies. Be conservative — default false when uncertain,
  "counterfeit_reason": "short reason in French if counterfeit_warning is true, empty string otherwise"
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
