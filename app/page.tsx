'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label, Pie, PieChart } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { DownloadIcon } from 'lucide-react'
import { toPng } from 'html-to-image'
import PipelineSingleton from '@/lib/pipeline.js'
import { generatePrompt } from '@/lib/utils'

const chartConfig: any = {
  frequency: {
    label: 'Frequency',
  },
  // We'll dynamically add colors for each prediction option
} satisfies ChartConfig

type ModelInfo = {
  value: string
  label: string
  platform: 'anthropic' | 'openai' | 'gemini' | 'local'
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
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', platform: 'openai' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', platform: 'openai' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3-5 Turbo', platform: 'openai' },
  {
    value: 'gemini-1.5-flash-latest',
    label: 'Gemini 1.5 Flash',
    platform: 'gemini',
  },
  {
    value: 'gemini-1.5-pro-latest',
    label: 'Gemini 1.5 Pro',
    platform: 'gemini',
  },
  {
    value: 'Qwen1.5-0.5B',
    label: 'Qwen 1.5-0.5B (Local Model)',
    platform: 'local',
  },
]

const formSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answerOptions: z
    .array(z.object({ value: z.string().min(1, 'Answer option is required') }))
    .min(1, 'At least one answer option is required'),
  runs: z.number().min(1, 'At least one run is required'),
  selectedModel: z.string().min(1, 'At least one model must be selected'),
})

type FormValues = z.infer<typeof formSchema>

