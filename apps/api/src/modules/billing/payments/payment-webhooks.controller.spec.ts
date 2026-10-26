import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { PaymentWebhooksService } from './payment-webhooks.service';
import { ViaPaymentsService } from './via-payments.service';

const TOKEN = 'a'.repeat(64);
const VIA_IP_1 = '185.74.5.213';

function build(env: Record<string, string | undefined>) {
  const webhooksService = { handlePayme: jest.fn() };
  const viaPayments = {
    handleWebhookNotification: jest.fn().mockResolvedValue('OK'),
  };
  const config = { get: jest.fn((key: string) => env[key]) };
  const controller = new PaymentWebhooksController(
    webhooksService as unknown as PaymentWebhooksService,
    viaPayments as unknown as ViaPaymentsService,
    config as unknown as ConfigService,
  );
  return { controller, viaPayments };
}

const FULL_ENV = {
  VIA_WEBHOOK_TOKEN: TOKEN,
  VIA_WEBHOOK_ALLOWED_IPS: '185.74.5.213,92.63.206.150',
};

describe('PaymentWebhooksController — VIA endpoint (слои защиты)', () => {
  it('валидный токен + IP из allowlist → уведомление обрабатывается', async () => {
    const { controller, viaPayments } = build(FULL_ENV);
    await expect(
      controller.via(TOKEN, VIA_IP_1, { id: 'inv_1' }),
    ).resolves.toEqual({ ok: true });
    expect(viaPayments.handleWebhookNotification).toHaveBeenCalledWith({
      id: 'inv_1',
    });
  });

  it('IPv4-mapped IPv6 (::ffff:) нормализуется и проходит allowlist', async () => {
    const { controller } = build(FULL_ENV);
    await expect(
      controller.via(TOKEN, `::ffff:${VIA_IP_1}`, {}),
    ).resolves.toEqual({ ok: true });
  });

  it('чужой IP → 401 ещё ДО проверки токена и обработки', async () => {
    const { controller, viaPayments } = build(FULL_ENV);
    await expect(
      controller.via(TOKEN, '203.0.113.7', {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(viaPayments.handleWebhookNotification).not.toHaveBeenCalled();
  });

  it('неверный токен → 401, уведомление не обрабатывается', async () => {
    const { controller, viaPayments } = build(FULL_ENV);
    await expect(
      controller.via('b'.repeat(64), VIA_IP_1, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(viaPayments.handleWebhookNotification).not.toHaveBeenCalled();
  });

  it('токен не задан в env → endpoint выключен (401), существование не раскрывается', async () => {
    const { controller } = build({ VIA_WEBHOOK_ALLOWED_IPS: VIA_IP_1 });
    await expect(controller.via(TOKEN, VIA_IP_1, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('пустой allowlist → IP-проверка выключена, гейтом остаётся токен', async () => {
    const { controller } = build({ VIA_WEBHOOK_TOKEN: TOKEN });
    await expect(controller.via(TOKEN, '203.0.113.7', {})).resolves.toEqual({
      ok: true,
    });
  });

  it('адаптер не сконфигурирован → 503', async () => {
    const { controller, viaPayments } = build(FULL_ENV);
    viaPayments.handleWebhookNotification.mockResolvedValue('NOT_CONFIGURED');
    await expect(controller.via(TOKEN, VIA_IP_1, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
