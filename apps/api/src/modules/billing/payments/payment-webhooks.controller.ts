import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Ip,
  Param,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { PaymentWebhooksService } from './payment-webhooks.service';
import { ViaPaymentsService } from './via-payments.service';

/**
 * Вебхуки платёжных провайдеров (M-5). Server-to-server поверхность:
 * НАМЕРЕННО вне всех surface-фильтров SDK (D-11) и скрыта из Swagger.
 * Идемпотентность — уникальность (provider, providerTxnId) в БД (D-9).
 * 🔒 До мерчант-кредов (внешний гейт) адаптеры не сконфигурированы — 503.
 */
@ApiExcludeController()
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  constructor(
    private readonly webhooksService: PaymentWebhooksService,
    private readonly viaPayments: ViaPaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('payme')
  @HttpCode(200)
  async payme(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const result = await this.webhooksService.handlePayme(headers, body);
    if (result === 'NOT_CONFIGURED') {
      throw new ServiceUnavailableException('Payme не подключён');
    }
    return result;
  }

  /**
   * Уведомление VIA об успешной оплате. VIA не подписывает колбэки, поэтому
   * три слоя: (1) IP-allowlist балансировщиков VIA (VIA_WEBHOOK_ALLOWED_IPS,
   * req.ip честный — trust proxy в main.ts); (2) секретный токен-капабилити
   * в URL (VIA_WEBHOOK_TOKEN, timing-safe); (3) телу НЕ доверяем — оно лишь
   * триггерит серверный опрос статуса инвойса со сверкой суммы/заказа.
   */
  @Post('via/:token')
  @HttpCode(200)
  async via(
    @Param('token') token: string,
    @Ip() ip: string,
    @Body() body: unknown,
  ) {
    this.assertViaSourceIp(ip);
    this.assertViaToken(token);
    const result = await this.viaPayments.handleWebhookNotification(body);
    if (result === 'NOT_CONFIGURED') {
      throw new ServiceUnavailableException('VIA не подключён');
    }
    return { ok: true };
  }

  private assertViaToken(candidate: string): void {
    const expected = this.configService.get<string>('VIA_WEBHOOK_TOKEN')?.trim();
    if (!expected) {
      // Токен не задан — endpoint выключен, существование не раскрываем.
      throw new UnauthorizedException();
    }
    const a = Buffer.from(candidate ?? '');
    const b = Buffer.from(expected);
    // Постоянное по времени сравнение — токен не подбирается по таймингу.
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException();
    }
  }

  /** Allowlist исходящих IP VIA; пустой env = проверка выключена (гейт — токен). */
  private assertViaSourceIp(ip: string): void {
    const raw = this.configService.get<string>('VIA_WEBHOOK_ALLOWED_IPS')?.trim();
    if (!raw) return;
    const allowed = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    // Экспресс за прокси может отдавать IPv4-mapped IPv6 (::ffff:1.2.3.4).
    const normalized = ip?.replace(/^::ffff:/i, '') ?? '';
    if (!allowed.includes(normalized)) {
      throw new UnauthorizedException();
    }
  }
}
