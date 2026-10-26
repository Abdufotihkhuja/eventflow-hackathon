"use client";

import * as React from "react";

import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import { Calendar } from "@shared/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/ui/popover";

const ISO_DATE = "yyyy-MM-dd";

function parseIsoDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, ISO_DATE, new Date());
  return isValid(parsed) ? parsed : undefined;
}

export interface DatePickerProps {
  /** YYYY-MM-DD string. */
  value?: string | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Date format shown in the trigger button. Default: "dd.MM.yyyy". */
  displayFormat?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  /** Earliest selectable date. */
  fromDate?: Date;
  /** Latest selectable date. */
  toDate?: Date;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      onBlur,
      placeholder = "dd.mm.yyyy",
      displayFormat = "dd.MM.yyyy",
      disabled,
      hasError,
      className,
      fromDate,
      toDate,
      id,
      ...ariaProps
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const selected = parseIsoDate(value);

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            rightIcon={
              <CalendarIcon
                className="h-4 w-4 shrink-0 text-ink-100"
                aria-hidden
              />
            }
            className={cn(
              "h-11 w-full justify-between px-3.5 font-normal text-ink-400",
              "[&>span:nth-child(1)]:flex-1 [&>span:nth-child(1)]:text-left",
              !selected && "text-ink-50",
              hasError &&
                "border-[var(--danger)] bg-[var(--danger-soft)]/40 focus:border-[var(--danger)] focus-visible:ring-[var(--danger)]/22",
              className
            )}
            {...ariaProps}
          >
            <span className="truncate">
              {selected ? format(selected, displayFormat) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) {
                onChange?.("");
                return;
              }
              onChange?.(format(date, ISO_DATE));
              setOpen(false);
            }}
            defaultMonth={selected ?? toDate ?? undefined}
            disabled={(date) => {
              if (fromDate && date < fromDate) return true;
              if (toDate && date > toDate) return true;
              return false;
            }}
            captionLayout="dropdown"
            startMonth={fromDate}
            endMonth={toDate}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

DatePicker.displayName = "DatePicker";
