"use client";

import { useLocale } from "@eventflow/i18n/react";

import { Container } from "@shared/ui/container";
import {
  DesignIcon,
  Eyebrow,
  ItalicAccent,
  SectionHead,
  type DesignIconName,
} from "@shared/ui/design-system";

import type { Locale } from "@eventflow/i18n";

import "./about-page.css";

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

interface Principle {
  ic: DesignIconName;
  t: { en: string; ru: string; uz?: string };
  d: { en: string; ru: string; uz?: string };
}

const PRINCIPLES: Principle[] = [
  {
    ic: "ticket",
    t: {
      en: "Registration & tickets",
      ru: "Регистрация и билеты",
      uz: "Roʻyxatdan oʻtish va chiptalar",
    },
    d: {
      en: "Publish an event page, open registration and issue a ticket with a QR code to every guest — in a few minutes.",
      ru: "Опубликуйте страницу события, откройте регистрацию и выдайте каждому гостю билет с QR-кодом — за несколько минут.",
      uz: "Tadbir sahifasini chop eting, roʻyxatdan oʻtishni oching va har bir mehmonga QR-kodli chipta bering — bir necha daqiqada.",
    },
  },
  {
    ic: "qr",
    t: {
      en: "QR check-in",
      ru: "Чек-ин по QR-коду",
      uz: "QR-kod orqali kirish",
    },
    d: {
      en: "Scan tickets at the door from a phone — attendance is recorded in seconds and lands straight in your reports.",
      ru: "Сканируйте билеты на входе с телефона — присутствие фиксируется за секунды и сразу попадает в отчёты.",
      uz: "Chiptalarni eshik oldida telefondan skanerlang — kelganlar soniyalarda qayd etiladi va hisobotlarga tushadi.",
    },
  },
  {
    ic: "pin",
    t: {
      en: "Local to Uzbekistan",
      ru: "Локально для Узбекистана",
      uz: "Oʻzbekiston uchun",
    },
    d: {
      en: "Prices in soʻm, payments via Payme and Click, an interface in Russian and Uzbek, support from Tashkent.",
      ru: "Цены в сумах, оплата через Payme и Click, интерфейс на русском и узбекском, поддержка из Ташкента.",
      uz: "Narxlar soʻmda, Payme va Click orqali toʻlov, rus va oʻzbek tilidagi interfeys, Toshkentdan qoʻllab-quvvatlash.",
    },
  },
  {
    ic: "chart",
    t: {
      en: "Clear analytics",
      ru: "Понятная аналитика",
      uz: "Tushunarli tahlil",
    },
    d: {
      en: "Registrations, ticket sales and revenue in one dashboard. Export your data whenever you need it.",
      ru: "Регистрации, продажи билетов и доход — в одной панели. Выгружайте данные когда нужно.",
      uz: "Roʻyxatdan oʻtishlar, chipta savdosi va daromad — bitta panelda. Maʼlumotlarni xohlagan vaqtda eksport qiling.",
    },
  },
];

interface City {
  name: { en: string; ru: string; uz?: string };
  region: { en: string; ru: string; uz?: string };
  primary?: boolean;
}

const CITIES: City[] = [
  {
    name: { en: "Tashkent", ru: "Ташкент", uz: "Toshkent" },
    region: {
      en: "Tashkent region",
      ru: "Ташкентская область",
      uz: "Toshkent viloyati",
    },
    primary: true,
  },
  {
    name: { en: "Samarkand", ru: "Самарканд", uz: "Samarqand" },
    region: {
      en: "Samarkand region",
      ru: "Самаркандская область",
      uz: "Samarqand viloyati",
    },
  },
  {
    name: { en: "Bukhara", ru: "Бухара", uz: "Buxoro" },
    region: {
      en: "Bukhara region",
      ru: "Бухарская область",
      uz: "Buxoro viloyati",
    },
  },
  {
    name: { en: "Namangan", ru: "Наманган", uz: "Namangan" },
    region: {
      en: "Fergana valley",
      ru: "Ферганская долина",
      uz: "Fargʻona vodiysi",
    },
  },
  {
    name: { en: "Andijan", ru: "Андижан", uz: "Andijon" },
    region: {
      en: "Fergana valley",
      ru: "Ферганская долина",
      uz: "Fargʻona vodiysi",
    },
  },
  {
    name: { en: "Fergana", ru: "Фергана", uz: "Fargʻona" },
    region: {
      en: "Fergana valley",
      ru: "Ферганская долина",
      uz: "Fargʻona vodiysi",
    },
  },
  {
    name: { en: "Nukus", ru: "Нукус", uz: "Nukus" },
    region: {
      en: "Karakalpakstan",
      ru: "Каракалпакстан",
      uz: "Qoraqalpogʻiston",
    },
  },
  {
    name: { en: "Khiva", ru: "Хива", uz: "Xiva" },
    region: {
      en: "Khorezm region",
      ru: "Хорезмская область",
      uz: "Xorazm viloyati",
    },
  },
];

