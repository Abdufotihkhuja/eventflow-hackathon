import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EntitlementKey, PlanKey, UserType } from '@prisma/client';
import { CurrentUser, Roles } from '../../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import type { ICurrentUser } from '../../../common/interfaces';
import { AdminBillingService } from './admin-billing.service';
import { ManualPaymentsService } from './manual-payments.service';
import { AdOrdersService } from '../ads/ad-orders.service';
import {
  ActivatePlanDto,
  AdjustCreditsDto,
  AdminOrgBillingDto,
  ExpirePlanDto,
  ExtendPlanDto,
  ConfirmTicketOrderDto,
  PaymentTransactionDto,
  PayoutOwedRowDto,
  RecordPayoutDto,
  RevokeOverrideDto,
  SetOverrideDto,
  CompGrantDto,
  SuspendOrgDto,
  UpdatePlanPriceDto,
  FulfillFeaturedDto,
  RecordPaymentDto,
  ReversePaymentDto,
  SetEnforcementDto,
} from './admin-billing.dto';
import { BillingOrderDto } from '../dto/billing-request.dto';

/**
 * Операторский биллинг (S-1): все маршруты под /api/v1/super-admin (фильтр
 * admin.ts, D-11), защита — существующий паттерн JwtAuthGuard + RolesGuard +
 * @Roles(SUPER_ADMIN) (S-14: единственная платформенная роль; финансовые роли
 * отложены — компенсация: обязательные причины + аудит S-12).
 */
