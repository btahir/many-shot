import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const { prompt, model } = await request.json()

  if (!model) {
    return Response.json({ error: 'Model is required' }, { status: 400 })
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  })

  async function getAnthropicPrediction(
    prompt: string,
    model: string
  ): Promise<string> {
    try {
      const response: any = await anthropic.messages.create({
        model: model,
        max_tokens: 1000,
        temperature: 0.9,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
      console.log('Anthropic response:', response)

      const responseText = response.content[0].text

      // Check if the response text is valid JSON
      try {
        const jsonRegex = /\{[^]*\}/
        const match = responseText.match(jsonRegex)
        return match ? JSON.parse(match[0]) : responseText
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError)
        return responseText
      }
    } catch (error) {
      console.error('Error calling Anthropic API:', error)
      throw new Error('Error calling API')
    }
  }

  try {
    const prediction = await getAnthropicPrediction(prompt, model)

    return Response.json(prediction)
  } catch (error) {
    console.error('Error calling Anthropic API:', error)
    return Response.json(
      { error: 'Error calling API', details: error },
      { status: 500 }
    )
  }
}