export function AboutPage(): React.ReactNode {
  const locale = useLocale();
  const lang = pickLang(locale);

  return (
    <div style={{ background: "var(--bg-1)", color: "var(--fg-1)" }}>
      {/* HERO */}
      <section
        style={{
          paddingBlock: "80px 56px",
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
            width: 800,
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
              en: "About us",
              ru: "О нас",
              uz: "Biz haqimizda",
            })}
          </Eyebrow>
          <h1
            className="cm-about-h1"
            style={{
              font: "700 80px/0.96 var(--font-sans)",
              letterSpacing: "-0.045em",
              margin: "24px auto 0",
              textWrap: "balance",
              color: "var(--ink-400)",
              maxWidth: "18ch",
            }}
          >
            {lang === "ru" ? (
              <>
                Всё для ваших событий
                <br />
                <ItalicAccent>в одном месте</ItalicAccent>.
              </>
            ) : lang === "uz" ? (
              <>
                Tadbirlaringiz uchun hammasi
                <br />
                <ItalicAccent>bir joyda</ItalicAccent>.
              </>
            ) : (
              <>
                Everything for your events
                <br />
                <ItalicAccent>in one place</ItalicAccent>.
              </>
            )}
          </h1>
          <p
            style={{
              font: "400 18px/1.6 var(--font-sans)",
              color: "var(--fg-2)",
              margin: "24px auto 0",
              maxWidth: 640,
              textWrap: "balance",
            }}
          >
            {t(lang, {
              en: "Eventflow is a platform for event organizers and guests in Uzbekistan. Registration, QR tickets, door check-in and analytics — in one place.",
              ru: "Eventflow — платформа для организаторов и гостей мероприятий в Узбекистане. Регистрация, билеты с QR-кодом, контроль входа и аналитика — в одном кабинете.",
              uz: "Eventflow — Oʻzbekistondagi tadbir tashkilotchilari va mehmonlar uchun platforma. Roʻyxatdan oʻtish, QR-chiptalar, kirishda nazorat va tahlil — bir joyda.",
            })}
          </p>
        </Container>
      </section>

      {/* MANIFESTO */}
      <section style={{ paddingBlock: "40px 88px" }}>
        <Container size="narrow">
        <blockquote
          style={{
            font: "400 38px/1.3 var(--font-display)",
            fontStyle: "italic",
            letterSpacing: "-0.025em",
            color: "var(--ink-400)",
            margin: 0,
            textWrap: "balance",
            textAlign: "center",
            position: "relative",
            padding: "0 40px",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: -20,
              font: "400 100px/1 var(--font-display)",
              fontStyle: "italic",
              color: "var(--ember-400)",
              opacity: 0.3,
            }}
          >
            “
          </span>
          {t(lang, {
            en: "Running an event shouldn't mean juggling spreadsheets, chats and paper lists. Create a page, open registration, sell tickets and check guests in by QR — all in one place.",
            ru: "Организация события не должна превращаться в таблицы, чаты и бумажные списки. Создайте страницу, откройте регистрацию, продавайте билеты и встречайте гостей по QR-коду — в одном месте.",
            uz: "Tadbir tashkil qilish jadvallar, chatlar va qogʻoz roʻyxatlarga aylanmasligi kerak. Sahifa yarating, roʻyxatdan oʻtishni oching, chipta soting va mehmonlarni QR orqali kutib oling — bir joyda.",
          })}
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: 0,
              bottom: -40,
              font: "400 100px/1 var(--font-display)",
              fontStyle: "italic",
              color: "var(--ember-400)",
              opacity: 0.3,
            }}
          >
            ”
          </span>
        </blockquote>
        <div
          style={{
            font: "500 11px/1 var(--font-mono)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
            marginTop: 32,
            textAlign: "center",
          }}
        >
          {t(lang, {
            en: "— The Eventflow team",
            ru: "— Команда Eventflow",
            uz: "— Eventflow jamoasi",
          })}
        </div>
        </Container>
      </section>

      {/* PRINCIPLES */}
      <section style={{ paddingBlock: "88px 56px" }}>
        <Container size="narrow">
        <SectionHead
          underline
          kicker={t(lang, {
            en: "Principles",
            ru: "Принципы",
            uz: "Tamoyillar",
          })}
          title={t(lang, {
            en: "What we ",
            ru: "Что мы ",
            uz: "Nimaga ",
          })}
          italic={t(lang, {
            en: "believe",
            ru: "считаем",
            uz: "ishonamiz",
          })}
        />
        <div className="cm-about-principles">
          {PRINCIPLES.map((p) => (
            <div
              key={p.ic}
              style={{
                padding: "28px 28px 30px",
                background: "var(--bone-50)",
                border: "1px solid var(--border-1)",
                borderRadius: 12,
                display: "flex",
                gap: 22,
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
                  flexShrink: 0,
                }}
              >
                <DesignIcon name={p.ic} size={22} stroke={1.7} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    font: "700 18px/1.25 var(--font-sans)",
                    letterSpacing: "-0.015em",
                    color: "var(--ink-400)",
                    marginBottom: 8,
                    textWrap: "balance",
                  }}
                >
                  {t(lang, p.t)}
                </div>
                <div
                  style={{
                    font: "400 14px/1.6 var(--font-sans)",
                    color: "var(--fg-2)",
                    textWrap: "pretty",
                  }}
                >
                  {t(lang, p.d)}
                </div>
              </div>
            </div>
          ))}
        </div>
        </Container>
      </section>

      {/* TEAM */}
      <section
        style={{
          background: "var(--bg-2)",
          borderTop: "1px solid var(--border-1)",
          borderBottom: "1px solid var(--border-1)",
          paddingBlock: "88px 96px",
        }}
      >
        <Container size="wide">
          <SectionHead
            underline
            kicker={t(lang, { en: "Team", ru: "Команда", uz: "Jamoa" })}
            title={t(lang, {
              en: "Coming ",
              ru: "Скоро ",
              uz: "Tez orada ",
            })}
            italic={t(lang, {
              en: "soon",
              ru: "представим",
              uz: "tanishtiramiz",
            })}
          />
          <div
            className="cm-about-team-soon"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "44px 48px",
              background: "var(--bone-50)",
              border: "1px solid var(--border-1)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              gap: 32,
              flexWrap: "wrap",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: -80,
                top: -80,
                width: 280,
                height: 280,
                background:
                  "radial-gradient(circle, var(--ember-100) 0%, transparent 65%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "var(--ember-50)",
                color: "var(--ember-500)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <DesignIcon name="users" size={26} stroke={1.6} />
            </div>
            <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
              <div
                style={{
                  font: "700 22px/1.25 var(--font-sans)",
                  letterSpacing: "-0.02em",
                  color: "var(--ink-400)",
                  textWrap: "balance",
                }}
              >
                {t(lang, {
                  en: "A small team, working in calm.",
                  ru: "Небольшая команда, работаем спокойно.",
                  uz: "Kichik jamoa, sukunatda ishlaymiz.",
                })}
              </div>
              <p
                style={{
                  font: "400 14px/1.6 var(--font-sans)",
                  color: "var(--fg-2)",
                  margin: "10px 0 0",
                  maxWidth: 560,
                  textWrap: "pretty",
                }}
              >
                {t(lang, {
                  en: "We're a few people in Tashkent building Eventflow. We'll introduce everyone publicly when the team is ready.",
                  ru: "Нас немного — небольшая команда в Ташкенте, которая делает Eventflow. Представим всех публично, когда команда будет готова.",
                  uz: "Biz Toshkentda Eventflow ustida ishlayotgan kichik jamoamiz. Jamoa tayyor boʻlganda hammani ochiq tanishtiramiz.",
                })}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* CITIES */}
      <section style={{ paddingBlock: "88px 56px" }}>
        <Container size="wide">
        <SectionHead
          underline
          kicker={t(lang, {
            en: "Where we run",
            ru: "Где мы работаем",
            uz: "Qayerda ishlaymiz",
          })}
          title={t(lang, {
            en: "Across ",
            ru: "По всему ",
            uz: "Butun ",
          })}
          italic={t(lang, {
            en: "Uzbekistan",
            ru: "Узбекистану",
            uz: "Oʻzbekiston boʻylab",
          })}
        />

        <div
          className="cm-about-banner"
          style={{
            background: "var(--ink-400)",
            color: "var(--bone-100)",
            borderRadius: 14,
            padding: "32px 36px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 32,
            position: "relative",
            overflow: "hidden",
            flexWrap: "wrap",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -60,
              top: -60,
              width: 320,
              height: 320,
              background:
                "radial-gradient(circle, rgba(234,88,12,0.32) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              position: "relative",
              maxWidth: 700,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background: "rgba(234,88,12,0.18)",
                color: "var(--ember-400)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DesignIcon name="flag" size={28} stroke={1.6} />
            </div>
            <div>
              <Eyebrow color="rgba(251,251,250,0.55)">
                {t(lang, {
                  en: "Our home",
                  ru: "Наш дом",
                  uz: "Bizning uyimiz",
                })}
              </Eyebrow>
              <div
                style={{
                  font: "700 30px/1.05 var(--font-sans)",
                  letterSpacing: "-0.025em",
                  textWrap: "balance",
                  marginTop: 8,
                }}
              >
                {lang === "ru" ? (
                  <>
                    Сделано в <ItalicAccent>Узбекистане</ItalicAccent>
                  </>
                ) : lang === "uz" ? (
                  <>
                    <ItalicAccent>Oʻzbekistonda</ItalicAccent> yaratilgan
                  </>
                ) : (
                  <>
                    Built in <ItalicAccent>Uzbekistan</ItalicAccent>
                  </>
                )}
              </div>
              <div
                style={{
                  font: "400 14px/1.55 var(--font-sans)",
                  color: "rgba(251,251,250,0.7)",
                  marginTop: 10,
                  maxWidth: 540,
                  textWrap: "pretty",
                }}
              >
                {t(lang, {
                  en: "We operate exclusively in Uzbekistan — local payments, local languages and calendar, local support from Tashkent.",
                  ru: "Мы работаем только в Узбекистане — местные платежи, языки и календарь, локальная поддержка из Ташкента.",
                  uz: "Biz faqat Oʻzbekistonda ishlaymiz — mahalliy toʻlovlar, tillar va kalendar, Toshkentdan mahalliy yordam.",
                })}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 28,
              position: "relative",
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  font: "700 30px/1 var(--font-sans)",
                  letterSpacing: "-0.025em",
                }}
              >
                UZS
              </div>
              <div
                style={{
                  font: "500 11px/1.4 var(--font-mono)",
                  color: "rgba(251,251,250,0.55)",
                  marginTop: 6,
                  letterSpacing: "0.04em",
                }}
              >
                {t(lang, {
                  en: "LOCAL CURRENCY",
                  ru: "НАЦ. ВАЛЮТА",
                  uz: "MILLIY VALYUTA",
                })}
              </div>
            </div>
            <div>
              <div
                style={{
                  font: "700 30px/1 var(--font-sans)",
                  letterSpacing: "-0.025em",
                }}
              >
                UZ · RU · EN
              </div>
              <div
                style={{
                  font: "500 11px/1.4 var(--font-mono)",
                  color: "rgba(251,251,250,0.55)",
                  marginTop: 6,
                  letterSpacing: "0.04em",
                }}
              >
                {t(lang, {
                  en: "INTERFACE",
                  ru: "ИНТЕРФЕЙС",
                  uz: "INTERFEYS",
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="cm-about-cities">
          {CITIES.map((c) => (
            <div
              key={c.name.en}
              style={{
                padding: "20px 20px 22px",
                background: "var(--bone-50)",
                color: "var(--ink-400)",
                border: "1px solid var(--border-1)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <DesignIcon name="pin" size={16} stroke={1.7} />
                {c.primary ? (
                  <span
                    style={{
                      font: "500 9px/1 var(--font-mono)",
                      letterSpacing: "0.18em",
                      background: "var(--ember-400)",
                      color: "var(--bone-50)",
                      padding: "4px 7px",
                      borderRadius: 999,
                    }}
                  >
                    HQ
                  </span>
                ) : null}
              </div>
              <div>
                <div
                  style={{
                    font: "700 18px/1.2 var(--font-sans)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {t(lang, c.name)}
                </div>
                <div
                  style={{
                    font: "500 11px/1.4 var(--font-mono)",
                    color: "var(--fg-3)",
                    marginTop: 4,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {t(lang, c.region)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 18,
            padding: "14px 18px",
            background: "var(--bg-2)",
            border: "1px solid var(--border-1)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 12,
            font: "400 13px/1.5 var(--font-sans)",
            color: "var(--fg-2)",
          }}
        >
          <span style={{ color: "var(--ember-500)", flexShrink: 0 }}>
            <DesignIcon name="compass" size={16} stroke={1.7} />
          </span>
          {t(lang, {
            en: "Expansion to neighbouring Central Asian countries is on the 2027 roadmap.",
            ru: "Расширение в соседние страны Центральной Азии — на дорожной карте на 2027.",
            uz: "Qoʻshni Markaziy Osiyo davlatlariga kengaytirish 2027-yil yoʻl xaritasida.",
          })}
        </div>
        </Container>
      </section>
    </div>
  );
}
