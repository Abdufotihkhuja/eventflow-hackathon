import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('AppController', () => {
  const controller = new AppController(new AppService());

  it('returns health status', async () => {
    await expect(controller.healthCheck()).resolves.toMatchObject({
      status: 'ok',
    });
  });

  it('returns live status', () => {
    expect(controller.liveCheck()).toMatchObject({
      status: 'ok',
    });
  });

  it('returns ready status', async () => {
    await expect(controller.readyCheck()).resolves.toMatchObject({
      status: 'ready',
    });
  });

  it('fails readiness when a dependency is unavailable', async () => {
    const controllerWithDeps = new AppController(
      new AppService(),
      {
        $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('db down')),
      } as never,
      {
        getRedisReadiness: jest.fn().mockResolvedValue({
          ready: false,
          status: 'error',
        }),
      } as never,
    );

    await expect(controllerWithDeps.readyCheck()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
