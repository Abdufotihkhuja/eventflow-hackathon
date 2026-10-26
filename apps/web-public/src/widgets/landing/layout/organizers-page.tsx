"use client";

import Link from "next/link";

import { useLocale } from "@eventflow/i18n/react";

import { withLocalePath } from "@shared/lib/i18n-routing";
import { Container } from "@shared/ui/container";
import {
  DesignIcon,
  Eyebrow,
  ItalicAccent,
  SectionHead,
  type DesignIconName,
} from "@shared/ui/design-system";

import type { Locale } from "@eventflow/i18n";

import "./organizers-page.css";

const pickLang = (locale: Locale): "en" | "ru" | "uz" => {
  if (locale === "ru") return "ru";
  if (locale === "uz") return "uz";
  return "en";
};

const t = (
  lang: "en" | "ru" | "uz",
  bag: { en: string; ru?: string; uz?: string },
): string =>
  (lang === "ru" ? bag.ru : lang === "uz" ? bag.uz : bag.en) ?? bag.en;

interface Capability {
  ic: DesignIconName;
  t: { en: string; ru: string; uz?: string };
  d: { en: string; ru: string; uz?: string };
}

const CAPABILITIES: Capability[] = [
  {
    ic: "sparkles",
    t: {
      en: "Event creation in minutes",
      ru: "Запуск события за минуты",
      uz: "Tadbirni daqiqalarda yaratish",
    },
    d: {
      en: "Templates, recurring sessions, multi-day agendas — without spreadsheets.",
      ru: "Шаблоны, повторяющиеся сессии, многодневные программы — без таблиц.",
      uz: "Shablonlar, takrorlanuvchi sessiyalar, koʻp kunlik dasturlar — jadvalsiz.",
    },
  },
  {
    ic: "qr",
    t: {
      en: "QR check-in, no queues",
      ru: "QR-чек-ин, без очередей",
      uz: "QR check-in, navbatlarsiz",
    },
    d: {
      en: "Two-tap scanning on any phone. Offline-tolerant. Live counters at the door.",
      ru: "Сканирование в два касания. Работает без сети. Живые счётчики на входе.",
      uz: "Ikki tegishli skanerlash. Oflayn ishlaydi. Eshikda jonli hisoblagichlar.",
    },
  },
  {
    ic: "card",
    t: {
      en: "Transparent payments",
      ru: "Прозрачные продажи",
      uz: "Shaffof toʻlovlar",
    },
    d: {
      en: "Stripe, Payme, Click. Refunds, partial payments, vouchers — built in.",
      ru: "Stripe, Payme, Click. Возвраты, частичные платежи, ваучеры — из коробки.",
      uz: "Stripe, Payme, Click. Qaytarish, boʻlib toʻlash, vaucherlar.",
    },
  },
  {
    ic: "chart",
    t: {
      en: "Reports that decide",
      ru: "Отчёты, на которых решают",
      uz: "Qaror qabul qiluvchi hisobotlar",
    },
    d: {
      en: "Funnel, attendance, source, revenue — by event, by series, by team.",
      ru: "Воронка, посещаемость, источник, выручка — по событию, серии, команде.",
      uz: "Voronka, qatnashish, manba, daromad — tadbir, seriya va jamoa boʻyicha.",
    },
  },
  {
    ic: "download",
    t: {
      en: "CRM export & API",
      ru: "CRM-экспорт и API",
      uz: "CRM eksport va API",
    },
    d: {
      en: "Push attendees to HubSpot, Bitrix, Notion, or your warehouse via webhook.",
      ru: "Передавай участников в HubSpot, Bitrix, Notion или хранилище — по вебхуку.",
      uz: "Qatnashchilarni HubSpot, Bitrix, Notion uchun webhook orqali joʻnatish.",
    },
  },
  {
    ic: "users",
    t: { en: "Team & roles", ru: "Команда и роли", uz: "Jamoa va rollar" },
    d: {
      en: "Producers, door staff, designers — clean roles, audit trail, no shared logins.",
      ru: "Продюсеры, ребята на входе, дизайнеры — чистые роли, журнал, никаких общих паролей.",
      uz: "Prodyuserlar, eshikdagi xodimlar, dizaynerlar — toza rollar, audit, umumiy parollar yoʻq.",
    },
  },
];

