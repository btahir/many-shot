import OpenAI from 'openai'

export async function POST(request: Request) {
  const { question, answerOptions, model } = await request.json()
  console.log('question:', question)
  console.log('answerOptions:', answerOptions)

  if (!question) {
    return Response.json({ error: 'Question is required' }, { status: 400 })
  }

  if (
    !answerOptions ||
    !Array.isArray(answerOptions) ||
    answerOptions.length === 0
  ) {
    return Response.json(
      { error: 'At least one answer option is required' },
      { status: 400 }
    )
  }

  if (!model) {
    return Response.json({ error: 'Model is required' }, { status: 400 })
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })

  const prompt = `
  Given the following question:
  
  ${question}
  
  Please provide your answer by selecting ONLY ONE of the following options:
  
  ${answerOptions.map((option) => `- ${option}`).join('\n')}
  
  Instructions:
  1. Read the question carefully.
  2. Consider all provided answer options.
  3. Select the single most appropriate answer from the given options.
  4. Respond ONLY with the chosen answer option, exactly as it appears in the list.
  
  Your response must be in the following JSON format:
  {
    "prediction": "Your chosen answer option here"
  }
  
  Ensure that your response contains only the JSON object with the "prediction" key and the selected answer as its value.
  `

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
      console.log('OpenAI response:', response.choices[0].message.content)

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
