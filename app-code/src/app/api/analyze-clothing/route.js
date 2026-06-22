import OpenAI from 'openai'

export async function POST(request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  try {
    const { label, front } = await request.json()

    if (!label || !front) {
      return Response.json({ error: 'label et front requis' }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text:
`Tu es un expert en mode et vêtements. Tu reçois 2 photos d'un même vêtement.
IMAGE 1 = l'ÉTIQUETTE · IMAGE 2 = la FACE AVANT

ÉTAPE 1 — VALIDATION STRICTE :
Vérifie que l'IMAGE 2 montre bien un vêtement réel pris en photo par quelqu'un (pas une image copiée du web, pas une capture d'écran, pas un catalogue, pas une IA, pas un dessin, pas un objet qui n'est pas un vêtement).
Si la photo n'est PAS un vêtement réel photographié par une vraie personne, retourne UNIQUEMENT :
{"error":"invalid_image","reason":"description courte du problème"}

ÉTAPE 2 — ANALYSE (si vêtement réel validé) :
Lis l'étiquette (IMAGE 1) pour la marque, la taille et la matière.
Analyse la face avant (IMAGE 2) pour la catégorie, la couleur, le style, l'état.
Retourne UNIQUEMENT un objet JSON valide sans texte autour, sans backticks :
{
  "category": "catégorie courte (ex: T-shirt, Jeans, Veste, Sneakers)",
  "brand": "marque lue sur l'étiquette, sinon Unknown",
  "size": "taille lue sur l'étiquette (ex: S, M, L, 42), sinon Unknown",
  "color": "main color in English",
  "material": "composition / matière lue sur l'étiquette, sinon Unknown",
  "style": "streetwear / vintage / minimal / casual / formal",
  "condition": "new / like new / used / worn",
  "description": "short, appealing description in English (1 sentence)"
}`
            },
            { type: 'image_url', image_url: { url: label } },
            { type: 'image_url', image_url: { url: front } },
          ],
        },
      ],
      max_tokens: 500,
    })

    const content = response.choices[0].message.content
    const json = JSON.parse(content.replace(/```json|```/g, '').trim())

    // Si l'IA rejette la photo
    if (json.error === 'invalid_image') {
      return Response.json({ error: 'invalid_image', reason: json.reason ?? '' }, { status: 422 })
    }

    return Response.json(json)
  } catch (err) {
    console.error('analyze-clothing error:', err)
    return Response.json({ error: err.message ?? 'analyse échouée' }, { status: 500 })
  }
}
