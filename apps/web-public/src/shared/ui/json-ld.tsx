import type { JsonLdObject } from "@shared/lib/json-ld";

interface JsonLdProps {
  data: JsonLdObject | Array<JsonLdObject | null | undefined>;
}

/**
 * Renders one or more JSON-LD nodes as `<script type="application/ld+json">`.
 * `<` is escaped to `<` to prevent `</script>` breakout from API content.
 */
export function JsonLd({ data }: JsonLdProps): React.ReactNode {
  const nodes = (Array.isArray(data) ? data : [data]).filter(
    (node): node is JsonLdObject => Boolean(node),
  );

  return (
    <>
      {nodes.map((node, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(node).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
