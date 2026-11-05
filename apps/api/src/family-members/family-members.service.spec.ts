import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FamilyMembersService } from './family-members.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { FamilyMemberRelationship } from '@prisma/client';

describe('FamilyMembersService', () => {
  let service: FamilyMembersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      familyMember: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      prescription: {
        count: vi.fn(),
      },
      order: {
        count: vi.fn(),
      },
    };

    service = new FamilyMembersService(mockPrisma);
  });

  it('rejects duplicate SELF family member creation', async () => {
    mockPrisma.familyMember.findFirst.mockResolvedValue({
      id: 'fam-self',
      relationship: FamilyMemberRelationship.SELF,
    });

    await expect(
      service.createFamilyMember('user-1', {
        fullName: 'Debasish Ghosh',
        relationship: FamilyMemberRelationship.SELF,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects future date of birth', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);

    await expect(
      service.createFamilyMember('user-1', {
        fullName: 'Baby',
        relationship: FamilyMemberRelationship.CHILD,
        dateOfBirth: futureDate,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents deletion if referenced by prescriptions or orders', async () => {
    mockPrisma.familyMember.findFirst.mockResolvedValue({
      id: 'fam-1',
      customerUserId: 'user-1',
      relationship: FamilyMemberRelationship.MOTHER,
    });
    mockPrisma.prescription.count.mockResolvedValue(1);
    mockPrisma.order.count.mockResolvedValue(0);

    await expect(service.deleteFamilyMember('user-1', 'fam-1')).rejects.toThrow(ConflictException);
  });

  it('soft deletes family member when safe', async () => {
    mockPrisma.familyMember.findFirst.mockResolvedValue({
      id: 'fam-1',
      customerUserId: 'user-1',
      relationship: FamilyMemberRelationship.MOTHER,
    });
    mockPrisma.prescription.count.mockResolvedValue(0);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.familyMember.update.mockResolvedValue({ id: 'fam-1', isDeleted: true });

    const result = await service.deleteFamilyMember('user-1', 'fam-1');
    expect(result.isDeleted).toBe(true);
  });
});
