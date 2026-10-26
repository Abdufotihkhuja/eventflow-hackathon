import { createTranslator } from "@eventflow/i18n";
import { fallbackLocale, normalizeLocale } from "@shared/lib/i18n-routing";
import { breadcrumbSchema, faqSchema } from "@shared/lib/json-ld";
import { buildPageMetadata } from "@shared/lib/seo";
import { extendedFaq } from "@shared/lib/site-faq";
import { Container } from "@shared/ui/container";
import { Eyebrow } from "@shared/ui/design-system";
import { FaqSection } from "@shared/ui/faq-section";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata } from "next";
import type { Locale } from "@eventflow/i18n";

const SUPPORT_EMAIL = "support@eventflow.uz";

interface FaqPageProps {
  params: Promise<{ locale: string }>;
}

interface FaqStrings {
  /** SEO title (used in metadata + main H1 eyebrow). */
  title: string;
  /** SEO meta description. */
  description: string;
  /** Hero H1 rendered on the page. */
  heading: string;
  /** Subheading prose under H1. */
  intro: string;
  /** Section heading for the FAQ items. */
  faqHeading: string;
  /** Breadcrumb label for this page. */
  breadcrumbLabel: string;
  /** Help block heading. */
  helpHeading: string;
  /** Help block body. */
  helpBody: string;
  /** Primary action label (email support). */
  emailCta: string;
  /** Feedback / improvements block heading. */
  feedbackHeading: string;
  /** Feedback block body. */
  feedbackBody: string;
  /** Feedback action label. */
  feedbackCta: string;
  /** mailto subject prefilled when clicking the feedback CTA. */
  feedbackSubject: string;
}

function strings(locale: Locale): FaqStrings {
  if (locale === "ru") {
    return {
      title: "Частые вопросы",
      description:
        "Ответы на популярные вопросы о EVENTFLOW: регистрация, оплата, QR-билеты, сертификаты, поддержка. Не нашли ответ — напишите на support@eventflow.uz.",
      heading: "Частые вопросы",
      intro:
        "Коротко о том, как работают регистрация, оплата, QR-билеты и сертификаты на EVENTFLOW. Если ответа на ваш вопрос нет — пишите нам, добавим.",
      faqHeading: "Вопросы и ответы",
      breadcrumbLabel: "FAQ",
      helpHeading: "Не нашли ответ?",
      helpBody:
        "Напишите в поддержку — отвечаем в рабочие часы и помогаем как участникам, так и организаторам.",
      emailCta: "Написать в поддержку",
      feedbackHeading: "Предложения и улучшения",
      feedbackBody:
        "Заметили баг, есть идея, хотите попросить новую функцию? Мы читаем каждое письмо и учитываем при планировании.",
      feedbackCta: "Поделиться идеей",
      feedbackSubject: "Идея для EVENTFLOW",
    };
  }
  if (locale === "uz") {
    return {
      title: "Tez-tez beriladigan savollar",
      description:
        "EVENTFLOW haqida koʻp beriladigan savollarga javoblar: roʻyxatdan oʻtish, toʻlov, QR-chiptalar, sertifikatlar, qoʻllab-quvvatlash. Javob topilmasa — support@eventflow.uz ga yozing.",
      heading: "Tez-tez beriladigan savollar",
      intro:
        "EVENTFLOW da roʻyxatdan oʻtish, toʻlov, QR-chiptalar va sertifikatlar qanday ishlashi haqida qisqacha. Savolingizga javob yoʻq boʻlsa — bizga yozing, qoʻshamiz.",
      faqHeading: "Savol va javoblar",
      breadcrumbLabel: "FAQ",
      helpHeading: "Javob topa olmadingizmi?",
      helpBody:
        "Qoʻllab-quvvatlash xizmatiga yozing — ish vaqtida javob beramiz va ham ishtirokchilarga, ham tashkilotchilarga yordam beramiz.",
      emailCta: "Qoʻllab-quvvatlashga yozish",
      feedbackHeading: "Takliflar va yaxshilanishlar",
      feedbackBody:
        "Xato sezdingizmi, gʻoyangiz bormi, yangi funksiya soʻraysizmi? Har bir xatni oʻqiymiz va rejalashtirishda hisobga olamiz.",
      feedbackCta: "Gʻoyani ulashish",
      feedbackSubject: "EVENTFLOW uchun gʻoya",
    };
  }
  return {
    title: "Frequently asked questions",
    description:
      "Answers to common questions about EVENTFLOW — registration, payments, QR tickets, certificates, support. Can't find an answer? Email support@eventflow.uz.",
    heading: "Frequently asked questions",
    intro:
      "Short answers to how registration, payments, QR tickets, and certificates work on EVENTFLOW. If your question isn't covered yet, write to us — we'll add it.",
    faqHeading: "Questions and answers",
    breadcrumbLabel: "FAQ",
    helpHeading: "Didn't find your answer?",
    helpBody:
      "Email support — we reply during business hours and help both attendees and organizers.",
    emailCta: "Contact support",
    feedbackHeading: "Suggestions and improvements",
    feedbackBody:
      "Spotted a bug, have an idea, want a new feature? We read every email and factor it into our roadmap.",
    feedbackCta: "Share an idea",
    feedbackSubject: "Idea for EVENTFLOW",
  };
}

