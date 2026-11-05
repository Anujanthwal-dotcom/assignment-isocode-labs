import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyMemberDto, UpdateFamilyMemberDto } from './family-members.dto';
import { FamilyMemberRelationship } from '@prisma/client';

@Injectable()
export class FamilyMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async listFamilyMembers(customerUserId: string) {
    return this.prisma.familyMember.findMany({
      where: {
        customerUserId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createFamilyMember(customerUserId: string, dto: CreateFamilyMemberDto) {
    if (dto.relationship === FamilyMemberRelationship.SELF) {
      const existingSelf = await this.prisma.familyMember.findFirst({
        where: {
          customerUserId,
          relationship: FamilyMemberRelationship.SELF,
          isDeleted: false,
        },
      });

      if (existingSelf) {
        throw new ConflictException({
          code: 'DUPLICATE_SELF_PROFILE',
          message: 'A SELF family profile already exists for this account.',
        });
      }
    }

    let parsedDob: Date | undefined = undefined;
    if (dto.dateOfBirth) {
      parsedDob = new Date(dto.dateOfBirth);
      if (isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
        throw new BadRequestException({
          code: 'INVALID_DATE_OF_BIRTH',
          message: 'Date of birth must be a valid date in the past.',
        });
      }
    }

    return this.prisma.familyMember.create({
      data: {
        customerUserId,
        fullName: dto.fullName.trim(),
        relationship: dto.relationship,
        dateOfBirth: parsedDob,
      },
    });
  }

  async getFamilyMember(customerUserId: string, id: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        id,
        customerUserId,
        isDeleted: false,
      },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'FAMILY_MEMBER_NOT_FOUND',
        message: 'Family member profile not found.',
      });
    }

    return member;
  }

  async updateFamilyMember(customerUserId: string, id: string, dto: UpdateFamilyMemberDto) {
    // Check ownership
    const existing = await this.getFamilyMember(customerUserId, id);

    if (
      dto.relationship === FamilyMemberRelationship.SELF &&
      existing.relationship !== FamilyMemberRelationship.SELF
    ) {
      const existingSelf = await this.prisma.familyMember.findFirst({
        where: {
          customerUserId,
          relationship: FamilyMemberRelationship.SELF,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existingSelf) {
        throw new ConflictException({
          code: 'DUPLICATE_SELF_PROFILE',
          message: 'A SELF family profile already exists for this account.',
        });
      }
    }

    let parsedDob: Date | undefined = undefined;
    if (dto.dateOfBirth) {
      parsedDob = new Date(dto.dateOfBirth);
      if (isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
        throw new BadRequestException({
          code: 'INVALID_DATE_OF_BIRTH',
          message: 'Date of birth must be a valid date in the past.',
        });
      }
    }

    return this.prisma.familyMember.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.relationship ? { relationship: dto.relationship } : {}),
        ...(dto.dateOfBirth !== undefined ? { dateOfBirth: parsedDob } : {}),
      },
    });
  }

  async deleteFamilyMember(customerUserId: string, id: string) {
    // Check ownership
    await this.getFamilyMember(customerUserId, id);

    // Check if referenced by prescriptions or orders
    const [prescriptionsCount, ordersCount] = await Promise.all([
      this.prisma.prescription.count({ where: { familyMemberId: id } }),
      this.prisma.order.count({ where: { familyMemberId: id } }),
    ]);

    if (prescriptionsCount > 0 || ordersCount > 0) {
      throw new ConflictException({
        code: 'FAMILY_MEMBER_IN_USE',
        message:
          'Cannot delete family member profile because prescriptions or past orders reference it.',
      });
    }

    // Soft delete
    return this.prisma.familyMember.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
