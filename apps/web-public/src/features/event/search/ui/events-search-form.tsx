"use client";

import { useCallback, useMemo } from "react";

import { Search, X } from "lucide-react";

import { useT } from "@eventflow/i18n/react";
import { useSyncedState } from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { Button, Input } from "@shared/ui";

export interface EventsSearchFormProps {
  onSearch: (query: string) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function EventsSearchForm({
  onSearch,
  defaultValue = "",
  placeholder,
  className,
}: EventsSearchFormProps): React.ReactNode {
  const t = useT();
  const [value, setValue] = useSyncedState<string>(defaultValue);

  const normalizedValue = useMemo(() => value.trim(), [value]);
  const isSearchDisabled = normalizedValue.length === 0;

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (normalizedValue.length === 0) {
        return;
      }
      onSearch(normalizedValue);
    },
    [normalizedValue, onSearch]
  );

  const handleReset = useCallback(() => {
    setValue("");
    onSearch("");
  }, [onSearch, setValue]);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("w-full flex flex-col gap-2", className)}
      role="search"
    >
      <div className="flex w-full flex-col gap-3 rounded-xl bg-white border border-bone-300/60 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] md:flex-row md:items-center md:gap-2 md:p-2 md:pl-4">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-50"
          />
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder ?? t("public.events.hero.searchDefaultPlaceholder")}
            aria-label={t("public.events.hero.searchAria")}
            className="h-10 rounded-none border-0 bg-transparent pl-10 pr-10 shadow-none backdrop-blur-none hover:border-0 focus:border-0 focus:bg-transparent focus:shadow-none md:h-11"
          />
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="group absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-50"
              aria-label={t("public.events.hero.clearSearch")}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors group-hover:bg-bone-200 group-hover:text-ink-100">
                <X aria-hidden className="h-4 w-4" />
              </span>
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={isSearchDisabled}
          className="w-full shrink-0 md:w-auto"
          size="lg"
          leftIcon={<Search aria-hidden className="h-4 w-4" />}
          title={
            isSearchDisabled
              ? t("public.events.hero.searchDisabledTitle")
              : t("public.events.hero.searchTitle")
          }
        >
          {t("public.events.hero.searchButton")}
        </Button>
      </div>
    </form>
  );
}
