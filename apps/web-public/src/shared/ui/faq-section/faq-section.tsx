import { Container } from "@shared/ui/container";
import { Eyebrow } from "@shared/ui/design-system";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSectionProps {
  /** Optional small kicker rendered above the heading (e.g. "FAQ"). */
  eyebrow?: string;
  /** Section heading (h2). */
  heading: string;
  items: FaqItem[];
  /**
   * `tinted` uses the secondary surface to set the FAQ apart from a hero;
   * `plain` matches surrounding `--bg-1` so the section reads as part of the
   * page flow.
   */
  surface?: "tinted" | "plain";
}

/**
 * Visible FAQ block that mirrors the FAQPage JSON-LD on the same page.
 * Rendered server-side so AI engines (GPTBot, PerplexityBot, ClaudeBot) and
 * non-JS crawlers see the questions and answers in HTML — the JSON-LD is a
 * machine-readable mirror, not a substitute for visible content.
 *
 * Implemented with `<details>` so the markup degrades gracefully without JS
 * (questions still expand/collapse via native browser behaviour) and the
 * answer text is always in the DOM for search engines.
 */
export function FaqSection({
  eyebrow = "FAQ",
  heading,
  items,
  surface = "plain",
}: FaqSectionProps): React.ReactNode {
  if (items.length === 0) return null;

  return (
    <section
      className={`faq-section faq-section--${surface}`}
      aria-labelledby="faq-section-heading"
    >
      <Container size="wide">
        <div className="faq-section__head">
          {eyebrow ? (
            <Eyebrow style={{ marginBottom: 8 }}>{eyebrow}</Eyebrow>
          ) : null}
          <h2 id="faq-section-heading" className="faq-section__heading">
            {heading}
          </h2>
        </div>
        <div className="faq-section__list">
          {items.map((item, index) => (
            <details
              key={item.question}
              className="faq-section__item"
              // Open the first item by default so non-interactive crawlers see
              // at least one full Q/A inside the visible viewport snapshot.
              {...(index === 0 ? { open: true } : {})}
            >
              <summary className="faq-section__question">
                <span>{item.question}</span>
                {/* Chevron, not a rotating "+": at 45° a plus reads as a
                    close button, which an accordion row isn't. */}
                <span className="faq-section__chev" aria-hidden="true">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <p className="faq-section__answer">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>

      <style>{`
        .faq-section {
          padding-block: clamp(40px, 6vw, 64px);
        }
        .faq-section--tinted { background: var(--bg-2); }
        .faq-section--plain  { background: var(--bg-1); }
        .faq-section__head {
          padding-bottom: 18px;
          border-bottom: 2px solid var(--ink-400);
          margin-bottom: clamp(20px, 3vw, 28px);
        }
        .faq-section__heading {
          font: 700 clamp(22px, 3.4vw, 30px) / 1.1 var(--font-sans);
          letter-spacing: -0.02em;
          margin: 0;
          color: var(--ink-400);
          text-wrap: balance;
        }
        .faq-section__list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .faq-section__item {
          border: 1px solid var(--border-1);
          border-radius: var(--radius-lg);
          background: var(--bg-1);
          transition: border-color .15s var(--ease-standard);
        }
        .faq-section--tinted .faq-section__item { background: var(--bg-1); }
        .faq-section__item[open] { border-color: var(--ink-400); }
        .faq-section__question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 22px;
          cursor: pointer;
          font: 600 15px/1.4 var(--font-sans);
          color: var(--ink-400);
          list-style: none;
          text-wrap: balance;
        }
        .faq-section__question::-webkit-details-marker { display: none; }
        .faq-section__chev {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-1);
          border-radius: 999px;
          font: 600 14px/1 var(--font-sans);
          color: var(--fg-2);
          transition: transform .2s var(--ease-standard);
        }
        .faq-section__item[open] .faq-section__chev { transform: rotate(180deg); }
        .faq-section__answer {
          margin: 0;
          padding: 0 22px 20px;
          font: 400 14.5px/1.65 var(--font-sans);
          color: var(--fg-2);
          max-width: 75ch;
          text-wrap: pretty;
        }
      `}</style>
    </section>
  );
}
