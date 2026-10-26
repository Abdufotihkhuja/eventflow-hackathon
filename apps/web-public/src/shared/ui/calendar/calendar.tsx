"use client";

import * as React from "react";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@shared/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  ...props
}: CalendarProps): React.ReactElement {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn("p-3", className)}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-4", defaults.months),
        month: cn("flex w-full flex-col gap-4", defaults.month),
        month_caption: cn(
          "relative flex h-9 items-center justify-center px-9",
          defaults.month_caption
        ),
        caption_label: cn(
          "flex items-center gap-1 text-sm font-semibold text-ink-400",
          captionLayout !== "label" && "sr-only",
          defaults.caption_label
        ),
        nav: cn(
          "absolute inset-x-0 top-0 flex h-9 items-center justify-between px-0.5",
          defaults.nav
        ),
        button_previous: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md",
          "border border-[var(--border-2)] bg-white text-ink-400",
          "transition-colors hover:bg-bone-100 hover:border-[var(--border-strong)]",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          defaults.button_previous
        ),
        button_next: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md",
          "border border-[var(--border-2)] bg-white text-ink-400",
          "transition-colors hover:bg-bone-100 hover:border-[var(--border-strong)]",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          defaults.button_next
        ),
        dropdowns: cn(
          "flex items-center justify-center gap-2 text-sm font-medium text-ink-400",
          defaults.dropdowns
        ),
        dropdown_root: cn("relative", defaults.dropdown_root),
        dropdown: cn(
          "absolute inset-0 cursor-pointer opacity-0",
          defaults.dropdown
        ),
        months_dropdown: cn(defaults.months_dropdown),
        years_dropdown: cn(defaults.years_dropdown),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "w-9 text-center text-[0.75rem] font-normal text-ink-100",
          defaults.weekday
        ),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn(
          "relative h-9 w-9 p-0 text-center text-sm",
          defaults.day
        ),
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md",
          "text-ink-400 transition-colors",
          "hover:bg-bone-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30",
          "disabled:cursor-not-allowed disabled:opacity-40",
          defaults.day_button
        ),
        selected: cn(
          "[&_button]:bg-ember-400 [&_button]:text-white [&_button:hover]:bg-ember-500",
          defaults.selected
        ),
        today: cn(
          "[&_button]:font-semibold [&_button]:text-ember-500",
          defaults.today
        ),
        outside: cn("[&_button]:text-ink-50", defaults.outside),
        disabled: cn(
          "[&_button]:opacity-40 [&_button]:cursor-not-allowed",
          defaults.disabled
        ),
        hidden: cn("invisible", defaults.hidden),
        range_start: cn(
          "[&_button]:rounded-l-md [&_button]:bg-ember-400 [&_button]:text-white",
          defaults.range_start
        ),
        range_end: cn(
          "[&_button]:rounded-r-md [&_button]:bg-ember-400 [&_button]:text-white",
          defaults.range_end
        ),
        range_middle: cn(
          "[&_button]:rounded-none [&_button]:bg-ember-50 [&_button]:text-ink-400",
          defaults.range_middle
        ),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...rest }) => {
          const Icon =
            orientation === "right"
              ? ChevronRight
              : orientation === "left"
                ? ChevronLeft
                : ChevronDown;
          return (
            <Icon
              className={cn("h-4 w-4", chevronClass)}
              aria-hidden
              {...rest}
            />
          );
        },
        DropdownNav: ({ className: navClass, ...rest }) => (
          <div
            className={cn(
              "flex items-center justify-center gap-2",
              navClass
            )}
            {...rest}
          />
        ),
        Dropdown: ({ value, options, onChange, "aria-label": ariaLabel }) => (
          <span className="relative inline-flex items-center gap-1 rounded-md border border-[var(--border-2)] bg-white px-2 py-1 text-sm text-ink-400 hover:border-[var(--border-strong)] focus-within:ring-[3px] focus-within:ring-ember-400/30">
            <span>
              {options?.find((o) => String(o.value) === String(value))?.label ??
                ""}
            </span>
            <ChevronDown className="h-3 w-3 text-ink-100" aria-hidden />
            <select
              value={value}
              onChange={onChange}
              aria-label={ariaLabel}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {options?.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))}
            </select>
          </span>
        ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