interface WorkflowStep {
  n: string;
  t: { en: string; ru: string; uz?: string };
  d: { en: string; ru: string; uz?: string };
}

const WORKFLOW: WorkflowStep[] = [
  {
    n: "01",
    t: { en: "Create", ru: "Создать", uz: "Yaratish" },
    d: {
      en: "Build the page, agenda, ticket types.",
      ru: "Соберите страницу, программу, типы билетов.",
      uz: "Sahifa, dastur va chiptalar yaratiladi.",
    },
  },
  {
    n: "02",
    t: { en: "Sell", ru: "Продавать", uz: "Sotish" },
    d: {
      en: "Open registration. Take payment. Track funnel.",
      ru: "Откройте регистрацию. Принимайте оплату. Следите за воронкой.",
      uz: "Roʻyxatdan oʻtkazing. Toʻlovni qabul qiling. Voronkani kuzating.",
    },
  },
  {
    n: "03",
    t: { en: "Run", ru: "Провести", uz: "Oʻtkazish" },
    d: {
      en: "Door check-in via QR. Live count. Real-time program.",
      ru: "Чек-ин по QR. Живой счётчик. Программа в реальном времени.",
      uz: "QR orqali eshikda check-in. Jonli hisob. Real vaqtdagi dastur.",
    },
  },
  {
    n: "04",
    t: { en: "Report", ru: "Отчитаться", uz: "Hisobot" },
    d: {
      en: "Revenue, attendance, NPS — exported to your stack.",
      ru: "Выручка, посещаемость, NPS — выгружено в ваш стек.",
      uz: "Daromad, qatnashish, NPS — sizning stekingizga eksport.",
    },
  },
];

interface PricingPlan {
  name: { en: string; ru: string; uz?: string };
  price: { en: string; ru: string; uz?: string };
  priceSuffix?: { en: string; ru: string; uz?: string };
  sub: { en: string; ru: string; uz?: string };
  features: { en: string; ru: string; uz?: string }[];
  cta: { en: string; ru: string; uz?: string };
  featured?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    name: { en: "Start", ru: "Старт", uz: "Start" },
    price: { en: "Free", ru: "Бесплатно", uz: "Bepul" },
    sub: {
      en: "8% per ticket",
      ru: "8% с каждого билета",
      uz: "Har bir chiptadan 8%",
    },
    features: [
      {
        en: "Basic statistics",
        ru: "Базовая статистика",
        uz: "Asosiy statistika",
      },
      {
        en: "QR check-in (arrival only)",
        ru: "QR-чек-ин (только вход)",
        uz: "QR check-in (faqat kirish)",
      },
      {
        en: "Limited image & certificate generation",
        ru: "Ограниченная генерация изображений и сертификатов",
        uz: "Cheklangan rasm va sertifikat generatsiyasi",
      },
      {
        en: "1 user in the organisation",
        ru: "Один пользователь в организации",
        uz: "Tashkilotda 1 foydalanuvchi",
      },
    ],
    cta: { en: "Start free", ru: "Начать бесплатно", uz: "Bepul boshlash" },
  },
  {
    name: { en: "Standard", ru: "Стандарт", uz: "Standart" },
    price: { en: "$77", ru: "$77", uz: "$77" },
    priceSuffix: {
      en: "/mo",
      ru: "/мес",
      uz: "/oy",
    },
    sub: {
      en: "+ 6% per ticket",
      ru: "+ 6% с каждого билета",
      uz: "+ har bir chiptadan 6%",
    },
    features: [
      {
        en: "Everything in Start, plus:",
        ru: "Всё из «Старта», плюс:",
        uz: "«Start»dagi hammasi, va:",
      },
      {
        en: "Event statistics & forecasting",
        ru: "Статистика и прогнозы событий",
        uz: "Tadbir statistikasi va prognozlar",
      },
      {
        en: "AI voice agent — 150 min / month",
        ru: "AI-голосовой агент — 150 мин/мес",
        uz: "AI ovozli agent — oyiga 150 daqiqa",
      },
      {
        en: "Certificates (blockchain) & images — 200 / mo",
        ru: "Сертификаты (блокчейн) и изображения — 200 шт.",
        uz: "Sertifikatlar (blokcheyn) va rasmlar — 200 ta",
      },
      {
        en: "Up to 3 staff + Task Board",
        ru: "До 3 сотрудников и «Доска задач»",
        uz: "3 tagacha xodim va «Vazifalar doskasi»",
      },
    ],
    cta: { en: "Choose Standard", ru: "Выбрать «Стандарт»", uz: "Standartni tanlash" },
    featured: true,
  },
  {
    name: { en: "Pro", ru: "Pro", uz: "Pro" },
    price: { en: "$250", ru: "$250", uz: "$250" },
    priceSuffix: {
      en: "/mo",
      ru: "/мес",
      uz: "/oy",
    },
    sub: {
      en: "+ 4% per ticket",
      ru: "+ 4% с каждого билета",
      uz: "+ har bir chiptadan 4%",
    },
    features: [
      {
        en: "Everything in Standard, plus:",
        ru: "Всё из «Стандарта», плюс:",
        uz: "«Standart»dagi hammasi, va:",
      },
      {
        en: "Statistics, forecasting & SLA",
        ru: "Статистика, прогнозы и SLA",
        uz: "Statistika, prognozlar va SLA",
      },
      {
        en: "AI voice agent — 350 min / month",
        ru: "AI-голосовой агент — 350 мин/мес",
        uz: "AI ovozli agent — oyiga 350 daqiqa",
      },
      {
        en: "Certificates (blockchain) & images — 500 / mo",
        ru: "Сертификаты (блокчейн) и изображения — 500 шт.",
        uz: "Sertifikatlar (blokcheyn) va rasmlar — 500 ta",
      },
      {
        en: "Up to 10 staff + Task Board",
        ru: "До 10 сотрудников и «Доска задач»",
        uz: "10 tagacha xodim va «Vazifalar doskasi»",
      },
    ],
    cta: { en: "Choose Pro", ru: "Выбрать Pro", uz: "Pro tanlash" },
  },
];

