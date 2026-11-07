import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderNumberService } from './order-number.service';
import { OrderStatusService } from './order-status.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto, ListOrdersQueryDto } from './orders.dto';
import {
  OrderStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderItemStatus,
  OrderItemReviewStatus,
  AlternativeProposalStatus,
  MedicineStatus,
  PrescriptionReviewStatus,
  Prisma,
} from '@prisma/client';
import { ComplianceEvaluatorService } from '../compliance/compliance-evaluator.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderNumberService: OrderNumberService,
    private readonly orderStatusService: OrderStatusService,
    private readonly auditService: AuditService,
    private readonly complianceEvaluator: ComplianceEvaluatorService,
  ) {}

  async createOrder(customerUserId: string, dto: CreateOrderDto) {
    // 1. Get customer's cart with items and medicines
    const cart = await this.prisma.cart.findUnique({
      where: { customerUserId },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_CART',
        message: 'Cannot place order with an empty cart. Please add medicines first.',
      });
    }

    // 2. Validate all medicines in cart are ACTIVE
    for (const item of cart.items) {
      if (item.medicine.status !== MedicineStatus.ACTIVE) {
        throw new BadRequestException({
          code: 'INACTIVE_MEDICINE_IN_CART',
          message: `Medicine '${item.medicine.name}' (${item.medicine.sku}) is inactive. Please remove it from your cart before proceeding.`,
        });
      }
      if (item.quantity < 1 || item.quantity > 100) {
        throw new BadRequestException({
          code: 'INVALID_ITEM_QUANTITY',
          message: `Invalid quantity for medicine '${item.medicine.name}'. Must be between 1 and 100.`,
        });
      }
    }

    // 3. Validate prescription exists and belongs to customer
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id: dto.prescriptionId,
        customerUserId,
      },
    });

    if (!prescription) {
      throw new BadRequestException({
        code: 'PRESCRIPTION_NOT_FOUND',
        message: 'The selected prescription was not found or does not belong to you.',
      });
    }

    // 4. Validate family member alignment
    const requestedFamilyMemberId = dto.familyMemberId || null;
    if (requestedFamilyMemberId) {
      const familyMember = await this.prisma.familyMember.findFirst({
        where: {
          id: requestedFamilyMemberId,
          customerUserId,
          isDeleted: false,
        },
      });

      if (!familyMember) {
        throw new BadRequestException({
          code: 'FAMILY_MEMBER_NOT_FOUND',
          message: 'The selected family member was not found or does not belong to you.',
        });
      }
    }

    if (prescription.familyMemberId !== requestedFamilyMemberId) {
      throw new BadRequestException({
        code: 'PRESCRIPTION_MEMBER_MISMATCH',
        message:
          'The selected prescription is not associated with the patient specified for this order.',
      });
    }

    // 5. Validate delivery address belongs to customer
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: dto.addressId,
        customerUserId,
        isDeleted: false,
      },
    });

    if (!address) {
      throw new BadRequestException({
        code: 'ADDRESS_NOT_FOUND',
        message: 'The selected delivery address was not found or does not belong to you.',
      });
    }

    const addressSnapshot = {
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
    };

    // 6. Recalculate totals server-side
    let subtotalNum = 0;
    const orderItemsData = cart.items.map((item) => {
      const unitPriceNum = Number(item.medicine.mrp);
      const lineTotalNum = Number((unitPriceNum * item.quantity).toFixed(2));
      subtotalNum += lineTotalNum;

      return {
        medicineId: item.medicine.id,
        medicineNameSnapshot: item.medicine.name,
        skuSnapshot: item.medicine.sku,
        unitPrice: new Prisma.Decimal(unitPriceNum.toFixed(2)),
        quantity: item.quantity,
        lineTotal: new Prisma.Decimal(lineTotalNum.toFixed(2)),
        status: OrderItemStatus.PENDING_VERIFICATION,
      };
    });

    const subtotal = new Prisma.Decimal(subtotalNum.toFixed(2));
    const deliveryFee = new Prisma.Decimal('0.00');
    const discount = new Prisma.Decimal('0.00');
    const totalAmount = new Prisma.Decimal(subtotalNum.toFixed(2));

    const initialPaymentStatus =
      dto.paymentMethod === OrderPaymentMethod.COD
        ? OrderPaymentStatus.NOT_REQUIRED
        : OrderPaymentStatus.PENDING;

    // 7. Atomic transaction for order creation
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.orderNumberService.generateOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerUserId,
          familyMemberId: requestedFamilyMemberId,
          prescriptionId: dto.prescriptionId,
          addressId: dto.addressId,
          status: OrderStatus.PENDING_VERIFICATION,
          paymentMethod: dto.paymentMethod,
          paymentStatus: initialPaymentStatus,
          subtotal,
          deliveryFee,
          discount,
          totalAmount,
          addressSnapshot,
          customerNote: dto.customerNote?.trim() || null,
          items: {
            create: orderItemsData,
          },
          payment: {
            create: {
              method: dto.paymentMethod,
              status: initialPaymentStatus,
              amount: totalAmount,
              provider: 'MOCK',
            },
          },
          statusHistory: {
            create: {
              previousStatus: null,
              newStatus: OrderStatus.PENDING_VERIFICATION,
              changedByUserId: customerUserId,
              note: 'Order submitted by customer — pending pharmacist verification.',
            },
          },
        },
        include: {
          items: true,
          payment: true,
          statusHistory: true,
          familyMember: {
            select: { id: true, fullName: true, relationship: true },
          },
          prescription: {
            select: { id: true, originalFileName: true, status: true, uploadedAt: true },
          },
        },
      });

      // Clear cart immediately ONLY for COD; UPI cart cleared upon payment SUCCESS
      if (dto.paymentMethod === OrderPaymentMethod.COD) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      return order;
    });

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'ORDER_PLACED',
      resourceType: 'Order',
      resourceId: createdOrder.id,
      metadata: {
        orderNumber: createdOrder.orderNumber,
        paymentMethod: createdOrder.paymentMethod,
        totalAmount: Number(createdOrder.totalAmount),
        itemCount: createdOrder.items.length,
      },
    });

    return {
      ...createdOrder,
      subtotal: Number(createdOrder.subtotal),
      deliveryFee: Number(createdOrder.deliveryFee),
      discount: Number(createdOrder.discount),
      totalAmount: Number(createdOrder.totalAmount),
      items: createdOrder.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal),
      })),
      payment: createdOrder.payment
        ? {
            ...createdOrder.payment,
            amount: Number(createdOrder.payment.amount),
          }
        : null,
    };
  }

  async listOrders(customerUserId: string, query: ListOrdersQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      customerUserId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      where.orderNumber = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { placedAt: 'desc' },
        include: {
          items: true,
          payment: true,
          familyMember: {
            select: { id: true, fullName: true, relationship: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        deliveryFee: Number(o.deliveryFee),
        discount: Number(o.discount),
        totalAmount: Number(o.totalAmount),
        items: o.items.map((it) => ({
          ...it,
          unitPrice: Number(it.unitPrice),
          lineTotal: Number(it.lineTotal),
        })),
        payment: o.payment
          ? {
              ...o.payment,
              amount: Number(o.payment.amount),
            }
          : null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getOrder(customerUserId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        customerUserId,
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        payment: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        familyMember: {
          select: { id: true, fullName: true, relationship: true },
        },
        prescription: {
          select: {
            id: true,
            originalFileName: true,
            mimeType: true,
            status: true,
            uploadedAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      });
    }

    return {
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      discount: Number(order.discount),
      totalAmount: Number(order.totalAmount),
      items: order.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal),
      })),
      payment: order.payment
        ? {
            ...order.payment,
            amount: Number(order.payment.amount),
          }
        : null,
    };
  }

  async getOrderHistory(customerUserId: string, id: string) {
    // Verify ownership
    await this.getOrder(customerUserId, id);

    return this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async cancelOrder(customerUserId: string, id: string) {
    const order = await this.getOrder(customerUserId, id);

    if (!this.orderStatusService.canCustomerCancel(order.status)) {
      throw new ConflictException({
        code: 'ORDER_NOT_CANCELLABLE',
        message: `Order cannot be cancelled in status '${order.status}'. Cancellation is only allowed while PENDING_VERIFICATION.`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          previousStatus: order.status,
          newStatus: OrderStatus.CANCELLED,
          changedByUserId: customerUserId,
          note: 'Order cancelled by customer before pharmacist verification.',
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Retrieves prescription verification and review status for the customer order.
   */
  async getVerificationStatus(customerUserId: string, orderId: string) {
    await this.getOrder(customerUserId, orderId);

    const fullOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        prescription: true,
        prescriptionReviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        items: {
          include: {
            medicine: true,
            reviews: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            alternativeProposals: {
              where: { status: AlternativeProposalStatus.PENDING },
              include: { originalMedicine: true, proposedMedicine: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!fullOrder) {
      throw new NotFoundException('Order not found.');
    }

    const latestReview = fullOrder.prescriptionReviews[0] || null;

    return {
      orderId: fullOrder.id,
      orderNumber: fullOrder.orderNumber,
      orderStatus: fullOrder.status,
      prescriptionId: fullOrder.prescriptionId,
      prescriptionStatus: fullOrder.prescription.status,
      reviewStatus: latestReview?.status || null,
      pharmacistNotes: latestReview?.reviewNotes || null,
      subtotal: Number(fullOrder.subtotal),
      deliveryFee: Number(fullOrder.deliveryFee),
      discount: Number(fullOrder.discount),
      totalAmount: Number(fullOrder.totalAmount),
      items: fullOrder.items.map((item) => {
        const rev = item.reviews[0] || null;
        const proposal = item.alternativeProposals[0] || null;
        return {
          orderItemId: item.id,
          medicineId: item.medicineId,
          medicineName: item.medicineNameSnapshot,
          sku: item.skuSnapshot,
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          lineTotal: Number(item.lineTotal),
          orderItemStatus: item.status,
          reviewStatus: rev?.status || 'PENDING',
          reviewedMedicineName: rev?.reviewedMedicineName || null,
          decisionReason: rev?.decisionReason || null,
          pendingAlternative: proposal
            ? {
                id: proposal.id,
                activeIngredient: proposal.activeIngredient,
                strength: proposal.strength,
                dosageForm: proposal.dosageForm,
                packSize: proposal.packSize,
                priceDifference: Number(proposal.priceDifference),
                reason: proposal.reason,
                originalMedicine: {
                  id: proposal.originalMedicine.id,
                  name: proposal.originalMedicine.name,
                  mrp: Number(proposal.originalMedicine.mrp),
                },
                proposedMedicine: {
                  id: proposal.proposedMedicine.id,
                  name: proposal.proposedMedicine.name,
                  mrp: Number(proposal.proposedMedicine.mrp),
                },
              }
            : null,
        };
      }),
    };
  }

  /**
   * Removes a rejected, blocked, or unverified item from the order, recalculating totals server-side.
   */
  async removeItemFromOrder(customerUserId: string, orderId: string, orderItemId: string) {
    const order = await this.getOrder(customerUserId, orderId);

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.DISPATCHED ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException('Cannot modify items in a cancelled or dispatched order.');
    }

    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Item not found in this order.');
    }

    if (item.status === OrderItemStatus.REMOVED) {
      throw new BadRequestException('Item is already removed from this order.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark OrderItem as REMOVED
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: OrderItemStatus.REMOVED },
      });

      // 2. Mark latest OrderItemReview as REMOVED if exists
      const latestReview = item.reviews[0];
      if (latestReview) {
        await tx.orderItemReview.update({
          where: { id: latestReview.id },
          data: { status: OrderItemReviewStatus.REMOVED },
        });
      }

      // 3. Recalculate order totals for remaining active items
      const activeItems = await tx.orderItem.findMany({
        where: { orderId, status: { not: OrderItemStatus.REMOVED } },
        include: { reviews: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      const newSubtotal = activeItems.reduce(
        (sum, it) => sum.plus(new Prisma.Decimal(it.lineTotal)),
        new Prisma.Decimal(0),
      );

      // Free delivery above 500, else 50 (standard platform rule)
      const newDeliveryFee =
        newSubtotal.greaterThan(500) || newSubtotal.equals(0)
          ? new Prisma.Decimal(0)
          : new Prisma.Decimal(50);

      const newTotal = newSubtotal.plus(newDeliveryFee).minus(new Prisma.Decimal(order.discount));

      // 4. Update order status: if order was PARTIALLY_APPROVED and all remaining items are APPROVED, transition to APPROVED
      let newOrderStatus = order.status;
      if (activeItems.length === 0) {
        newOrderStatus = OrderStatus.CANCELLED;
      } else {
        const allRemainingApproved = activeItems.every(
          (it) => it.reviews[0]?.status === OrderItemReviewStatus.APPROVED,
        );
        if (allRemainingApproved && order.status === OrderStatus.PARTIALLY_APPROVED) {
          newOrderStatus = OrderStatus.APPROVED;
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: newSubtotal,
          deliveryFee: newDeliveryFee,
          totalAmount: newTotal,
          status: newOrderStatus,
        },
      });

      if (newOrderStatus !== order.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            previousStatus: order.status,
            newStatus: newOrderStatus,
            changedByUserId: customerUserId,
            note: 'Order status updated after customer removed rejected/blocked item',
          },
        });
      }

      return updated;
    });

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'CUSTOMER_REMOVED_ORDER_ITEM',
      resourceType: 'OrderItem',
      resourceId: orderItemId,
      metadata: {
        orderId,
        removedMedicine: item.medicineNameSnapshot,
        previousTotal: Number(order.totalAmount),
        newTotal: Number(result.totalAmount),
      },
    });

    return {
      message: 'Item successfully removed from order.',
      order: {
        id: result.id,
        status: result.status,
        subtotal: Number(result.subtotal),
        deliveryFee: Number(result.deliveryFee),
        totalAmount: Number(result.totalAmount),
      },
    };
  }

  /**
   * Customer accepts or declines a proposed generic alternative.
   */
  async respondToAlternativeProposal(
    customerUserId: string,
    orderId: string,
    alternativeId: string,
    action: 'ACCEPT' | 'DECLINE',
    note?: string,
  ) {
    const order = await this.getOrder(customerUserId, orderId);

    const proposal = await this.prisma.orderItemAlternativeProposal.findUnique({
      where: { id: alternativeId },
      include: {
        orderItem: true,
        proposedMedicine: true,
        originalMedicine: true,
      },
    });

    if (!proposal || proposal.orderItem.orderId !== orderId) {
      throw new NotFoundException('Alternative proposal not found for this order.');
    }

    if (proposal.status !== AlternativeProposalStatus.PENDING) {
      throw new BadRequestException(
        `This generic alternative proposal has already been ${proposal.status.toLowerCase()}.`,
      );
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update proposal status
      const updatedProposal = await tx.orderItemAlternativeProposal.update({
        where: { id: alternativeId },
        data: {
          status:
            action === 'ACCEPT'
              ? AlternativeProposalStatus.ACCEPTED
              : AlternativeProposalStatus.DECLINED,
          customerRespondedAt: now,
          customerNote: note || null,
        },
      });

      if (action === 'ACCEPT') {
        const proposedMed = proposal.proposedMedicine;
        const qty = proposal.orderItem.quantity;
        const newLineTotal = new Prisma.Decimal(proposedMed.mrp).times(qty);

        // 2. Update OrderItem with proposed medicine details
        await tx.orderItem.update({
          where: { id: proposal.orderItemId },
          data: {
            medicineId: proposedMed.id,
            medicineNameSnapshot: proposedMed.name,
            skuSnapshot: proposedMed.sku,
            unitPrice: proposedMed.mrp,
            lineTotal: newLineTotal,
            status: OrderItemStatus.PENDING_VERIFICATION,
          },
        });

        // 3. Update OrderItemReview to PENDING for final review/approval
        if (proposal.orderItemReviewId) {
          await tx.orderItemReview.update({
            where: { id: proposal.orderItemReviewId },
            data: {
              medicineId: proposedMed.id,
              reviewedMedicineName: proposedMed.name,
              reviewedDosageForm: proposedMed.dosageForm,
              reviewedStrength: proposedMed.strength,
              status: OrderItemReviewStatus.PENDING,
            },
          });
        }

        // 4. Recalculate order totals
        const allItems = await tx.orderItem.findMany({
          where: { orderId, status: { not: OrderItemStatus.REMOVED } },
        });

        const newSubtotal = allItems.reduce(
          (sum, it) => sum.plus(new Prisma.Decimal(it.lineTotal)),
          new Prisma.Decimal(0),
        );

        const newDeliveryFee =
          newSubtotal.greaterThan(500) || newSubtotal.equals(0)
            ? new Prisma.Decimal(0)
            : new Prisma.Decimal(50);

        const newTotal = newSubtotal.plus(newDeliveryFee).minus(new Prisma.Decimal(order.discount));

        await tx.order.update({
          where: { id: orderId },
          data: {
            subtotal: newSubtotal,
            deliveryFee: newDeliveryFee,
            totalAmount: newTotal,
            status: OrderStatus.UNDER_REVIEW,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            previousStatus: OrderStatus.AWAITING_CUSTOMER_ACTION,
            newStatus: OrderStatus.UNDER_REVIEW,
            changedByUserId: customerUserId,
            note: `Customer accepted generic alternative: ${proposedMed.name}`,
          },
        });
      } else {
        // Declined: retain original medicine and return review to PENDING
        if (proposal.orderItemReviewId) {
          await tx.orderItemReview.update({
            where: { id: proposal.orderItemReviewId },
            data: {
              status: OrderItemReviewStatus.PENDING,
            },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.UNDER_REVIEW },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            previousStatus: OrderStatus.AWAITING_CUSTOMER_ACTION,
            newStatus: OrderStatus.UNDER_REVIEW,
            changedByUserId: customerUserId,
            note: 'Customer declined generic alternative; original medicine retained',
          },
        });
      }

      return updatedProposal;
    });

    await this.auditService.record({
      actorUserId: customerUserId,
      action: action === 'ACCEPT' ? 'GENERIC_ALTERNATIVE_ACCEPTED' : 'GENERIC_ALTERNATIVE_DECLINED',
      resourceType: 'OrderItemAlternativeProposal',
      resourceId: alternativeId,
      metadata: {
        orderId,
        action,
        proposedMedicine: proposal.proposedMedicine.name,
      },
    });

    return {
      message: `Generic alternative proposal successfully ${action.toLowerCase()}ed.`,
      proposal: result,
    };
  }

  async replaceOrderPrescription(
    customerUserId: string,
    orderId: string,
    newPrescriptionId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerUserId },
      include: { prescription: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (
      order.status !== OrderStatus.AWAITING_CUSTOMER_ACTION &&
      order.status !== OrderStatus.PENDING_VERIFICATION
    ) {
      throw new BadRequestException(
        `Cannot replace prescription for order in status '${order.status}'.`,
      );
    }

    const newRx = await this.prisma.prescription.findFirst({
      where: { id: newPrescriptionId, customerUserId },
    });

    if (!newRx) {
      throw new NotFoundException('Replacement prescription not found.');
    }

    const previousPrescriptionId = order.prescriptionId;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          prescriptionId: newPrescriptionId,
          status: OrderStatus.UNDER_REVIEW,
        },
      });

      await tx.prescriptionReview.updateMany({
        where: { orderId },
        data: {
          status: PrescriptionReviewStatus.IN_REVIEW,
          prescriptionId: newPrescriptionId,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: OrderStatus.UNDER_REVIEW,
          changedByUserId: customerUserId,
          note: `Customer uploaded replacement prescription (${newRx.originalFileName})`,
        },
      });
    });

    await this.auditService.record({
      actorUserId: customerUserId,
      action: 'PRESCRIPTION_REPLACED_ON_ORDER',
      resourceType: 'Order',
      resourceId: orderId,
      metadata: {
        orderId,
        previousPrescriptionId,
        newPrescriptionId,
      },
    });

    return {
      message: 'Prescription successfully replaced. Order returned to pharmacist review.',
      orderId,
      newPrescriptionId,
      orderStatus: OrderStatus.UNDER_REVIEW,
    };
  }
}
