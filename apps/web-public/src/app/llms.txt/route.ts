import { siteUrl } from "@shared/lib/seo";

/**
 * /llms.txt — a concise, AI-crawler-friendly summary of the site (emerging
 * GEO convention). Helps LLMs ground answers about EVENTFLOW on canonical
 * facts and links rather than rendering the client app.
 */
export function GET(): Response {
  const body = `# EVENTFLOW

> EVENTFLOW is an event platform for Uzbekistan. Attendees discover events and register with QR tickets; organizers publish events, run registrations, issue tickets, and check attendees in. Available in English, Russian, and Uzbek.

## Key pages
- [Events catalog](${siteUrl}/en/events): browse upcoming events across Uzbekistan
- [Blog](${siteUrl}/en/blog): guides on event planning, marketing, and management
- [About](${siteUrl}/en/about): what EVENTFLOW is and who it serves

## Languages
- English: ${siteUrl}/en
- Russian: ${siteUrl}/ru
- Uzbek: ${siteUrl}/uz

## More
- Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
