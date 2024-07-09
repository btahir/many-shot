import OpenAI from 'openai'

export async function POST(request: Request) {
  const { prompt, model } = await request.json()

  if (!prompt) {
    return Response.json({ error: 'Prompt is required' }, { status: 400 })
  }

  if (!model) {
    return Response.json({ error: 'Model is required' }, { status: 400 })
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })

  async function getOpenAIPrediction(
    prompt: string,
    model: string
  ): Promise<string> {
    try {
      const response: any = await openai.chat.completions.create({
        model: model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: "You are the world's greatest predictor.",
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      })
      console.log('OpenAI response:', response)

      const responseText = response.choices[0].message.content

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
      console.error('Error calling OpenAI API:', error)
      throw new Error('Error calling API')
    }
  }

  try {
    const prediction = await getOpenAIPrediction(prompt, model)

    return Response.json(prediction)
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    return Response.json(
      { error: 'Error calling API', details: error },
      { status: 500 }
    )
  }
}
