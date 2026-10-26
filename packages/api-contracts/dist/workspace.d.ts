import type { paths } from "./generated/openapi.js";
type FilterPaths<Prefixes extends string> = {
    [Key in keyof paths as Key extends `${Prefixes}${string}` ? Key : never]: paths[Key];
};
export type WorkspaceApiPaths = FilterPaths<"/api/v1/auth" | "/api/v1/billing" | "/api/v1/events" | "/api/v1/workspace" | "/api/v1/notifications" | "/api/v1/organizations" | "/api/v1/users" | "/api/v1/registrations" | "/api/v1/certificates" | "/api/v1/public" | "/api/v1/attendance" | "/api/v1/translations">;
export {};
//# sourceMappingURL=workspace.d.ts.map