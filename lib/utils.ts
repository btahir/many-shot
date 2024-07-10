import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generatePrompt(
  question: string,
  answerOptions: { value: string }[]
) {
  const optionsText = answerOptions
    .map((option) => `- ${option.value}`)
    .join('\n')

  const prompt = `
  Given the following question:
  
  ${question}
  
  Please provide your answer by selecting ONLY ONE of the following options:
  
  ${optionsText}
  
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

  return prompt
}
