import { organizerAppUrl } from "@shared/config";
import { workspaceBillingIntentPath } from "@shared/lib/billing-intent";
import { DesignIcon } from "@shared/ui/design-system";

import type { PlanKey } from "@entities/pricing";

interface PlanCtaProps {
  planKey: PlanKey;
  className: string;
  ariaLabel: string;
  label: string;
}

/**
 * Plan CTA → the organizer app (`organizerAppUrl`: app.eventflow.uz in
 * production, app.localhost in dev). Paid tiers deep-link to the workspace
 * billing plans with the plan preselected; the workspace owns auth (guests are
 * bounced to its login and returned to the deep link). START just opens the app.
 *
 * A plain cross-origin anchor — no client state, so it stays server-rendered
 * inside the static (SEO) pricing grid.
 */
export function PlanCta({
  planKey,
  className,
  ariaLabel,
  label,
}: PlanCtaProps): React.ReactNode {
  const href =
    planKey === "PRO" || planKey === "EXCLUSIVE"
      ? `${organizerAppUrl}${workspaceBillingIntentPath(planKey)}`
      : organizerAppUrl;

  return (
    <a href={href} className={className} aria-label={ariaLabel}>
      {label}
      <DesignIcon name="arrow" size={14} stroke={2} aria-hidden="true" />
    </a>
  );
}
