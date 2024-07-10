'use client'

import { useState, useMemo } from 'react'
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
// @ts-ignore
import { Label, Pie, PieChart } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

const chartConfig: any = {
  frequency: {
    label: 'Frequency',
  },
  // We'll dynamically add colors for each prediction option
} satisfies ChartConfig

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

  const makePrediction = async (
    modelValue: string,
    question: string,
    answerOptions: { value: string }[]
  ): Promise<Prediction> => {
    const model = models.find((m) => m.value === modelValue)
    if (!model) throw new Error('Invalid model selected')

    const response = await fetch(`/api/${model.platform}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        answerOptions: answerOptions.map((option) => option.value),
        model: modelValue,
      }),
    })
    return await response.json()
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

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    const newResults: Result[] = []
    const runId = nanoid()

    for (let i = 0; i < data.runs; i++) {
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
        console.error(`Error with model ${data.selectedModel}:`, error)
      }

      setResults([...newResults])
      const frequency = calculateFrequency(newResults)
      updateChartData(frequency)
      await new Promise((resolve) => setTimeout(resolve, 500)) // Delay between runs
    }

    setIsLoading(false)
    setProgress(0)
  }

  const totalRuns = useMemo(() => {
    return results.length
  }, [results])

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Many-Shot Prediction App</h1>
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
        </form>
      </Form>
      {isLoading && (
        <div className='mt-4'>
          <Progress value={progress} className='w-[60%]' />
        </div>
      )}
      {results.length > 0 && (
        <Card className='mt-8'>
          <CardHeader className='pb-0'>
            <CardTitle className='text-2xl'>Prediction Results</CardTitle>
            <CardDescription>Model: {results[0].model}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col-reverse sm:flex-row gap-8 sm:items-center'>
              <div className='flex-1 space-y-6'>
                <div>
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