interface AddOn {
  ic: DesignIconName;
  t: { en: string; ru: string; uz?: string };
  d: { en: string; ru: string; uz?: string };
}

const ADD_ONS: AddOn[] = [
  {
    ic: "sparkles",
    t: {
      en: "Advertising from $50",
      ru: "Реклама от $50",
      uz: "Reklama $50 dan",
    },
    d: {
      en: "Featured placement, SMS campaigns, email campaigns.",
      ru: "Featured-размещение, SMS- и email-рассылки.",
      uz: "Featured joylashuv, SMS va email tarqatmalar.",
    },
  },
  {
    ic: "card",
    t: {
      en: "Coins for extra AI tools",
      ru: "Coin-система для доп. AI",
      uz: "Qoʻshimcha AI uchun koinlar",
    },
    d: {
      en: "100 AI-call minutes — $35 · 100 image generations — $15.",
      ru: "100 минут AI-звонков — $35 · 100 генераций изображений — $15.",
      uz: "100 daqiqa AI-qoʻngʻiroq — $35 · 100 rasm generatsiyasi — $15.",
    },
  },
];

const TRUSTED_BY = [
  "Loft Records",
  "Tashkent.dev",
  "Silk Road Week",
  "Chust Kitchens",
  "IT Park UZ",
  "Plov & Poetry",
  "Almaty Open",
  "Founders UZ",
];

