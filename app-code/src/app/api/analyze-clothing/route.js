import OpenAI from 'openai'

const PROMPT = `Tu es un expert en mode, vêtements et détection de contrefaçons. Analyse cette image et retourne UNIQUEMENT un objet JSON valide, sans markdown, sans backticks, sans texte supplémentaire.

IMPORTANT : Si l'image ne montre PAS un vêtement ou accessoire de mode (par exemple : nourriture, animal, paysage, visage, document, écran, etc.), retourne UNIQUEMENT :
{"error": "not_clothing", "reason": "courte explication en anglais de pourquoi ce n'est pas un vêtement"}

Sinon, si c'est bien un vêtement ou accessoire, retourne le JSON suivant :

Voici le JSON attendu :

{
  "title": "[nom court du vêtement, ex: Nike Air Max 90, Levi's 501 Jean]",
  "brand": "[marque exacte visible sur le logo ou l'étiquette, sinon Unknown]",
  "category": "[une seule valeur parmi : Tops / Bottoms / Outerwear / Shoes / Accessories / Dresses / Sportswear]",
  "size": "[XS / S / M / L / XL / XXL ou taille numérique ex: 38, 42, 10]",
  "color": "[couleur principale du vêtement]",
  "condition": "[une seule valeur parmi : new / like_new / good / used / worn]",
  "style": "[une seule valeur parmi : streetwear / vintage / minimal / formal / casual / sporty]",
  "material": "[matière si visible ex: 100% Cotton, Polyester, Denim — sinon Unknown]",
  "description": "[description complète en 2-3 phrases : style général, détails visuels, comment le porter]",
  "coins_value": [nombre entier calculé selon les règles ci-dessous],
  "fake_warning": true ou false,
  "fake_reason": "[raison précise si fake_warning est true, sinon null]"
}

RÈGLES POUR COINS :
- Base par catégorie : Outerwear=40, Shoes=35, Dresses=30, Bottoms=25, Sportswear=25, Tops=20, Accessories=20
- Multiplicateur marque : Luxury (Gucci, LV, Prada, Balenciaga, Off-White, Dior, Versace, Moncler) = x4.0 | Premium (Ralph Lauren, Tommy Hilfiger, Calvin Klein, Hugo Boss, Lacoste, Burberry) = x2.5 | Popular (Nike, Adidas, Zara, H&M, Levi's, The North Face, Stone Island, Carhartt) = x1.8 | Fast Fashion (Primark, Shein, Boohoo, Forever 21, ASOS) = x0.8 | Unknown = x1.0
- Multiplicateur état : new=x2.0 | like_new=x1.6 | good=x1.2 | used=x0.8 | worn=x0.5
- Formule : Base × Multiplicateur Marque × Multiplicateur État (arrondi à l'entier, min 5, max 500)

RÈGLES POUR FAKE_WARNING :
- true si : logo mal imprimé/déformé, orthographe incorrecte de la marque, qualité tissu incompatible avec la marque supposée, étiquette mal positionnée ou de mauvaise qualité, couleurs non officielles, coutures irrégulières ou mal alignées
- false dans tous les autres cas`

export async function POST(request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const { label, front } = await request.json()

    if (!front) {
      return Response.json({ error: 'front image required' }, { status: 400 })
    }

    // Build content: text prompt + images (label first if available, then front)
    const content = [{ type: 'text', text: PROMPT }]
    if (label) content.push({ type: 'image_url', image_url: { url: label, detail: 'high' } })
    content.push({ type: 'image_url', image_url: { url: front, detail: 'high' } })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0].message.content?.trim() ?? ''
    console.log('[analyze-clothing] raw:', raw.substring(0, 300))

    let json
    try {
      json = JSON.parse(raw)
    } catch {
      console.error('[analyze-clothing] parse failed:', raw)
      return Response.json({ error: 'parse_error' }, { status: 500 })
    }

    // Check not_clothing response
    if (json.error === 'not_clothing') {
      return Response.json({ error: 'not_clothing', reason: json.reason ?? 'Not a clothing item' }, { status: 422 })
    }

    // Validate coins_value
    if (typeof json.coins_value !== 'number' || json.coins_value < 5 || json.coins_value > 500) {
      json.coins_value = null
    } else {
      json.coins_value = Math.round(json.coins_value)
    }

    // Normalize fake fields
    json.fake_warning = json.fake_warning === true
    if (!json.fake_warning) json.fake_reason = null

    console.log('[analyze-clothing] success:', JSON.stringify(json).substring(0, 300))
    return Response.json(json)

  } catch (err) {
    console.error('[analyze-clothing] error:', err?.message ?? err)
    return Response.json({ error: err?.message ?? 'analyse failed' }, { status: 500 })
  }
}
