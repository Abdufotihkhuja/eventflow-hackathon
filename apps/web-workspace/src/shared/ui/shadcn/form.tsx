import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { cn } from '@shared/lib/cn'

import { Label } from './label'

export type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(undefined)

export const Form = FormProvider

export type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = ControllerProps<TFieldValues, TName>

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  props: FormFieldProps<TFieldValues, TName>
) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

type FormItemContextValue = {
  id: string
  descriptionId: string
  messageId: string
}

const FormItemContext = React.createContext<FormItemContextValue | undefined>(undefined)

export type FormItemProps = React.HTMLAttributes<HTMLDivElement>

export const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, ...props }, ref) => {
    const id = React.useId()

    return (
      <FormItemContext.Provider
        value={{
          id,
          descriptionId: `${id}-description`,
          messageId: `${id}-message`,
        }}
      >
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    )
  }
)

FormItem.displayName = 'FormItem'

export type FormLabelProps = React.ComponentPropsWithoutRef<typeof Label>

export const FormLabel = React.forwardRef<React.ElementRef<typeof Label>, FormLabelProps>(
  ({ className, ...props }, ref) => {
    try {
      const field = useFormField()

      return (
        <Label
          ref={ref}
          className={cn(field?.error && 'text-destructive', className)}
          {...props}
          htmlFor={field?.formItemId}
        />
      )
    } catch {
      return <Label ref={ref} className={className} {...props} />
    }
  }
)

FormLabel.displayName = 'FormLabel'

export type FormControlProps = React.ComponentPropsWithoutRef<typeof Slot>

export const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, FormControlProps>(
  ({ className, ...props }, ref) => {
    try {
      const field = useFormField()

      return (
        <Slot
          ref={ref}
          id={field?.formItemId}
          aria-describedby={field?.error ? field.formMessageId : field?.formDescriptionId}
          aria-invalid={!!field?.error}
          className={className}
          {...props}
        />
      )
    } catch {
      return <Slot ref={ref} className={className} {...props} />
    }
  }
)

FormControl.displayName = 'FormControl'

export type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

export const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, ...props }, ref) => {
    const field = useFormField()

    return (
      <p
        ref={ref}
        id={field?.formDescriptionId}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      />
    )
  }
)

FormDescription.displayName = 'FormDescription'

export type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement>

export const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, ...props }, ref) => {
    const field = useFormField()
    const body = field?.error ? String(field.error.message) : children

    if (!body) {
      return null
    }

    return (
      <p
        ref={ref}
        id={field?.formMessageId}
        className={cn('text-sm font-medium text-destructive', className)}
        {...props}
      >
        {body}
      </p>
    )
  }
)

FormMessage.displayName = 'FormMessage'

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    return undefined
  }

  const fieldState = getFieldState(fieldContext.name, formState)

  const formItemId = itemContext?.id ?? `${fieldContext.name}-form-item`

  return {
    name: fieldContext.name,
    formItemId,
    formDescriptionId: itemContext?.descriptionId ?? `${formItemId}-description`,
    formMessageId: itemContext?.messageId ?? `${formItemId}-message`,
    error: fieldState.error,
  }
}
