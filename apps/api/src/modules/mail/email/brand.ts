/**
 * Brand / sender identity used in the email footer and deliverability headers.
 * Values are injected from configuration (env) so nothing production-specific
 * is hardcoded; defaults point at the public eventflow.uz identity.
 */
export interface BrandConfig {
  productName: string;
  siteUrl: string;
  supportEmail: string;
  /** Reply-To address (a monitored mailbox improves deliverability/trust). */
  replyTo: string;
  /** Legal entity line shown in the footer (CAN-SPAM / trust). */
  legalName: string;
  /** Physical postal address shown in the footer. */
  postalAddress: string;
  /**
   * RFC 8058 one-click unsubscribe POST endpoint (the API). The signed
   * per-recipient token is appended as `?token=`. Used in the
   * `List-Unsubscribe` header.
   */
  unsubscribeApiUrl: string;
  /**
   * Human-facing unsubscribe confirmation page (web-public). The signed
   * token is appended as `?token=`. Used for the visible footer link.
   */
  unsubscribePageUrl: string;
  /**
   * Absolute HTTPS URL of the raster (PNG) logo shown in the header.
   * Must be a raster format — SVG is not rendered by Gmail/Outlook.
   * Emails still degrade gracefully via alt text when images are off.
   */
  logoUrl: string;
}

export const DEFAULT_BRAND: BrandConfig = {
  productName: 'EventFlow',
  siteUrl: 'https://eventflow.uz',
  supportEmail: 'support@eventflow.uz',
  replyTo: 'support@eventflow.uz',
  legalName: 'EventFlow',
  postalAddress: 'Tashkent, Uzbekistan',
  unsubscribeApiUrl: 'https://api.eventflow.uz/api/v1/email/unsubscribe',
  unsubscribePageUrl: 'https://eventflow.uz/unsubscribe',
  logoUrl: 'https://eventflow.uz/assets/email-logo.png',
};
