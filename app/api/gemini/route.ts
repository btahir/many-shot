import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  const { prompt, model } = await request.json()

  if (!model) {
    return Response.json({ error: 'Model is required' }, { status: 400 })
  }

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 1000,
    responseMimeType: 'application/json',
  }

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ]

  async function getGeminiPrediction(
    prompt: string,
    model: string
  ): Promise<string> {
    try {
      const selectedModel = genAI.getGenerativeModel({
        model: model,
        safetySettings,
        generationConfig,
      })
      const result: any = await selectedModel.generateContent(prompt)
      const responseText = await result.response.text()

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
      console.error('Error calling Gemini API:', error)
      throw new Error('Error calling API')
    }
  }

  try {
    const prediction = await getGeminiPrediction(prompt, model)

    return Response.json(prediction)
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    return Response.json(
      { error: 'Error calling API', details: error },
      { status: 500 }
    )
  }
}
