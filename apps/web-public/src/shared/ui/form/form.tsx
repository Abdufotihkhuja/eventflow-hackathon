"use client";

import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@shared/lib/utils";

import { Label } from "../label";

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

const FormFieldContext = React.createContext<
  FormFieldContextValue | undefined
>(undefined);

const Form = FormProvider;

function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

interface FormItemContextValue {
  id: string;
  descriptionId: string;
  messageId: string;
}

const FormItemContext = React.createContext<FormItemContextValue | undefined>(
  undefined
);

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider
      value={{
        id,
        descriptionId: `${id}-description`,
        messageId: `${id}-message`,
      }}
    >
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ComponentRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const field = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(
        "block text-sm font-semibold text-ink-400",
        field?.error && "text-[var(--danger)]",
        className
      )}
      htmlFor={field?.formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ComponentRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const field = useFormField();

  return (
    <Slot
      ref={ref}
      id={field?.formItemId}
      aria-describedby={
        !field?.error
          ? field?.formDescriptionId
          : `${field.formDescriptionId} ${field.formMessageId}`
      }
      aria-invalid={!!field?.error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const field = useFormField();

  return (
    <p
      ref={ref}
      id={field?.formDescriptionId}
      className={cn("text-xs text-ink-100", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const field = useFormField();
  const body = field?.error ? String(field.error.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={field?.formMessageId}
      className={cn(
        "text-sm font-medium text-[var(--danger)]",
        className
      )}
      role="alert"
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

function useFormField(): {
  name: string;
  formItemId: string;
  formDescriptionId: string;
  formMessageId: string;
  error: ReturnType<
    ReturnType<typeof useFormContext>["getFieldState"]
  >["error"];
} | undefined {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const formContext = useFormContext();

  if (!fieldContext || !formContext) {
    return undefined;
  }

  const fieldState = formContext.getFieldState(
    fieldContext.name,
    formContext.formState
  );

  const formItemId = itemContext?.id ?? `${fieldContext.name}-form-item`;

  return {
    name: fieldContext.name,
    formItemId,
    formDescriptionId:
      itemContext?.descriptionId ?? `${formItemId}-description`,
    formMessageId: itemContext?.messageId ?? `${formItemId}-message`,
    error: fieldState.error,
  };
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};
