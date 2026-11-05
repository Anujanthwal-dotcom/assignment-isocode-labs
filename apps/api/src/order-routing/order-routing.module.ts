import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';
import { StoreDistanceService } from './store-distance.service';
import { StockAvailabilityService } from './stock-availability.service';
import { StoreEligibilityService } from './store-eligibility.service';
import { StockReservationService } from './stock-reservation.service';
import { OrderRoutingService } from './order-routing.service';
import { OrderRoutingController } from './order-routing.controller';
import { ReservationsController } from './reservations.controller';

@Module({
  imports: [PrismaModule, AuditModule, OrdersModule],
  controllers: [OrderRoutingController, ReservationsController],
  providers: [
    StoreDistanceService,
    StockAvailabilityService,
    StoreEligibilityService,
    StockReservationService,
    OrderRoutingService,
  ],
  exports: [
    StoreDistanceService,
    StockAvailabilityService,
    StoreEligibilityService,
    StockReservationService,
    OrderRoutingService,
  ],
})
export class OrderRoutingModule {}