export function OrganizersPage(): React.ReactNode {
  const locale = useLocale();
  const lang = pickLang(locale);
  const signupHref = withLocalePath("/signup", locale);

  return (
    <div style={{ background: "var(--bg-1)", color: "var(--fg-1)" }}>
      {/* HERO */}
      <section
        style={{
          paddingBlock: "72px 56px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            width: 760,
            height: 480,
            transform: "translateX(-50%)",
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, var(--ember-100) 0%, transparent 65%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <Container size="narrow" style={{ position: "relative", zIndex: 1 }}>
          <Eyebrow align="center">
            {t(lang, {
              en: "For organizers",
              ru: "Для организаторов",
              uz: "Tashkilotchilar uchun",
            })}
          </Eyebrow>
          <h1
            className="cm-org-h1"
            style={{
              font: "700 clamp(36px, 8.5vw, 88px)/0.96 var(--font-sans)",
              letterSpacing: "-0.045em",
              margin: "24px auto 0",
              textWrap: "balance",
              color: "var(--ink-400)",
              maxWidth: "18ch",
            }}
          >
            {lang === "ru" ? (
              <>
                Меньше ручной работы.
                <br />
                Больше <ItalicAccent>хороших событий</ItalicAccent>.
              </>
            ) : lang === "uz" ? (
              <>
                Kamroq qoʻl mehnati.
                <br />
                Koʻproq <ItalicAccent>yaxshi tadbirlar</ItalicAccent>.
              </>
            ) : (
              <>
                Less manual work.
                <br />
                More <ItalicAccent>good events</ItalicAccent>.
              </>
            )}
          </h1>
          <p
            style={{
              font: "400 18px/1.6 var(--font-sans)",
              color: "var(--fg-2)",
              margin: "24px auto 0",
              maxWidth: 560,
              textWrap: "balance",
            }}
          >
            {t(lang, {
              en: "Eventflow is the workspace where teams launch events, take registrations and payments, check guests in by QR, and watch the whole thing on one map.",
              ru: "Eventflow — рабочее пространство, в котором команда запускает события, принимает регистрации и оплаты, проверяет гостей по QR и видит всё это одной картой.",
              uz: "Eventflow — bu jamoalar tadbirlarni ishga tushiradigan, roʻyxatdan oʻtkazadigan, toʻlovlarni qabul qiladigan, mehmonlarni QR orqali tekshiradigan ish makoni.",
            })}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginTop: 36,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={signupHref}
              style={{
                background: "var(--ember-400)",
                color: "var(--bone-50)",
                font: "600 14px/1 var(--font-sans)",
                padding: "14px 22px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
              }}
            >
              {t(lang, {
                en: "Start free",
                ru: "Начать бесплатно",
                uz: "Bepul boshlash",
              })}
              <DesignIcon name="arrow" size={15} stroke={2} />
            </Link>
            <button
              type="button"
              style={{
                background: "transparent",
                color: "var(--ink-400)",
                border: "1px solid var(--border-1)",
                font: "600 14px/1 var(--font-sans)",
                padding: "14px 22px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              {t(lang, {
                en: "See a 15-min demo",
                ru: "Демо за 15 минут",
                uz: "15 daqiqa demo",
              })}
            </button>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 18,
              marginTop: 28,
              font: "500 12px/1 var(--font-mono)",
              letterSpacing: "0.04em",
              color: "var(--fg-3)",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              { en: "NO CARD", ru: "БЕЗ КАРТЫ", uz: "KARTASIZ" },
              { en: "14-DAY TRIAL", ru: "14 ДНЕЙ ТРИАЛ", uz: "14 KUN" },
              {
                en: "CANCEL ANYTIME",
                ru: "ОТМЕНА В 1 КЛИК",
                uz: "BEKOR QILINADI",
              },
            ].map((item, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <DesignIcon
                  name="check"
                  size={14}
                  stroke={2.4}
                  style={{ color: "var(--ember-500)" }}
                />
                {t(lang, item)}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* DASHBOARD MOCK */}
      <section
        style={{
          background: "var(--bg-2)",
          borderTop: "1px solid var(--border-1)",
          borderBottom: "1px solid var(--border-1)",
          paddingBlock: "56px 64px",
        }}
      >
        <Container size="wide">
          <div
            className="cm-org-dashboard"
            style={{
              borderRadius: 14,
              border: "1px solid var(--border-1)",
              background: "var(--bone-50)",
              padding: 24,
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              gap: 24,
            }}
          >
            <div
              style={{
                padding: 16,
                background: "var(--bone-200)",
                borderRadius: 10,
                font: "500 12px/1.6 var(--font-mono)",
                color: "var(--fg-2)",
              }}
            >
              <div
                style={{
                  font: "700 13px/1.2 var(--font-sans)",
                  color: "var(--ink-400)",
                  marginBottom: 12,
                }}
              >
                Loft Records ▾
              </div>
              {[
                { en: "Overview", ru: "Обзор", uz: "Umumiy" },
                { en: "Events", ru: "События", uz: "Tadbirlar" },
                { en: "Registrations", ru: "Регистрации", uz: "Roʻyxatlar" },
                { en: "Payments", ru: "Платежи", uz: "Toʻlovlar" },
                { en: "Door", ru: "Вход", uz: "Kirish" },
                { en: "Reports", ru: "Отчёты", uz: "Hisobotlar" },
                { en: "Team", ru: "Команда", uz: "Jamoa" },
                { en: "Settings", ru: "Настройки", uz: "Sozlamalar" },
              ].map((nav, i) => (
                <div
                  key={nav.en}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: i === 0 ? "var(--ink-400)" : "transparent",
                    color: i === 0 ? "var(--bone-100)" : "var(--fg-2)",
                    marginBottom: 2,
                  }}
                >
                  {t(lang, nav)}
                </div>
              ))}
            </div>
            <div>
              <div
                className="cm-org-kpis"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {[
                  {
                    l: { en: "Tickets sold", ru: "Продано билетов", uz: "Sotilgan chiptalar" },
                    v: "1,247",
                    d: "+24%",
                  },
                  {
                    l: { en: "Revenue", ru: "Выручка", uz: "Daromad" },
                    v: "294M UZS",
                    d: "+18%",
                  },
                  {
                    l: { en: "Checked in", ru: "Отметились", uz: "Kelganlar" },
                    v: "892",
                    d: t(lang, { en: "71% capacity", ru: "71% заполнено", uz: "71% toʻldi" }),
                  },
                  {
                    l: { en: "Refunds", ru: "Возвраты", uz: "Qaytarishlar" },
                    v: "12",
                    d: "0.9%",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.l.en}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      border: "1px solid var(--border-1)",
                      background: "var(--bg-1)",
                    }}
                  >
                    <div
                      style={{
                        font: "500 10px/1 var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--fg-3)",
                        marginBottom: 8,
                      }}
                    >
                      {t(lang, kpi.l)}
                    </div>
                    <div
                      style={{
                        font: "700 22px/1 var(--font-sans)",
                        letterSpacing: "-0.02em",
                        color: "var(--ink-400)",
                      }}
                    >
                      {kpi.v}
                    </div>
                    <div
                      style={{
                        font: "500 11px/1 var(--font-mono)",
                        color: "var(--ember-500)",
                        marginTop: 6,
                      }}
                    >
                      {kpi.d}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  height: 180,
                  borderRadius: 10,
                  border: "1px solid var(--border-1)",
                  background:
                    "linear-gradient(180deg, rgba(234,88,12,0.08) 0%, rgba(234,88,12,0) 70%)",
                  position: "relative",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    font: "500 11px/1 var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--fg-3)",
                  }}
                >
                  {t(lang, {
                    en: "Sales · last 7 days",
                    ru: "Продажи · последние 7 дней",
                    uz: "Sotuvlar · soʻnggi 7 kun",
                  })}
                </div>
                <svg
                  viewBox="0 0 600 130"
                  preserveAspectRatio="none"
                  style={{
                    position: "absolute",
                    inset: "40px 16px 16px",
                    width: "calc(100% - 32px)",
                    height: "calc(100% - 56px)",
                  }}
                >
                  <defs>
                    <linearGradient id="ef-org-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(234,88,12,0.4)" />
                      <stop offset="100%" stopColor="rgba(234,88,12,0)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 100 L100 80 L200 90 L300 60 L400 50 L500 30 L600 18 L600 130 L0 130 Z"
                    fill="url(#ef-org-grad)"
                  />
                  <path
                    d="M0 100 L100 80 L200 90 L300 60 L400 50 L500 30 L600 18"
                    stroke="var(--ember-400)"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CAPABILITIES */}
      <section
        style={{
          paddingBlock: "88px 56px",
        }}
      >
        <Container size="wide">
        <SectionHead
          underline
          kicker={t(lang, {
            en: "Capabilities",
            ru: "Возможности",
            uz: "Imkoniyatlar",
          })}
          title={t(lang, {
            en: "Everything an event ",
            ru: "Всё, что нужно ",
            uz: "Tadbir uchun zarur ",
          })}
          italic={t(lang, {
            en: "actually needs",
            ru: "для события",
            uz: "hammasi",
          })}
        />
        <div className="cm-org-capabilities">
          {CAPABILITIES.map((c) => (
            <div
              key={c.ic}
              style={{
                padding: "24px 24px 26px",
                background: "var(--bone-50)",
                border: "1px solid var(--border-1)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "var(--ember-50)",
                  color: "var(--ember-500)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DesignIcon name={c.ic} size={22} stroke={1.7} />
              </div>
              <div
                style={{
                  font: "700 17px/1.25 var(--font-sans)",
                  letterSpacing: "-0.015em",
                  color: "var(--ink-400)",
                  textWrap: "balance",
                }}
              >
                {t(lang, c.t)}
              </div>
              <div
                style={{
                  font: "400 14px/1.6 var(--font-sans)",
                  color: "var(--fg-2)",
                  textWrap: "pretty",
                }}
              >
                {t(lang, c.d)}
              </div>
            </div>
          ))}
        </div>
        </Container>
      </section>

      {/* WORKFLOW */}
      <section
        style={{
          paddingBlock: "40px 88px",
        }}
      >
        <Container size="wide">
        <SectionHead
          underline
          kicker={t(lang, {
            en: "How it works",
            ru: "Как это работает",
            uz: "Qanday ishlaydi",
          })}
          title={t(lang, {
            en: "From the spark ",
            ru: "От идеи ",
            uz: "Gʻoyadan ",
          })}
          italic={t(lang, {
            en: "to the report",
            ru: "до отчёта",
            uz: "hisobotgacha",
          })}
        />
        <div className="cm-org-workflow">
          {WORKFLOW.map((w, i) => (
            <div
              key={w.n}
              style={{
                padding: "24px 24px 28px",
                borderLeft: i ? "1px solid var(--border-1)" : "none",
              }}
            >
              <div
                style={{
                  font: "500 11px/1 var(--font-mono)",
                  letterSpacing: "0.08em",
                  color: "var(--ember-500)",
                  marginBottom: 16,
                }}
              >
                {w.n}
              </div>
              <div
                style={{
                  font: "700 22px/1.15 var(--font-sans)",
                  letterSpacing: "-0.02em",
                  color: "var(--ink-400)",
                  marginBottom: 10,
                }}
              >
                {t(lang, w.t)}
              </div>
              <div
                style={{
                  font: "400 14px/1.55 var(--font-sans)",
                  color: "var(--fg-2)",
                }}
              >
                {t(lang, w.d)}
              </div>
            </div>
          ))}
        </div>
        </Container>
      </section>

      {/* TESTIMONIAL */}
      <section
        style={{
          background: "var(--bg-2)",
          borderTop: "1px solid var(--border-1)",
          borderBottom: "1px solid var(--border-1)",
          paddingBlock: "88px 96px",
        }}
      >
        <Container size="narrow" style={{ textAlign: "center" }}>
          <Eyebrow align="center">
            {t(lang, {
              en: "Voice of an organizer",
              ru: "Голос организатора",
              uz: "Tashkilotchi ovozi",
            })}
          </Eyebrow>
          <blockquote
            style={{
              font: "400 38px/1.25 var(--font-display)",
              fontStyle: "italic",
              letterSpacing: "-0.025em",
              color: "var(--ink-400)",
              margin: "28px auto 0",
              maxWidth: 880,
              textWrap: "balance",
            }}
          >
            {t(lang, {
              en: '"In three months Eventflow replaced three tools and one full-time hire. Registrations, payments, check-in and report — one producer, one screen."',
              ru: "«За три месяца Eventflow заменил нам три инструмента и одного человека. Регистрации, оплаты, чек-ин и отчёт — теперь у одного продюсера и одного экрана».",
              uz: "«Uch oy ichida Eventflow bizning uchta vositamizni va bitta xodimimizni almashtirdi. Roʻyxatga olish, toʻlovlar, check-in va hisobot — endi bitta prodyuser va bitta ekranda.»",
            })}
          </blockquote>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              marginTop: 32,
              padding: "12px 18px",
              borderRadius: 999,
              background: "var(--bone-50)",
              border: "1px solid var(--border-1)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, hsl(22 78% 48%), hsl(38 78% 56%))",
                color: "var(--bone-50)",
                font: "600 13px/1 var(--font-sans)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              NM
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  font: "600 13px/1.2 var(--font-sans)",
                  color: "var(--ink-400)",
                }}
              >
                Nargiza Mirzaeva
              </div>
              <div
                style={{
                  font: "500 11px/1 var(--font-mono)",
                  color: "var(--fg-3)",
                  letterSpacing: "0.04em",
                  marginTop: 4,
                }}
              >
                HEAD OF EVENTS · IT PARK UZ
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* PRICING */}
      <section
        style={{
          paddingBlock: "88px 56px",
        }}
      >
        <Container size="wide">
        <SectionHead
          underline
          kicker={t(lang, { en: "Pricing", ru: "Тарифы", uz: "Narxlar" })}
          title={t(lang, {
            en: "Grows with ",
            ru: "Растёт ",
            uz: "Tadbiringiz ",
          })}
          italic={t(lang, {
            en: "your event",
            ru: "вместе с событием",
            uz: "bilan oʻsadi",
          })}
        />
        <div className="cm-org-plans">
          {PLANS.map((p) => {
            const featured = p.featured;
            return (
              <div
                key={p.name.en}
                style={{
                  padding: "28px 26px",
                  background: featured ? "var(--ink-400)" : "var(--bone-50)",
                  color: featured ? "var(--bone-100)" : "var(--ink-400)",
                  border: `1px solid ${
                    featured ? "var(--ink-400)" : "var(--border-1)"
                  }`,
                  borderRadius: 14,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: featured
                    ? "0 18px 40px rgba(28,25,23,0.14)"
                    : "none",
                }}
              >
                {featured ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 22,
                      background: "var(--ember-400)",
                      color: "var(--bone-50)",
                      font: "600 10px/1 var(--font-sans)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      padding: "6px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {t(lang, {
                      en: "Popular",
                      ru: "Популярно",
                      uz: "Mashhur",
                    })}
                  </div>
                ) : null}
                <div
                  style={{
                    font: "500 11px/1 var(--font-sans)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: featured ? "rgba(251,251,250,0.6)" : "var(--fg-3)",
                    marginBottom: 14,
                  }}
                >
                  {t(lang, p.name)}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <div
                    style={{
                      font: "700 44px/1 var(--font-sans)",
                      letterSpacing: "-0.035em",
                    }}
                  >
                    {t(lang, p.price)}
                  </div>
                  {p.priceSuffix ? (
                    <div
                      style={{
                        font: "500 13px/1 var(--font-sans)",
                        color: featured
                          ? "rgba(251,251,250,0.6)"
                          : "var(--fg-3)",
                      }}
                    >
                      {t(lang, p.priceSuffix)}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    font: "400 13px/1.5 var(--font-sans)",
                    color: featured ? "rgba(251,251,250,0.7)" : "var(--fg-2)",
                    marginTop: 12,
                  }}
                >
                  {t(lang, p.sub)}
                </div>
                <div
                  style={{
                    height: 1,
                    background: featured
                      ? "rgba(251,251,250,0.12)"
                      : "var(--border-1)",
                    margin: "24px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {p.features.map((f, j) => (
                    <div
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        font: "500 13px/1.5 var(--font-sans)",
                        color: featured
                          ? "rgba(251,251,250,0.92)"
                          : "var(--fg-1)",
                      }}
                    >
                      <span style={{ color: "var(--ember-400)", marginTop: 2 }}>
                        <DesignIcon name="check" size={14} stroke={2.4} />
                      </span>
                      {t(lang, f)}
                    </div>
                  ))}
                </div>
                <Link
                  href={signupHref}
                  style={{
                    marginTop: 26,
                    background: featured ? "var(--ember-400)" : "transparent",
                    color: featured ? "var(--bone-50)" : "var(--ink-400)",
                    border: featured ? "none" : "1px solid var(--ink-400)",
                    font: "600 13px/1 var(--font-sans)",
                    padding: "13px 16px",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    textDecoration: "none",
                  }}
                >
                  {t(lang, p.cta)}
                  <DesignIcon name="arrow" size={14} stroke={2} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* ADD-ONS / EXTRAS */}
        <div className="cm-org-addons">
          {ADD_ONS.map((a) => (
            <div
              key={a.ic}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "18px 20px",
                background: "var(--bone-50)",
                border: "1px solid var(--border-1)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  background: "var(--ember-50)",
                  color: "var(--ember-500)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <DesignIcon name={a.ic} size={19} stroke={1.7} />
              </div>
              <div>
                <div
                  style={{
                    font: "700 14px/1.3 var(--font-sans)",
                    letterSpacing: "-0.01em",
                    color: "var(--ink-400)",
                  }}
                >
                  {t(lang, a.t)}
                </div>
                <div
                  style={{
                    font: "400 13px/1.5 var(--font-sans)",
                    color: "var(--fg-2)",
                    marginTop: 4,
                  }}
                >
                  {t(lang, a.d)}
                </div>
              </div>
            </div>
          ))}
        </div>
        </Container>
      </section>

      {/* TRUSTED BY */}
      <section
        style={{
          paddingBlock: "40px 96px",
        }}
      >
        <Container size="wide">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            paddingTop: 28,
            borderTop: "1px solid var(--border-1)",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              font: "500 11px/1.4 var(--font-sans)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--fg-3)",
            }}
          >
            {t(lang, {
              en: "Already running on Eventflow",
              ru: "Уже работают на Eventflow",
              uz: "Eventflowʼda ishlaydi",
            })}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              flexWrap: "wrap",
              flex: 1,
            }}
          >
            {TRUSTED_BY.map((name, i) => (
              <span
                key={name}
                style={{
                  font: "600 14px/1 var(--font-sans)",
                  color: "var(--fg-3)",
                  letterSpacing: i % 2 ? "-0.01em" : "0.01em",
                  fontStyle: i === 2 || i === 5 ? "italic" : "normal",
                  fontFamily:
                    i === 2 || i === 5 ? "var(--font-display)" : "inherit",
                  fontWeight: i === 2 ? 400 : 600,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
        </Container>
      </section>

      {/* FINAL CTA */}
      <section style={{ paddingBlock: "0 96px" }}>
        <Container size="wide">
        <div
          className="cm-org-cta"
          style={{
            background: "var(--ink-400)",
            color: "var(--bone-100)",
            borderRadius: 18,
            padding: "64px 56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 48,
            position: "relative",
            overflow: "hidden",
            flexWrap: "wrap",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 360,
              height: 360,
              background:
                "radial-gradient(circle, rgba(234,88,12,0.4) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", maxWidth: 620 }}>
            <Eyebrow color="rgba(251,251,250,0.7)">
              {t(lang, { en: "Ready?", ru: "Готовы?", uz: "Tayyormisiz?" })}
            </Eyebrow>
            <div
              style={{
                font: "700 44px/1.05 var(--font-sans)",
                letterSpacing: "-0.03em",
                marginTop: 18,
                textWrap: "balance",
              }}
            >
              {lang === "ru" ? (
                <>
                  Запустите ваше первое событие{" "}
                  <ItalicAccent color="var(--ember-300)">сегодня</ItalicAccent>.
                </>
              ) : lang === "uz" ? (
                <>
                  Birinchi tadbiringizni{" "}
                  <ItalicAccent color="var(--ember-300)">bugun</ItalicAccent>{" "}
                  ishga tushiring.
                </>
              ) : (
                <>
                  Run your first event{" "}
                  <ItalicAccent color="var(--ember-300)">today</ItalicAccent>.
                </>
              )}
            </div>
            <p
              style={{
                font: "400 15px/1.6 var(--font-sans)",
                color: "rgba(251,251,250,0.7)",
                marginTop: 14,
                maxWidth: 540,
              }}
            >
              {t(lang, {
                en: "Build the page, open registrations and ship the QR scanner to your door team — in 15 minutes.",
                ru: "Создайте страницу, откройте регистрации и пришлите команде QR-сканер за 15 минут.",
                uz: "Sahifa yarating, roʻyxatga olishni oching va 15 daqiqada jamoaga QR skanerni yuboring.",
              })}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative",
            }}
          >
            <Link
              href={signupHref}
              style={{
                background: "var(--ember-400)",
                color: "var(--bone-50)",
                font: "600 14px/1 var(--font-sans)",
                padding: "15px 26px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              {t(lang, {
                en: "Create an event",
                ru: "Создать событие",
                uz: "Tadbir yaratish",
              })}
              <DesignIcon name="arrow" size={15} stroke={2} />
            </Link>
            <button
              type="button"
              style={{
                background: "transparent",
                color: "var(--bone-100)",
                border: "1px solid rgba(251,251,250,0.3)",
                font: "600 14px/1 var(--font-sans)",
                padding: "15px 26px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              {t(lang, {
                en: "Talk to sales",
                ru: "Поговорить с продажами",
                uz: "Sotuvchilar bilan",
              })}
            </button>
          </div>
        </div>
        </Container>
      </section>
    </div>
  );
}
