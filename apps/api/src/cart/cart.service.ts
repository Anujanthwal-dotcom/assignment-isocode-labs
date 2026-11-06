import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from './cart.dto';
import { MedicineStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(customerUserId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { customerUserId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { customerUserId },
      });
    }

    return cart;
  }

  async getCart(customerUserId: string) {
    const cart = await this.getOrCreateCart(customerUserId);

    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            sku: true,
            brandName: true,
            genericName: true,
            strength: true,
            dosageForm: true,
            packSize: true,
            schedule: true,
            mrp: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let subtotal = 0;
    let itemCount = 0;
    let hasInactiveItems = false;

    const items = cartItems.map((item) => {
      const unitPrice = Number(item.medicine.mrp);
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
      subtotal += lineTotal;
      itemCount += item.quantity;

      if (item.medicine.status !== MedicineStatus.ACTIVE) {
        hasInactiveItems = true;
      }

      return {
        id: item.id,
        medicine: {
          id: item.medicine.id,
          name: item.medicine.name,
          sku: item.medicine.sku,
          brandName: item.medicine.brandName,
          genericName: item.medicine.genericName,
          strength: item.medicine.strength,
          dosageForm: item.medicine.dosageForm,
          packSize: item.medicine.packSize,
          schedule: item.medicine.schedule,
          status: item.medicine.status,
        },
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    return {
      id: cart.id,
      items,
      subtotal: Number(subtotal.toFixed(2)),
      itemCount,
      hasInactiveItems,
    };
  }

  async addItem(customerUserId: string, dto: AddToCartDto) {
    if (dto.quantity < 1 || dto.quantity > 100) {
      throw new BadRequestException({
        code: 'INVALID_QUANTITY',
        message: 'Quantity must be between 1 and 100.',
      });
    }

    // Verify medicine is active
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
      select: { id: true, status: true, name: true },
    });

    if (!medicine) {
      throw new NotFoundException({
        code: 'MEDICINE_NOT_FOUND',
        message: 'Medicine not found.',
      });
    }

    if (medicine.status !== MedicineStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'MEDICINE_INACTIVE',
        message: `Medicine '${medicine.name}' is currently inactive and cannot be ordered.`,
      });
    }

    const cart = await this.getOrCreateCart(customerUserId);

    // If already in cart, update quantity (clamp to 100)
    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_medicineId: {
          cartId: cart.id,
          medicineId: dto.medicineId,
        },
      },
    });

    if (existing) {
      const newQuantity = Math.min(existing.quantity + dto.quantity, 100);
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          medicineId: dto.medicineId,
          quantity: dto.quantity,
        },
      });
    }

    return this.getCart(customerUserId);
  }

  async updateItemQuantity(customerUserId: string, itemId: string, dto: UpdateCartItemDto) {
    if (dto.quantity < 1 || dto.quantity > 100) {
      throw new BadRequestException({
        code: 'INVALID_QUANTITY',
        message: 'Quantity must be between 1 and 100.',
      });
    }

    const cart = await this.getOrCreateCart(customerUserId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Cart item not found.',
      });
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(customerUserId);
  }

  async removeItem(customerUserId: string, itemId: string) {
    const cart = await this.getOrCreateCart(customerUserId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Cart item not found.',
      });
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(customerUserId);
  }

  async clearCart(customerUserId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { customerUserId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return {
      items: [],
      subtotal: 0,
      itemCount: 0,
    };
  }
}