export async function generateMetadata({
  params,
}: FaqPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const s = strings(locale);
  return buildPageMetadata({
    locale,
    path: "/faq",
    title: s.title,
    description: s.description,
  });
}

export default async function FaqPage({
  params,
}: FaqPageProps): Promise<React.ReactNode> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);
  const s = strings(locale);

  const items = extendedFaq(locale);
  const faq = faqSchema(items);
  const breadcrumb = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: s.breadcrumbLabel, path: "/faq" },
    ],
    locale,
  );

  const feedbackHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    s.feedbackSubject,
  )}`;

  return (
    <>
      <JsonLd data={[breadcrumb, faq]} />

      <header className="faq-hero">
        <Container size="wide">
          <Eyebrow style={{ marginBottom: 8 }}>{s.title}</Eyebrow>
          <h1 className="faq-hero__heading">{s.heading}</h1>
          <p className="faq-hero__intro">{s.intro}</p>
        </Container>
      </header>

      <FaqSection heading={s.faqHeading} items={items} surface="plain" />

      <section className="faq-contact" aria-labelledby="faq-contact-heading">
        <Container size="wide">
          <div className="faq-contact__grid">
            <article className="faq-contact__card">
              <h2 id="faq-contact-heading" className="faq-contact__heading">
                {s.helpHeading}
              </h2>
              <p className="faq-contact__body">{s.helpBody}</p>
              <a
                className="faq-contact__cta"
                href={`mailto:${SUPPORT_EMAIL}`}
                aria-label={`${s.emailCta} — ${SUPPORT_EMAIL}`}
              >
                {s.emailCta} <span aria-hidden="true">→</span>
              </a>
              <p className="faq-contact__email">{SUPPORT_EMAIL}</p>
            </article>
            <article className="faq-contact__card faq-contact__card--accent">
              <h2 className="faq-contact__heading">{s.feedbackHeading}</h2>
              <p className="faq-contact__body">{s.feedbackBody}</p>
              <a className="faq-contact__cta" href={feedbackHref}>
                {s.feedbackCta} <span aria-hidden="true">→</span>
              </a>
            </article>
          </div>
        </Container>
      </section>

      <style>{`
        .faq-hero {
          background: var(--bg-1);
          color: var(--fg-1);
          padding-block: clamp(36px, 5vw, 56px) clamp(20px, 3vw, 28px);
        }
        .faq-hero__heading {
          font: 700 clamp(28px, 5vw, 44px) / 1.05 var(--font-sans);
          letter-spacing: -0.025em;
          color: var(--ink-400);
          margin: 0;
          text-wrap: balance;
        }
        .faq-hero__intro {
          margin: 12px 0 0;
          font: 400 16px/1.6 var(--font-sans);
          color: var(--fg-2);
          max-width: 70ch;
          text-wrap: pretty;
        }
        .faq-contact {
          background: var(--bg-1);
          padding-block: clamp(40px, 6vw, 72px) clamp(56px, 8vw, 96px);
        }
        .faq-contact__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 720px) {
          .faq-contact__grid { grid-template-columns: 1fr; }
        }
        .faq-contact__card {
          padding: clamp(20px, 3vw, 28px);
          border: 1px solid var(--border-1);
          border-radius: var(--radius-xl);
          background: var(--bg-2);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .faq-contact__card--accent {
          background: linear-gradient(180deg, rgba(216,67,21,0.06), var(--bg-2));
          border-color: rgba(216,67,21,0.22);
        }
        .faq-contact__heading {
          margin: 0;
          font: 600 clamp(18px, 2.5vw, 22px) / 1.2 var(--font-sans);
          color: var(--ink-400);
        }
        .faq-contact__body {
          margin: 0;
          font: 400 14.5px/1.6 var(--font-sans);
          color: var(--fg-2);
          text-wrap: pretty;
        }
        .faq-contact__cta {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          padding: 10px 18px;
          border-radius: 999px;
          background: var(--ink-400);
          color: var(--bone-50, #fafaf9);
          font: 600 14px/1 var(--font-sans);
          text-decoration: none;
          transition: background .15s var(--ease-standard);
        }
        .faq-contact__card--accent .faq-contact__cta {
          background: var(--ember-500);
        }
        .faq-contact__cta:hover { filter: brightness(1.08); }
        .faq-contact__email {
          margin: 0;
          font: 500 13px/1.4 var(--font-mono, monospace);
          color: var(--fg-2);
          letter-spacing: 0.01em;
        }
      `}</style>
    </>
  );
}
