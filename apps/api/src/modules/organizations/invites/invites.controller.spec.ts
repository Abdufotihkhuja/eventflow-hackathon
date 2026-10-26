import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from '../../../common/guards';

/**
 * HTTP-слой приглашений. Главное, что здесь проверяется, — маршруты кабинета
 * (`invites/mine`) не должны утекать в публичные маршруты с `:token`: иначе
 * список своих приглашений превратится в поиск приглашения по токену "mine"
 * и вернёт 404. Порядок объявления в контроллере — единственное, что это
 * держит, поэтому он закреплён тестом.
 */
describe('InvitesController — маршруты кабинета приглашённого', () => {
  let app: INestApplication;
  let invites: {
    listMyInvites: jest.Mock;
    acceptMyInvite: jest.Mock;
    inspectInvite: jest.Mock;
    acceptInvite: jest.Mock;
  };

  const VIEWER = {
    sub: 'user-1',
    type: 'USER',
    email: 'jane@example.com',
    accountId: 'account-1',
  };

  beforeEach(async () => {
    invites = {
      listMyInvites: jest.fn().mockResolvedValue([{ id: 'invite-1' }]),
      acceptMyInvite: jest.fn().mockResolvedValue({ code: 'MEMBERSHIP_CREATED' }),
      inspectInvite: jest.fn().mockResolvedValue({ status: 'PENDING' }),
      acceptInvite: jest.fn().mockResolvedValue({ code: 'MEMBERSHIP_CREATED' }),
    };

    const passThroughGuard = {
      canActivate: (context: {
        switchToHttp: () => { getRequest: () => { user: unknown } };
      }) => {
        context.switchToHttp().getRequest().user = VIEWER;
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [{ provide: InvitesService, useValue: invites }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passThroughGuard)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET invites/mine отдаёт свои приглашения, а не ищет токен "mine"', async () => {
    const response = await request(app.getHttpServer())
      .get('/organizations/invites/mine')
      .expect(200);

    expect(response.body).toEqual([{ id: 'invite-1' }]);
    expect(invites.listMyInvites).toHaveBeenCalledWith(
      expect.objectContaining({ email: VIEWER.email, accountId: 'account-1' }),
    );
    expect(invites.inspectInvite).not.toHaveBeenCalled();
  });

  it('POST invites/mine/:id/accept принимает по id, а не по токену', async () => {
    const inviteId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    await request(app.getHttpServer())
      .post(`/organizations/invites/mine/${inviteId}/accept`)
      .expect(200);

    expect(invites.acceptMyInvite).toHaveBeenCalledWith(
      inviteId,
      expect.objectContaining({ email: VIEWER.email }),
    );
    expect(invites.acceptInvite).not.toHaveBeenCalled();
  });

  it('публичный маршрут по токену продолжает работать', async () => {
    await request(app.getHttpServer())
      .get('/organizations/invites/raw-token-value')
      .expect(200);

    expect(invites.inspectInvite).toHaveBeenCalledWith(
      'raw-token-value',
      expect.objectContaining({ email: VIEWER.email }),
    );
  });
});
