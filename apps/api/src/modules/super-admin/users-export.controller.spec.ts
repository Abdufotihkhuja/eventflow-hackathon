import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassThrough } from 'node:stream';
import request from 'supertest';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { UsersExportService } from './users-export.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';

/**
 * HTTP-слой выгрузки: маршрут `users/export` не должен уходить в `users/:userId`,
 * а `fields` приходит строкой через запятую и обязан пройти вайтлист.
 * Глобальный ValidationPipe воспроизведён как в main.ts.
 */
describe('SuperAdminController — GET users/export', () => {
  let app: INestApplication;
  let usersExport: { export: jest.Mock };
  let superAdmin: { recordUsersExport: jest.Mock; getUser: jest.Mock };

  beforeEach(async () => {
    usersExport = {
      export: jest.fn().mockImplementation(() => {
        const stream = new PassThrough();
        stream.end(Buffer.from('xlsx-bytes'));
        return Promise.resolve({
          stream,
          filename: 'polzovateli-2026-07-31.xlsx',
          total: 42,
        });
      }),
    };
    superAdmin = {
      recordUsersExport: jest.fn().mockResolvedValue(undefined),
      getUser: jest.fn().mockResolvedValue({ id: 'u-1' }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        { provide: SuperAdminService, useValue: superAdmin },
        { provide: UsersExportService, useValue: usersExport },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user: unknown } };
        }) => {
          context.switchToHttp().getRequest().user = {
            sub: 'admin-1',
            email: 'admin@eventflow.uz',
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('отдаёт xlsx и разбирает fields из строки через запятую', async () => {
    const response = await request(app.getHttpServer())
      .get('/super-admin/users/export')
      .query({ fields: 'firstName,lastName,dateOfBirth,phone', status: 'all' })
      .expect(200);

    expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(response.headers['content-disposition']).toContain(
      'polzovateli-2026-07-31.xlsx',
    );
    expect(response.headers['x-export-total']).toBe('42');

    expect(usersExport.export).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ['firstName', 'lastName', 'dateOfBirth', 'phone'],
        status: 'all',
      }),
    );
  });

  it('пишет в аудит факт выгрузки с составом, но без PII', async () => {
    await request(app.getHttpServer())
      .get('/super-admin/users/export')
      .query({ fields: 'email' })
      .expect(200);

    expect(superAdmin.recordUsersExport).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@eventflow.uz' },
      expect.objectContaining({ total: 42, fields: ['email'] }),
    );
  });

  it('отклоняет колонку вне вайтлиста', async () => {
    await request(app.getHttpServer())
      .get('/super-admin/users/export')
      .query({ fields: 'email,passwordHash' })
      .expect(400);

    expect(usersExport.export).not.toHaveBeenCalled();
  });
});