@ApiTags('super-admin')
@Controller('super-admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminBillingController {
  constructor(
    private readonly adminBilling: AdminBillingService,
    private readonly manualPayments: ManualPaymentsService,
    private readonly adOrdersService: AdOrdersService,
  ) {}

  @Get('organizations/:orgId')
  @ApiOperation({
    summary: 'Биллинг-панель организации (S-2 данные)',
    description:
      'Состояние тарифа, эффективные энтайтлменты с оверрайдами, история заказов.',
  })
  @ApiOkResponse({ type: AdminOrgBillingDto })
  getOrgBilling(
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<AdminOrgBillingDto> {
    return this.adminBilling.getOrgBilling(orgId);
  }

  @Post('organizations/:orgId/plan/activate')
  @ApiOperation({
    summary: 'Активировать/сменить тариф организации (managed, M-13/§2.4)',
    description:
      'Смена тарифа при живом пакете ТРЕБУЕТ creditMode (RESET | CARRY_OVER) — ' +
      'решение §2.4; продление того же тарифа всегда сбрасывает кредиты (§2.1). ' +
      'Аудит PLAN_ASSIGN/PLAN_SWITCH пишется в той же транзакции.',
  })
  activatePlan(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: ActivatePlanDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.activatePlan(orgId, dto, admin);
  }

  @Post('organizations/:orgId/plan/extend')
  @ApiOperation({
    summary: 'Продлить период живого пакета (S-3)',
    description: 'Сдвигает expiresAt на N дней от текущего конца периода. Аудит PLAN_EXTEND (before/after). UI обязан показывать loading/error-состояния (критик B-11).',
  })
  extendPlan(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: ExtendPlanDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.extendPlan(orgId, dto, admin);
  }

  @Post('organizations/:orgId/plan/expire')
  @ApiOperation({
    summary: 'Принудительно истечь пакет (S-3)',
    description: 'Организация немедленно возвращается на START (§2.1-семантика). Причина обязательна; аудит PLAN_EXPIRE.',
  })
  expirePlan(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: ExpirePlanDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.expirePlan(orgId, dto, admin);
  }

  @Post('organizations/:orgId/plan/credits/adjust')
  @ApiOperation({
    summary: 'Корректировка кредитов событий (S-3)',
    description: 'Append-only ADMIN_ADJUST; отрицательная дельта guarded не ниже нуля; положительная оживляет EXHAUSTED-пакет. Причина обязательна; аудит PLAN_CREDIT_ADJUST.',
  })
  adjustCredits(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: AdjustCreditsDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.adjustCredits(orgId, dto, admin);
  }

  @Post('organizations/:orgId/payments')
  @ApiOperation({
    summary: 'Записать ручной платёж (S-4, managed-фаза)',
    description:
      'MANUAL-транзакция: сумма + внешний референс обязательны (D-5), дубликаты ' +
      'режутся уникальностью (MANUAL, externalRef). Заказ-основание помечается ' +
      'PAID; строка выручки (M-15) и аудит PAYMENT_RECORD — в той же транзакции.',
  })
  @ApiOkResponse({ type: PaymentTransactionDto })
  async recordPayment(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() admin: ICurrentUser,
  ): Promise<PaymentTransactionDto> {
    const transaction = await this.manualPayments.recordPayment(
      {
        organizationId: orgId,
        orderId: dto.orderId ?? null,
        amountMinor: dto.amountMinor,
        currency: dto.currency,
        externalRef: dto.externalRef,
        revenueType: dto.revenueType,
      },
      admin,
    );
    return PaymentTransactionDto.fromModel(transaction);
  }

  @Post('payments/:transactionId/reverse')
  @ApiOperation({
    summary: 'Реверсировать платёж (S-4)',
    description:
      'Исправления — ТОЛЬКО реверс-записями (D-5): REVERSED-статус + ' +
      'отрицательная строка выручки REFUND + аудит PAYMENT_REVERSAL с причиной.',
  })
  @ApiOkResponse({ type: PaymentTransactionDto })
  async reversePayment(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: ReversePaymentDto,
    @CurrentUser() admin: ICurrentUser,
  ): Promise<PaymentTransactionDto> {
    const transaction = await this.manualPayments.reversePayment(
      transactionId,
      dto.reason,
      admin,
    );
    return PaymentTransactionDto.fromModel(transaction);
  }

  @Post('ticket-orders/:orderId/confirm')
  @ApiOperation({
    summary: 'Подтвердить оплату билета вручную (MANUAL-путь M-5)',
    description:
      'Оператор фиксирует офлайн-оплату билета: MANUAL-транзакция с обязательным ' +
      'внешним референсом, заказ PAID, регистрация APPROVED, выручка COMMISSION.',
  })
  confirmTicketOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ConfirmTicketOrderDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.confirmTicketOrder(orderId, dto.externalRef, admin);
  }

  @Post('organizations/:orgId/overrides')
  @ApiOperation({
    summary: 'Установить per-org оверрайд энтайтлмента (S-5/S-6)',
    description:
      'Одна активная строка на (организация, ключ) — повторная установка ' +
      'перезаписывает; история в аудите (before/after). Комиссия — в границах ' +
      '[0, 1200] bps (CR-8). Причина обязательна (OQ-7).',
  })
  setOverride(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: SetOverrideDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.setOverride(orgId, dto, admin);
  }

  @Post('organizations/:orgId/overrides/:key/revoke')
  @ApiOperation({ summary: 'Снять оверрайд (S-5/S-6); причина обязательна' })
  revokeOverride(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('key') key: EntitlementKey,
    @Body() dto: RevokeOverrideDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.revokeOverride(orgId, key, dto.reason, admin);
  }

  @Post('organizations/:orgId/comp')
  @ApiOperation({
    summary: 'Comp-грант монет (S-7)',
    description: 'Goodwill-начисление в леджер (COMP_GRANT); переживает смену/истечение тарифа (OQ-5). Причина обязательна.',
  })
  compGrant(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CompGrantDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.compGrant(orgId, dto, admin);
  }

  @Post('organizations/:orgId/suspend')
  @ApiOperation({
    summary: 'Приостановить организацию (S-8)',
    description:
      'Пакет D-1: вход разрешён, запись в кабинете блокируется (E-17), новые ' +
      'регистрации закрыты, рассылки на паузе; опубликованные события остаются ' +
      'видимыми. Причина обязательна; аудит ORG_SUSPEND.',
  })
  suspend(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: SuspendOrgDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.suspendOrganization(orgId, dto.reason, admin);
  }

  @Post('organizations/:orgId/reactivate')
  @ApiOperation({ summary: 'Снять приостановку (S-8)' })
  reactivate(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.reactivateOrganization(orgId, admin);
  }

  @Get('payouts/owed')
  @ApiOperation({
    summary: 'Сводка «к выплате» по организациям (M-7)',
    description: 'Тело PAID-билетов − комиссия платформы − уже выплаченное.',
  })
  @ApiOkResponse({ type: [PayoutOwedRowDto] })
  payoutsOwed() {
    return this.adminBilling.payoutsOwed();
  }

  @Post('organizations/:orgId/payouts')
  @ApiOperation({
    summary: 'Зафиксировать выплату организатору (M-7, managed runbook)',
    description:
      'Деньги уже переведены банком (runbook docs/monetization/15-payout-runbook.md); ' +
      'запись append-only с обязательным референсом платёжки; аудит PAYOUT_RECORD.',
  })
  recordPayout(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: RecordPayoutDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.recordPayout(orgId, dto, admin);
  }

  @Post('plans/:key/pricing')
  @ApiOperation({
    summary: 'Правка цены/активации тарифа (S-16)',
    description:
      'UZS-прайс задаёт владелец (внешний гейт 4). Правки НЕ трогают проданные ' +
      'пакеты (снапшоты, CR-1). Аудит PRICE_SET (before/after).',
  })
  updatePlanPricing(
    @Param('key') key: PlanKey,
    @Body() dto: UpdatePlanPriceDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.updatePlanPricing(key, dto, admin);
  }

  @Post('addon-skus/:code/pricing')
  @ApiOperation({ summary: 'Правка цены/активации add-on SKU (S-16); аудит SKU_SET' })
  updateSkuPricing(
    @Param('code') code: string,
    @Body() dto: UpdatePlanPriceDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.updateSkuPricing(code, dto, admin);
  }

  @Get('audit')
  @ApiOperation({
    summary: 'Лента аудита операторских действий (S-13)',
    description: 'Фильтры: action, targetId; пагинация. PII в metadata нет (вайтлист S-12).',
  })
  listAudit(
    @Query('action') action?: string,
    @Query('targetId') targetId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminBilling.listAudit({
      action,
      targetId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('revenue/summary')
  @ApiOperation({
    summary: 'Сводка выручки за период (S-10)',
    description: 'Агрегаты RevenueEntry по типу и каналу; managed-фаза = канал MANUAL (деградация честно видна). Суммы — тийины строками.',
  })
  revenueSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.adminBilling.revenueSummary(from, to);
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Обзор монетизации платформы (S-9)',
    description: 'Распределение тарифов, приостановки, заявки, пакеты с истечением ≤14 дней (сигнал к продлению).',
  })
  monetizationOverview() {
    return this.adminBilling.monetizationOverview();
  }

  @Post('organizations/:orgId/ad-orders/featured')
  @ApiOperation({
    summary: 'Фулфилмент featured-размещения (S-11/M-11)',
    description:
      'Ставит Event.isFeatured и создаёт AdOrder на weeks недель; снятие по ' +
      'истечении — автоматически свипом. isComp — $0 goodwill. Аудит AD_ORDER_STATUS.',
  })
  fulfillFeatured(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: FulfillFeaturedDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adOrdersService.fulfillFeatured(orgId, dto, admin);
  }

  @Get('ad-orders')
  @ApiOperation({ summary: 'Все рекламные размещения (S-11)' })
  listAdOrders() {
    return this.adOrdersService.listAll();
  }

  @Get('requests')
  @ApiOperation({
    summary: 'Очередь заявок managed-фазы (REQUESTED-заказы)',
  })
  @ApiOkResponse({ type: [BillingOrderDto] })
  listPendingRequests(): Promise<BillingOrderDto[]> {
    return this.adminBilling.listPendingRequests();
  }

  @Get('enforcement')
  @ApiOperation({
    summary: 'Состояние мастер-переключателя тарифной системы (S-19)',
  })
  getEnforcement() {
    return this.adminBilling.getEnforcement();
  }

  @Post('enforcement')
  @ApiOperation({
    summary: 'S-19: мастер-переключатель тарифной системы',
    description:
      'ВЫКЛ — платформа ведёт себя как до монетизации (тёмный запуск/откат). ' +
      'Первое включение фиксирует cutover-метку и штампует 90-дневное окно ' +
      'грандфазеринга (E-15). Аудит BILLING_SWITCH_TOGGLE.',
  })
  setEnforcement(
    @Body() dto: SetEnforcementDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.setEnforcement(dto.enabled, admin);
  }

  @Get('via')
  @ApiOperation({
    summary: 'Состояние тумблера VIA-платежей',
    description:
      'Глобальный тумблер + число пилотных организаций (оверрайд VIA_PAYMENTS=true).',
  })
  getViaState() {
    return this.adminBilling.getViaState();
  }

  @Post('via')
  @ApiOperation({
    summary: 'Глобальный тумблер VIA-платежей (прод-активация)',
    description:
      'ВЫКЛ — VIA доступен только пилотным организациям с per-org оверрайдом ' +
      'VIA_PAYMENTS=true (тест перед общим запуском); ВКЛ — всем, кроме точечных ' +
      'VIA_PAYMENTS=false. Аудит VIA_SWITCH_TOGGLE.',
  })
  setVia(
    @Body() dto: SetEnforcementDto,
    @CurrentUser() admin: ICurrentUser,
  ) {
    return this.adminBilling.setViaEnabled(dto.enabled, admin);
  }
}
