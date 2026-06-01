import Anthropic from '@anthropic-ai/sdk'
import type { TradingContext } from '@/types'

export async function analyzeWithClaude(
  userPrompt: string,
  context: TradingContext,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey })

  const systemPrompt = `Tu es un coach de trading expert et bienveillant.
Contexte de trading de l'utilisateur :
${JSON.stringify(context, null, 2)}

Règles :
- Sois direct, factuel et bienveillant
- Utilise des chiffres précis tirés du contexte
- Identifie des patterns actionnables
- Réponds toujours en français
- Utilise ## pour les titres, des bullet points et des émojis pour la lisibilité`

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}
