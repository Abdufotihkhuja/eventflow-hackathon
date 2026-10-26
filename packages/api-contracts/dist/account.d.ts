import type { paths } from "./generated/openapi.js";
type FilterPaths<Prefixes extends string> = {
    [Key in keyof paths as Key extends `${Prefixes}${string}` ? Key : never]: paths[Key];
};
type ExactPaths<Keys extends keyof paths> = Pick<paths, Keys>;
export type AccountApiPaths = FilterPaths<"/api/v1/auth" | "/api/v1/account" | "/api/v1/me/" | "/api/v1/session" | "/api/v1/verification" | "/api/v1/my-registrations" | "/api/v1/registrations" | "/api/v1/certificates" | "/api/v1/public"> & ExactPaths<"/api/v1/account/me/following-organizations">;
export {};
//# sourceMappingURL=account.d.ts.map