"use client";

import type { CSSProperties, MouseEvent } from "react";

import { useLocale } from "@eventflow/i18n/react";

import { trackEcommerce } from "@shared/analytics/track";

import { DesignIcon } from "./design-icon";
import { EventPoster } from "./event-poster";

import type { DesignEvent } from "./types";

/** "X% sold" footer label, localized by visitor locale. */
const SOLD_LABELS: Record<string, string> = {
  en: "sold",
  ru: "продано",
  uz: "sotildi",
};

export type CalmEventCardVariant = "default" | "list" | "editorial";

interface CalmEventCardProps {
  event: DesignEvent;
  href?: string;
  variant?: CalmEventCardVariant;
  onClick?: (ev: DesignEvent) => void;
  soldLabel?: string;
  pickLabel?: string;
  /** Shown when the event has neither a venue nor a city (e.g. "Location to be announced"). */
  locationFallback?: string;
}

const baseAnchor: CSSProperties = {
  cursor: "pointer",
  textDecoration: "none",
  color: "inherit",
};

export const CalmEventCard = ({
  event,
  href,
  variant = "default",
  onClick,
  soldLabel,
  pickLabel,
  locationFallback,
}: CalmEventCardProps): React.ReactNode => {
  const locale = useLocale();
  // Prop wins when provided; otherwise localize by visitor locale so callers
  // that don't pass a label don't leak the English default into RU/UZ.
  const resolvedSoldLabel = soldLabel ?? SOLD_LABELS[locale] ?? SOLD_LABELS.en;
  const location =
    [event.venue, event.city].filter(Boolean).join(" · ") ||
    locationFallback ||
    "";
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    trackEcommerce("select_item", [
      {
        item_id: event.slug ?? event.id,
        item_name: event.title,
        item_category: event.catLabel ?? event.cat,
      },
    ]);
    if (onClick) {
      if (!href) e.preventDefault();
      onClick(event);
    }
  };

  if (variant === "list") {
    return (
      <a
        href={href ?? "#"}
        onClick={handleClick}
        style={{
          ...baseAnchor,
          display: "grid",
          gridTemplateColumns: "88px 1fr auto",
          gap: 16,
          alignItems: "center",
          padding: "14px",
          background: "var(--bg-2)",
          border: "1px solid var(--border-1)",
          borderRadius: 8,
          transition: "border-color 200ms, box-shadow 200ms",
        }}
      >
        <div style={{ width: 88, height: 88, borderRadius: 6, overflow: "hidden" }}>
          <EventPoster event={event} pickLabel={pickLabel} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              font: "500 11px/1 var(--font-mono)",
              color: "var(--fg-3)",
              marginBottom: 6,
            }}
          >
            <DesignIcon
              name="calendar"
              size={12}
              stroke={2}
              style={{ flexShrink: 0 }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {event.date} · {event.time}
            </span>
          </div>
          <div
            style={{
              font: "700 16px/1.25 var(--font-sans)",
              letterSpacing: "-0.015em",
              marginBottom: 4,
              color: "var(--fg-1)",
            }}
          >
            {event.title}
          </div>
          {/*
            list-variant: краткое описание занимает 1 строку.
            min-height резервирует место даже когда поля нет,
            чтобы строки в списке выглядели ровно.
          */}
          <div
            style={{
              font: "400 13px/1.4 var(--font-sans)",
              color: "var(--fg-2)",
              marginBottom: 2,
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "calc(13px * 1.4)",
            }}
          >
            {event.shortDescription ?? ""}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--fg-3)",
            }}
          >
            <DesignIcon
              name="pin"
              size={12}
              stroke={2}
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                font: "400 13px/1.4 var(--font-sans)",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {[event.venue, event.city, event.org]
                .filter(Boolean)
                .join(" · ") || locationFallback || ""}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              font: "600 13px/1 var(--font-sans)",
              color: "var(--fg-1)",
            }}
          >
            {event.price}
          </div>
          {event.capacity > 0 ? (
            <div
              style={{
                font: "500 11px/1.4 var(--font-mono)",
                color: "var(--fg-3)",
                marginTop: 6,
              }}
            >
              {event.going.toLocaleString()} / {event.capacity.toLocaleString()}
            </div>
          ) : null}
        </div>
      </a>
    );
  }

  if (variant === "editorial") {
    return (
      <a
        href={href ?? "#"}
        onClick={handleClick}
        style={{
          ...baseAnchor,
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          background: "var(--bg-2)",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--border-1)",
        }}
      >
        <div style={{ position: "relative" }}>
          <EventPoster event={event} pickLabel={pickLabel} />
        </div>
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                font: "500 10px/1 var(--font-mono)",
                color: "var(--fg-3)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <DesignIcon
                name="calendar"
                size={12}
                stroke={2}
                style={{ flexShrink: 0 }}
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {event.date} · {event.time}
              </span>
            </div>
            <div
              style={{
                font: "700 15px/1.2 var(--font-sans)",
                letterSpacing: "-0.015em",
                marginBottom: 4,
              }}
            >
              {event.title}
            </div>
            {location ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--fg-2)",
                }}
              >
                <DesignIcon
                  name="pin"
                  size={12}
                  stroke={2}
                  style={{ flexShrink: 0, color: "var(--fg-3)" }}
                />
                <span
                  style={{
                    font: "400 12px/1.4 var(--font-sans)",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {location}
                </span>
              </div>
            ) : null}
          </div>
          <div
            style={{
              font: "600 12px/1 var(--font-sans)",
              color: "var(--ember-500)",
              marginTop: 10,
            }}
          >
            {event.price}
          </div>
        </div>
      </a>
    );
  }

  const pct =
    event.capacity > 0
      ? Math.round((event.going / event.capacity) * 100)
      : null;

  return (
    <a
      href={href ?? "#"}
      onClick={handleClick}
      style={{
        ...baseAnchor,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        borderRadius: 8,
        overflow: "hidden",
        transition:
          "transform 200ms cubic-bezier(0.2,0,0,1), box-shadow 200ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ aspectRatio: "4/3", position: "relative" }}>
        <EventPoster event={event} pickLabel={pickLabel} />
      </div>
      <div
        style={{
          padding: "14px 16px 16px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            font: "500 11px/1 var(--font-mono)",
            color: "var(--fg-3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}
          >
            <DesignIcon
              name="calendar"
              size={13}
              stroke={2}
              style={{ color: "var(--fg-3)", flexShrink: 0 }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {event.date} · {event.time}
            </span>
          </span>
          <span style={{ color: "var(--ember-500)", flexShrink: 0 }}>
            {event.catLabel}
          </span>
        </div>
        {/*
          Заголовок: max 2 строки. min-height равен высоте двух строк
          (font-size 17 × line-height 1.25 × 2 ≈ 42px) — карточки с
          одно- и двухстрочными заголовками выглядят одинаково высокими.
        */}
        <div
          style={{
            font: "700 17px/1.25 var(--font-sans)",
            letterSpacing: "-0.015em",
            marginBottom: 6,
            color: "var(--fg-1)",
            textWrap: "balance",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "calc(17px * 1.25 * 2)",
          }}
        >
          {event.title}
        </div>
        {/*
          Краткое описание: всегда занимает место под две строки, даже когда
          поля нет — иначе высоты карточек в одной сетке разъедутся
          (см. UI-best-practice: предсказуемая структура карточки).
          font-size 13 × line-height 1.45 × 2 ≈ 38px.
        */}
        <div
          style={{
            font: "400 13px/1.45 var(--font-sans)",
            color: "var(--fg-2)",
            marginBottom: 10,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "calc(13px * 1.45 * 2)",
          }}
        >
          {event.shortDescription ?? ""}
        </div>
        {location ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--fg-3)",
              marginBottom: 14,
            }}
          >
            <DesignIcon
              name="pin"
              size={13}
              stroke={2}
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                font: "400 13px/1.4 var(--font-sans)",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {location}
            </span>
          </div>
        ) : null}
        {/* Footer прилипает к низу карточки (marginTop:auto), чтобы
            цена/проценты были на одной линии у соседей в ряду. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTop: "1px dashed var(--border-1)",
            marginTop: "auto",
          }}
        >
          <span
            style={{
              font: "600 13px/1 var(--font-sans)",
              color: "var(--fg-1)",
            }}
          >
            {event.price}
          </span>
          {pct != null ? (
            <span
              style={{
                font: "500 11px/1 var(--font-mono)",
                color: "var(--fg-3)",
              }}
            >
              {pct}% {resolvedSoldLabel}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
};
