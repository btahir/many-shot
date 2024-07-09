'use client'

import React from 'react'
import { nanoid } from 'nanoid'
// @ts-ignore
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Progress } from '@/components/ui/progress'

type ModelInfo = {
  value: string
  label: string
  platform: 'anthropic' | 'openai'
}

type Prediction = {
  prediction: string
}

type Result = {
  runId: string
  iteration: number
  model: string
  prediction: Prediction
}

const models: ModelInfo[] = [
  {
    value: 'claude-3-5-sonnet-20240620',
    label: 'Claude 3.5 Sonnet',
    platform: 'anthropic',
  },
  {
    value: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku',
    platform: 'anthropic',
  },
  {
    value: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus',
    platform: 'anthropic',
  },
  { value: 'gpt-4o', label: 'GPT-4o', platform: 'openai' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', platform: 'openai' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3-5 Turbo', platform: 'openai' },
]

const formSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  runs: z.number().min(1, 'At least one run is required'),
  selectedModel: z.string().min(1, 'At least one model must be selected'),
})

type FormValues = z.infer<typeof formSchema>

export default function Home() {
  const [results, setResults] = React.useState<Result[]>([])
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [progress, setProgress] = React.useState<number>(0)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      runs: 1,
      selectedModel: '',
    },
  })

  const makePrediction = async (
    modelValue: string,
    prompt: string
  ): Promise<Prediction> => {
    const model = models.find((m) => m.value === modelValue)
    if (!model) throw new Error('Invalid model selected')
    // return { prediction: 'Prediction' }

    const response = await fetch(`/api/${model.platform}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, model: modelValue }),
    })
    return await response.json()
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    const newResults: Result[] = []
    const runId = nanoid()

    for (let i = 0; i < data.runs; i++) {
      try {
        const result = await makePrediction(data.selectedModel, data.prompt)
        newResults.push({
          runId,
          iteration: i + 1,
          model: data.selectedModel,
          prediction: result,
        })
        setProgress(((i + 1) / data.runs) * 100)
      } catch (error) {
        console.error(`Error with model ${data.selectedModel}:`, error)
      }

      setResults([...newResults])
      await new Promise((resolve) => setTimeout(resolve, 500)) // Delay between runs
    }

    setIsLoading(false)
  }

  const calculateFrequency = (
    predictions: Result[]
  ): Record<string, number> => {
    const frequency: Record<string, number> = {}
    predictions.forEach((pred) => {
      frequency[pred.prediction.prediction] =
        (frequency[pred.prediction.prediction] || 0) + 1
    })
    return frequency
  }

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Many-Shot Prediction App</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <FormField
            control={form.control}
            name='prompt'
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    rows={8}
                    placeholder='Enter your prompt here'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Enter the prompt for prediction.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='runs'
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Number of runs</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min='1'
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='selectedModel'
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Select Models</FormLabel>
                <FormControl>
                  <Controller
                    name='selectedModel'
                    control={form.control}
                    render={({ field }: any) => (
                      <Select
                        onValueChange={(value: any) => field.onChange(value)}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select models' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {models.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' disabled={isLoading}>
            {isLoading ? 'Running...' : 'Run Predictions'}
          </Button>
        </form>
      </Form>
      {isLoading && (
        <div className='mt-4'>
          <Progress value={progress} className='w-[60%]' />
        </div>
      )}
      {results.length > 0 && (
        <div className='mt-4'>
          <h2 className='text-xl font-semibold'>Results:</h2>
          <pre>{JSON.stringify(calculateFrequency(results), null, 2)}</pre>
        </div>
      )}
    </div>
  )
}