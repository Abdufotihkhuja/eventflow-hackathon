import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { CatalogRepository } from './catalog/catalog.repository';
import { CatalogService } from './catalog/catalog.service';
import { PlanStateRepository } from './plan-state/plan-state.repository';
import { PlanStateService } from './plan-state/plan-state.service';
import { PlanLifecycleRepository } from './plan-state/plan-lifecycle.repository';
import { PlanLifecycleService } from './plan-state/plan-lifecycle.service';
import { EventCreditsRepository } from './plan-state/event-credits.repository';
import { EventCreditsService } from './plan-state/event-credits.service';
import { BillingConfigService } from './billing-config.service';
import { EntitlementsRepository } from './entitlements/entitlements.repository';
import { EntitlementsService } from './entitlements/entitlements.service';
import { QuotaRepository } from './quota/quota.repository';
import { QuotaService } from './quota/quota.service';
import { CoinLedgerRepository } from './coins/coin-ledger.repository';
import { CoinLedgerService } from './coins/coin-ledger.service';
import { BillingFeatureGuard } from './entitlements/billing-feature.guard';
import { SuspensionInterceptor } from './entitlements/suspension.interceptor';
import { CapacityClampService } from './entitlements/capacity-clamp.service';
import { SeatLimitRepository } from './entitlements/seat-limit.repository';
import { SeatLimitService } from './entitlements/seat-limit.service';
import { MaxEventsService } from './entitlements/max-events.service';
import { MaxEventsRepository } from './entitlements/max-events.repository';
import { OrdersRepository } from './orders/orders.repository';
import { BillingRequestsService } from './orders/billing-requests.service';
import { RevenueService } from './revenue/revenue.service';
import { AdminBillingController } from './admin/admin-billing.controller';
import { AdminBillingService } from './admin/admin-billing.service';
import { ManualPaymentsRepository } from './admin/manual-payments.repository';
import { PayoutsRepository } from './admin/payouts.repository';
import { AdminDashboardsRepository } from './admin/admin-dashboards.repository';
import { AdOrdersRepository } from './ads/ad-orders.repository';
import { AdOrdersService } from './ads/ad-orders.service';
import { ManualPaymentsService } from './admin/manual-payments.service';
import { TicketingRepository } from './ticketing/ticketing.repository';
import { TicketingService } from './ticketing/ticketing.service';
import { TicketCheckoutController } from './ticketing/ticket-checkout.controller';
import { PaymeAdapter } from './payments/payme.adapter';
import { PaymentWebhooksService } from './payments/payment-webhooks.service';
import { PaymentWebhooksController } from './payments/payment-webhooks.controller';
import { ViaAdapter } from './payments/via.adapter';
import { ViaConfigService } from './payments/via-config.service';
import { ViaPaymentsRepository } from './payments/via-payments.repository';
import { ViaPaymentsService } from './payments/via-payments.service';
import { ViaCheckoutController } from './payments/via-checkout.controller';
import { BillingSweepRepository } from './sweeps/billing-sweep.repository';
import { BillingSweepService } from './sweeps/billing-sweep.service';
import { PublicPlansController } from './public-plans.controller';
import { WorkspaceBillingController } from './workspace-billing.controller';

/**
 * Модуль монетизации (Stage 2, Wave 2). Наполняется по пунктам бэклога:
 * M-1 каталог → M-3 состояние тарифа → E-1 резолвер → E-2 guard/quota → …
 */
@Module({
  imports: [PrismaModule, MailModule],
  controllers: [
    PublicPlansController,
    WorkspaceBillingController,
    AdminBillingController,
    TicketCheckoutController,
    PaymentWebhooksController,
    ViaCheckoutController,
  ],
  providers: [
    CatalogRepository,
    CatalogService,
    PlanStateRepository,
    PlanStateService,
    PlanLifecycleRepository,
    PlanLifecycleService,
    EventCreditsRepository,
    EventCreditsService,
    BillingConfigService,
    EntitlementsRepository,
    EntitlementsService,
    QuotaRepository,
    QuotaService,
    CoinLedgerRepository,
    CoinLedgerService,
    BillingFeatureGuard,
    { provide: APP_INTERCEPTOR, useClass: SuspensionInterceptor },
    CapacityClampService,
    SeatLimitRepository,
    SeatLimitService,
    MaxEventsRepository,
    MaxEventsService,
    OrdersRepository,
    BillingRequestsService,
    RevenueService,
    AdminBillingService,
    ManualPaymentsRepository,
    ManualPaymentsService,
    PayoutsRepository,
    AdminDashboardsRepository,
    AdOrdersRepository,
    AdOrdersService,
    TicketingRepository,
    TicketingService,
    PaymeAdapter,
    PaymentWebhooksService,
    ViaAdapter,
    ViaConfigService,
    ViaPaymentsRepository,
    ViaPaymentsService,
    BillingSweepRepository,
    BillingSweepService,
  ],
  exports: [
    CatalogService,
    PlanStateService,
    PlanLifecycleService,
    EventCreditsService,
    BillingConfigService,
    EntitlementsService,
    QuotaService,
    BillingFeatureGuard,
    CapacityClampService,
    SeatLimitService,
    MaxEventsService,
    BillingRequestsService,
    RevenueService,
    TicketingService,
    CoinLedgerService,
    BillingSweepService,
  ],
})
export class BillingModule {}
