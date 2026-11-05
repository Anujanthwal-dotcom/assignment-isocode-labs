import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerAddressDto, UpdateCustomerAddressDto } from './customer-addresses.dto';
import {
  isValidIndianPinCode,
  normalizePostalCode,
  normalizePhone,
  isValidIndianMobile,
} from '@pharmacy/validation';

@Injectable()
export class CustomerAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAddresses(customerUserId: string) {
    return this.prisma.customerAddress.findMany({
      where: {
        customerUserId,
        isDeleted: false,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(customerUserId: string, dto: CreateCustomerAddressDto) {
    const normalizedPin = normalizePostalCode(dto.postalCode);
    if (!isValidIndianPinCode(normalizedPin)) {
      throw new BadRequestException({
        code: 'INVALID_PIN_CODE',
        message: 'Postal code must be a valid 6-digit Indian PIN code.',
      });
    }

    const normalizedPhoneNumber = normalizePhone(dto.phone);
    if (!isValidIndianMobile(normalizedPhoneNumber)) {
      throw new BadRequestException({
        code: 'INVALID_PHONE_NUMBER',
        message: 'Phone number must be a valid 10-digit Indian mobile number.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.customerAddress.count({
        where: { customerUserId, isDeleted: false },
      });

      const shouldBeDefault = dto.isDefault ?? existingCount === 0;

      if (shouldBeDefault && existingCount > 0) {
        await tx.customerAddress.updateMany({
          where: { customerUserId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          customerUserId,
          label: dto.label.trim(),
          recipientName: dto.recipientName.trim(),
          phone: normalizedPhoneNumber,
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2?.trim() || null,
          landmark: dto.landmark?.trim() || null,
          city: dto.city.trim(),
          state: dto.state.trim(),
          postalCode: normalizedPin,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async getAddress(customerUserId: string, id: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id,
        customerUserId,
        isDeleted: false,
      },
    });

    if (!address) {
      throw new NotFoundException({
        code: 'ADDRESS_NOT_FOUND',
        message: 'Address not found.',
      });
    }

    return address;
  }

  async updateAddress(customerUserId: string, id: string, dto: UpdateCustomerAddressDto) {
    await this.getAddress(customerUserId, id);

    let normalizedPin: string | undefined = undefined;
    if (dto.postalCode) {
      normalizedPin = normalizePostalCode(dto.postalCode);
      if (!isValidIndianPinCode(normalizedPin)) {
        throw new BadRequestException({
          code: 'INVALID_PIN_CODE',
          message: 'Postal code must be a valid 6-digit Indian PIN code.',
        });
      }
    }

    let normalizedPhoneNumber: string | undefined = undefined;
    if (dto.phone) {
      normalizedPhoneNumber = normalizePhone(dto.phone);
      if (!isValidIndianMobile(normalizedPhoneNumber)) {
        throw new BadRequestException({
          code: 'INVALID_PHONE_NUMBER',
          message: 'Phone number must be a valid 10-digit Indian mobile number.',
        });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerUserId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id },
        data: {
          ...(dto.label ? { label: dto.label.trim() } : {}),
          ...(dto.recipientName ? { recipientName: dto.recipientName.trim() } : {}),
          ...(normalizedPhoneNumber ? { phone: normalizedPhoneNumber } : {}),
          ...(dto.addressLine1 ? { addressLine1: dto.addressLine1.trim() } : {}),
          ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2?.trim() || null } : {}),
          ...(dto.landmark !== undefined ? { landmark: dto.landmark?.trim() || null } : {}),
          ...(dto.city ? { city: dto.city.trim() } : {}),
          ...(dto.state ? { state: dto.state.trim() } : {}),
          ...(normalizedPin ? { postalCode: normalizedPin } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
  }

  async setDefaultAddress(customerUserId: string, id: string) {
    await this.getAddress(customerUserId, id);

    return this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { customerUserId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.customerAddress.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  async deleteAddress(customerUserId: string, id: string) {
    const address = await this.getAddress(customerUserId, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customerAddress.update({
        where: { id },
        data: { isDeleted: true, isDefault: false },
      });

      // If deleted address was default, promote another address to default if available
      if (address.isDefault) {
        const nextAddress = await tx.customerAddress.findFirst({
          where: { customerUserId, isDeleted: false },
          orderBy: { createdAt: 'desc' },
        });

        if (nextAddress) {
          await tx.customerAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }

      return updated;
    });
  }
}
