import type { paths } from './generated/openapi.js';

type FilterPaths<Prefixes extends string> = {
  [Key in keyof paths as Key extends `${Prefixes}${string}` ? Key : never]: paths[Key];
};

export type AdminApiPaths = FilterPaths<
  '/api/v1/auth' | '/api/v1/session' | '/api/v1/super-admin' | '/api/v1/translations'
>;
