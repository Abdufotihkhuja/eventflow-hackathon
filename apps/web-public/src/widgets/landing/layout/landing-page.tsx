import { CalmMarketplaceHero } from "@widgets/landing/calm-marketplace-hero";
import { FaqSection, type FaqItem } from "@shared/ui/faq-section";

import type { PublicEventsResponse } from "@shared/lib/hooks/useEventsQuery";

export interface LandingPageProps {
  /** Server-fetched upcoming events for SSR/SEO of the featured strip. */
  initialEvents?: PublicEventsResponse;
  /** Recently-held events, used as a fallback when there are no upcoming ones. */
  initialPastEvents?: PublicEventsResponse;
  /** Localized FAQ items rendered below the hero (also mirrored as JSON-LD). */
  faqItems?: FaqItem[];
  /** Localized heading for the FAQ section. */
  faqHeading?: string;
}

/**
 * Public home page — Calm Marketplace landing (template E from the
 * Eventflow design handoff: bone canvas, ember accent, italic kicker,
 * pill search, tinted category band, and an editorial featured strip).
 *
 * A visible FAQ block follows the hero so AI engines and non-JS crawlers
 * see the questions/answers in HTML (and Google validates the matching
 * FAQPage JSON-LD against the rendered text).
 */
export function LandingPage({
  initialEvents,
  initialPastEvents,
  faqItems,
  faqHeading,
}: LandingPageProps = {}): React.ReactNode {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <CalmMarketplaceHero
        initialEvents={initialEvents}
        initialPastEvents={initialPastEvents}
      />
      {faqItems && faqItems.length > 0 && faqHeading ? (
        <FaqSection heading={faqHeading} items={faqItems} surface="tinted" />
      ) : null}
    </div>
  );
}
