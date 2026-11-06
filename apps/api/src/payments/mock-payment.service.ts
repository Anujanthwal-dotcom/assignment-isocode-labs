import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MockPaymentDto } from './payments.dto';
import { OrderPaymentMethod, OrderPaymentStatus, OrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class MockPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async processMockPayment(customerUserId: string, orderId: string, dto: MockPaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerUserId,
      },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      });
    }

    if (order.paymentMethod !== OrderPaymentMethod.UPI) {
      throw new BadRequestException({
        code: 'PAYMENT_METHOD_NOT_UPI',
        message: 'Mock payment simulation is only applicable for orders placed using UPI.',
      });
    }

    if (!order.payment) {
      throw new BadRequestException({
        code: 'PAYMENT_RECORD_MISSING',
        message: 'Payment record for this order is missing.',
      });
    }

    // Idempotency: if already processed (SUCCESS or FAILED)
    if (order.payment.status === OrderPaymentStatus.SUCCESS) {
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.payment.status,
        orderStatus: order.status,
        transactionReference: order.payment.transactionReference,
        message: 'Payment was already successfully completed.',
      };
    }

    if (order.payment.status === OrderPaymentStatus.FAILED) {
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.payment.status,
        orderStatus: order.status,
        transactionReference: order.payment.transactionReference,
        message: 'Payment was previously marked as failed.',
      };
    }

    if (dto.result === 'SUCCESS') {
      const transactionReference = `TXN-UPI-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

      await this.prisma.$transaction(async (tx) => {
        // Update payment status
        await tx.orderPayment.update({
          where: { orderId: order.id },
          data: {
            status: OrderPaymentStatus.SUCCESS,
            transactionReference,
          },
        });

        // Update order payment status
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: OrderPaymentStatus.SUCCESS,
          },
        });

        // Clear customer cart now that payment succeeded
        const cart = await tx.cart.findUnique({
          where: { customerUserId },
        });
        if (cart) {
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id },
          });
        }
      });

      await this.auditService.record({
        actorUserId: customerUserId,
        action: 'MOCK_PAYMENT_SUCCESS',
        resourceType: 'Order',
        resourceId: order.id,
        metadata: {
          transactionReference,
          amount: Number(order.totalAmount),
        },
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: OrderPaymentStatus.SUCCESS,
        orderStatus: order.status,
        transactionReference,
        message:
          'Mock UPI payment completed successfully. Order is pending pharmacist verification.',
      };
    } else {
      // FAILURE
      await this.prisma.$transaction(async (tx) => {
        // Update payment status to FAILED
        await tx.orderPayment.update({
          where: { orderId: order.id },
          data: {
            status: OrderPaymentStatus.FAILED,
          },
        });

        // Transition order status to CANCELLED
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: OrderPaymentStatus.FAILED,
            status: OrderStatus.CANCELLED,
          },
        });

        // Record status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: order.status,
            newStatus: OrderStatus.CANCELLED,
            changedByUserId: customerUserId,
            note: 'Order cancelled due to failed mock UPI payment simulation.',
          },
        });

        // NOTE: Cart is NOT cleared on failure so customer can retry
      });

      await this.auditService.record({
        actorUserId: customerUserId,
        action: 'MOCK_PAYMENT_FAILURE',
        resourceType: 'Order',
        resourceId: order.id,
        metadata: {
          reason: 'Customer simulated UPI failure',
        },
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: OrderPaymentStatus.FAILED,
        orderStatus: OrderStatus.CANCELLED,
        transactionReference: null,
        message: 'Mock UPI payment simulation failed. Order has been cancelled.',
      };
    }
  }
}