export default function Home() {
  const [results, setResults] = useState<Result[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [chartData, setChartData] = useState<
    { option: string; frequency: number }[]
  >([])
  const [error, setError] = useState<string | null>(null)

  const resultsRef = useRef<HTMLDivElement>(null)
  const stopRequestedRef = useRef<boolean>(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: '',
      answerOptions: [{ value: '' }],
      runs: 1,
      selectedModel: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'answerOptions',
  })

  const extractPrediction = (text: string) => {
    const regex = /"prediction":\s*"(.*?)"/g
    let match
    let lastMatch

    while ((match = regex.exec(text)) !== null) {
      lastMatch = match
    }

    if (lastMatch) {
      return { prediction: lastMatch[1] }
    }
    throw new Error('No valid prediction found')
  }

  const makePrediction = async (
    modelValue: string,
    question: string,
    answerOptions: { value: string }[]
  ): Promise<Prediction> => {
    const model = models.find((m) => m.value === modelValue)
    if (!model) throw new Error('Invalid model selected')
    const prompt = generatePrompt(question, answerOptions)

    if (model.platform === 'local') {
      // Handle local model prediction
      try {
        const localModel: any = await PipelineSingleton.getInstance()
        const messages = [
          { role: 'system', content: 'You are the worlds greatest predictor.' },
          { role: 'user', content: prompt },
        ]
        const text = localModel.tokenizer.apply_chat_template(messages, {
          tokenize: false,
          add_generation_prompt: true,
        })
        const output = await localModel(text, {
          max_new_tokens: 128,
          do_sample: false,
        })
        const prediction = extractPrediction(output[0].generated_text.trim())
        return prediction
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message)
        }
        throw new Error('An unexpected error occurred')
      }
    } else {
      try {
        const response = await fetch(`/api/${model.platform}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            model: modelValue,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'An error occurred')
        }

        return await response.json()
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('API')) {
            throw new Error(
              'API key is missing or invalid. Please check your configuration.'
            )
          }
          throw error
        }
        throw new Error('An unexpected error occurred')
      }
    }
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

  const updateChartData = (frequency: Record<string, number>) => {
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ]
    const newChartData = Object.entries(frequency).map(
      ([option, count], index) => ({
        option,
        frequency: count,
        fill: colors[index % colors.length],
      })
    )
    setChartData(newChartData)

    // Update chartConfig with dynamic colors
    newChartData.forEach(({ option, fill }) => {
      chartConfig[option] = {
        label: option,
        color: fill,
      }
    })
  }

  const onStop = useCallback(() => {
    stopRequestedRef.current = true
  }, [])

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    setError(null)
    stopRequestedRef.current = false
    const newResults: Result[] = []
    const runId = nanoid()

    try {
      for (let i = 0; i < data.runs; i++) {
        if (stopRequestedRef.current) {
          break
        }
        try {
          const result = await makePrediction(
            data.selectedModel,
            data.question,
            data.answerOptions
          )
          newResults.push({
            runId,
            iteration: i + 1,
            model: data.selectedModel,
            prediction: result,
          })
          setProgress(((i + 1) / data.runs) * 100)
        } catch (error) {
          if (error instanceof Error) {
            setError(error.message)
          } else {
            setError('An unexpected error occurred')
          }
          break
        }

        setResults([...newResults])
        const frequency = calculateFrequency(newResults)
        updateChartData(frequency)
        await new Promise((resolve) => setTimeout(resolve, 500)) // Delay between runs
      }
    } finally {
      setIsLoading(false)
      setProgress(0)
      stopRequestedRef.current = false
    }
  }

  const totalRuns = useMemo(() => {
    return results.length
  }, [results])

  const onDownload = useCallback(() => {
    if (resultsRef.current === null) {
      return
    }

    const originalWidth = resultsRef.current.offsetWidth
    const originalHeight = resultsRef.current.offsetHeight
    const canvasWidth = 600
    const canvasHeight = (originalHeight / originalWidth) * canvasWidth

    toPng(resultsRef.current, {
      cacheBust: true,
      backgroundColor: '#ffffff', // Set your desired background color
      canvasWidth: canvasWidth, // Desired canvas width
      canvasHeight: canvasHeight, // Proportional canvas height
      style: {
        width: `${originalWidth}px`,
        height: `${originalHeight}px`,
      },
    })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = 'prediction-results.png'
        link.href = dataUrl
        link.click()
      })
      .catch((err) => {
        console.log(err)
      })
  }, [resultsRef])

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl sm:text-3xl font-bold my-4 flex items-center'>
        <img
          src='/apple-icon.png'
          alt='Apple icon'
          className='h-8 w-8 mr-1 -ml-2'
        />
        Many-Shot Predictions
      </h1>
      <div className='mb-6 text-sm sm:text-base space-y-2 text-muted-foreground'>
        <p>
          Recent findings have shown that we can achieve{' '}
          <a
            className='font-medium text-blue-500 hover:text-blue-600'
            target='_blank'
            rel='noreferrer noopener'
            href='https://x.com/clifflerner/status/1787137921050415186'
          >
            greater predictability
          </a>{' '}
          in language model outputs by running the same prompt multiple times.
        </p>

        <p>
          This app provides an easy way to run the same prompt N times and
          visualize the results, helping you understand the distribution and
          consistency of model responses.
        </p>

        <p>
          You will need to clone{' '}
          <a
            className='font-medium text-blue-500 hover:text-blue-600'
            target='_blank'
            rel='noreferrer noopener'
            href='https://github.com/btahir/many-shot'
          >
            the GitHub repository
          </a>{' '}
          and add your own API keys for each platform (OpenAI, Anthropic,
          Gemini, etc.). If you prefer not to use those platforms, you can try a
          local browser model, but it is slower.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <FormField
            control={form.control}
            name='question'
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Question</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder='Enter your question here'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Enter the question for prediction.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='answerOptions'
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Answer Options</FormLabel>
                <FormControl>
                  <div>
                    {fields.map((item, index) => (
                      <div key={item.id} className='flex items-center mb-2'>
                        <Input
                          type='text'
                          placeholder={`Answer option ${index + 1}`}
                          {...form.register(
                            `answerOptions.${index}.value` as const
                          )}
                        />
                        <Button
                          type='button'
                          onClick={() => remove(index)}
                          className='ml-2'
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button type='button' onClick={() => append({ value: '' })}>
                      Add Option
                    </Button>
                  </div>
                </FormControl>
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
          {isLoading && (
            <Button
              className='ml-4'
              type='button'
              onClick={onStop}
              variant='destructive'
            >
              Stop
            </Button>
          )}
        </form>
      </Form>
      {isLoading && (
        <div className='mt-12'>
          <Progress value={progress} className='w-[60%]' />
        </div>
      )}
      {error && (
        <div className='mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded'>
          Error: {error}
        </div>
      )}
      {results.length > 0 && (
        <Card className='mt-8 relative' ref={resultsRef}>
          <CardHeader className='pb-0'>
            <div className='flex justify-between items-center'>
              <div>
                <CardTitle className='text-2xl'>Prediction Results</CardTitle>
                <CardDescription>Model: {results[0].model}</CardDescription>
              </div>
              <Button
                variant='outline'
                size='icon'
                onClick={onDownload}
                className='absolute top-4 right-4'
              >
                <DownloadIcon className='h-4 w-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col-reverse sm:flex-row gap-8 sm:items-center'>
              <div className='flex-1 space-y-6'>
                <div>
                  <h3 className='text-lg font-semibold mb-3'>
                    Numerical Results
                  </h3>
                  <div className='space-y-2'>
                    {chartData.map((item) => (
                      <div
                        key={item.option}
                        className='flex justify-between items-center py-1 border-b last:border-b-0'
                      >
                        <span className='font-medium'>{item.option}:</span>
                        <span>
                          {item.frequency} (
                          {((item.frequency / totalRuns) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className='pt-4 border-t'>
                  <div className='flex justify-between items-center font-semibold text-lg'>
                    <span>Total Runs:</span>
                    <span>{totalRuns}</span>
                  </div>
                </div>
              </div>
              <div className='flex-1 flex justify-center items-center'>
                <ChartContainer
                  config={chartConfig}
                  className='aspect-square w-full max-w-[300px]'
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={chartData}
                      dataKey='frequency'
                      nameKey='option'
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                    >
                      <Label
                        content={({ viewBox }: any) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor='middle'
                                dominantBaseline='middle'
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className='fill-foreground text-2xl font-bold'
                                >
                                  {totalRuns.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 20}
                                  className='fill-muted-foreground text-xs'
                                >
                                  Total Runs
                                </tspan>
                              </text>
                            )
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
