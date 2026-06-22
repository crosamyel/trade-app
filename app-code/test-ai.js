import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: 'ta_clé_openai_ici' // mets ta clé directement ici pour le test
})

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: 'https://i.imgur.com/example.jpg' // mets l'URL d'une vraie photo de vêtement
          }
        },
        {
          type: 'text',
          text: `Analyse ce vêtement et retourne UNIQUEMENT un JSON avec:
          {
            "title": "nom court",
            "brand": "marque si visible sinon Unknown",
            "size": "taille si visible sinon Unknown",
            "condition": "new / like new / used / worn",
            "style": "streetwear / vintage / minimal / casual / formal",
            "description": "description courte en français"
          }`
        }
      ]
    }
  ],
  max_tokens: 500
})

const content = response.choices[0].message.content
console.log('Résultat:', content)
console.log('Temps:', response.usage)
