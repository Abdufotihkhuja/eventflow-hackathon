import type { paths } from "./generated/openapi.js";

type FilterPaths<Prefixes extends string> = {
  [Key in keyof paths as Key extends `${Prefixes}${string}`
    ? Key
    : never]: paths[Key];
};

export type PublicApiPaths = FilterPaths<
  | "/api/v1/public"
  | "/api/v1/auth"
  | "/api/v1/verification"
  | "/api/v1/blog"
  | "/api/v1/categories"
  | "/api/v1/collections"
  | "/api/v1/certificates"
  | "/api/v1/organizations"
  | "/api/v1/events"
  | "/api/v1/my-registrations"
  | "/api/v1/registrations"
>;
