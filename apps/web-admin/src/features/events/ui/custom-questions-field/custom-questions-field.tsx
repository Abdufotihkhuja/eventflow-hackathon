import { useState } from 'react'
import { Plus, Trash2, HelpCircle, X } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { Button, Card, FormDescription, FormLabel, Input, Badge, Checkbox } from '@shared/ui'
import { cn } from '@shared/lib/cn'

type CustomQuestionsFieldProps = {
  form: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

type CustomQuestion = {
  id: string
  question: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea'
  required: boolean
  options?: string[]
}

const QUESTION_TYPE_LABELS = {
  text: 'events.questions.types.text',
  number: 'events.questions.types.number',
  select: 'events.questions.types.select',
  checkbox: 'events.questions.types.checkbox',
  textarea: 'events.questions.types.textarea',
} as const

export function CustomQuestionsField({ form }: CustomQuestionsFieldProps) {
  const t = useT()
  const questions = form.watch('customQuestions') || []
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)

  const addQuestion = () => {
    const newQuestion = {
      id: `question-${Date.now()}`,
      question: '',
      type: 'text' as const,
      required: false,
      options: [],
    }
    form.setValue('customQuestions', [...questions, newQuestion])
    setExpandedQuestion(newQuestion.id)
  }

  const removeQuestion = (id: string) => {
    form.setValue(
      'customQuestions',
      questions.filter((q: CustomQuestion) => q.id !== id)
    )
    if (expandedQuestion === id) {
      setExpandedQuestion(null)
    }
  }

  const updateQuestion = (
    id: string,
    field: string,
    value: string | boolean | string[] | CustomQuestion['type']
  ) => {
    const updated = questions.map((q: CustomQuestion) =>
      q.id === id ? { ...q, [field]: value } : q
    )
    form.setValue('customQuestions', updated)
  }

  const addOption = (questionId: string) => {
    const question = questions.find((q: CustomQuestion) => q.id === questionId)
    if (!question) return

    const newOptions = [...(question.options || []), '']
    updateQuestion(questionId, 'options', newOptions)
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find((q: CustomQuestion) => q.id === questionId)
    if (!question) return

    const newOptions = [...(question.options || [])]
    newOptions[optionIndex] = value
    updateQuestion(questionId, 'options', newOptions)
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find((q: CustomQuestion) => q.id === questionId)
    if (!question) return

    const newOptions = question.options?.filter((_: string, i: number) => i !== optionIndex) || []
    updateQuestion(questionId, 'options', newOptions)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <FormLabel>Дополнительные вопросы при регистрации</FormLabel>
          <FormDescription>
            Соберите дополнительную информацию от участников при регистрации
          </FormDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить вопрос
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card className="p-8 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">Дополнительные вопросы не добавлены</p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addQuestion}>
            Добавить первый вопрос
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question: CustomQuestion, index: number) => {
            const isExpanded = expandedQuestion === question.id
            const errors = form.formState.errors.customQuestions?.[index]

            return (
              <Card key={question.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10">
                      <HelpCircle className="h-5 w-5 text-brand-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {question.question || `Вопрос ${index + 1}`}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {t(QUESTION_TYPE_LABELS[question.type as keyof typeof QUESTION_TYPE_LABELS])}
                        </Badge>
                        {question.required && (
                          <Badge className="bg-danger-soft text-danger-soft-foreground text-xs">Обязательный</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {errors && (
                      <span className="text-xs text-destructive">Заполните обязательные поля</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        removeQuestion(question.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-border bg-muted/30 p-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Вопрос *
                      </label>
                      <Input
                        placeholder="Введите ваш вопрос"
                        value={question.question}
                        onChange={e => updateQuestion(question.id, 'question', e.target.value)}
                      />
                      {errors?.question && (
                        <p className="mt-1 text-xs text-destructive">{errors.question.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">Тип *</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {Object.entries(QUESTION_TYPE_LABELS).map(([type, labelKey]) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateQuestion(question.id, 'type', type)}
                            className={cn(
                              'rounded-lg border p-2 text-center text-sm transition',
                              question.type === type
                                ? 'border-brand-secondary bg-brand-secondary/10 text-brand-secondary font-medium'
                                : 'border-border bg-background hover:border-border hover:bg-muted/50'
                            )}
                          >
                            {t(labelKey)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {question.type === 'select' && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="block text-sm font-medium text-muted-foreground">
                            Варианты ответа
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(question.id)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Добавить
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {question.options?.map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <Input
                                placeholder={`Вариант ${optionIndex + 1}`}
                                value={option}
                                onChange={e =>
                                  updateOption(question.id, optionIndex, e.target.value)
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(question.id, optionIndex)}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          {(!question.options || question.options.length === 0) && (
                            <p className="text-sm text-muted-foreground">Нет вариантов ответа</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={question.required}
                        onCheckedChange={checked =>
                          updateQuestion(question.id, 'required', checked)
                        }
                      />
                      <label className="text-sm text-muted-foreground">Обязательный вопрос</label>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
