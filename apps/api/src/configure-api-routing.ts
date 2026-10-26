import { RequestMethod, type INestApplication } from '@nestjs/common';

export const API_V1_PREFIX = 'api/v1';

/** Keep historical V1 routes while allowing controllers to expose /api/v2. */
export function configureApiRouting(app: INestApplication): void {
  app.setGlobalPrefix(API_V1_PREFIX, {
    exclude: [{ path: 'api/v2/{*path}', method: RequestMethod.ALL }],
  });
}
