import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, UserStatus, Prisma } from '@prisma/client';
import { normalizeEmail, normalizePhone } from '@pharmacy/validation';

export type UserWithProfiles = Prisma.UserGetPayload<{
  include: {
    customerProfile: true;
    pharmacistProfile: {
      include: {
        store: true;
      };
    };
    staffProfile: {
      include: {
        store: true;
      };
    };
  };
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        customerProfile: true,
        pharmacistProfile: {
          include: {
            store: true,
          },
        },
        staffProfile: {
          include: {
            store: true,
          },
        },
      },
    });
  }

  async findByPhone(phone: string): Promise<UserWithProfiles | null> {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;

    return this.prisma.user.findUnique({
      where: { phone: normalized },
      include: {
        customerProfile: true,
        pharmacistProfile: {
          include: {
            store: true,
          },
        },
        staffProfile: {
          include: {
            store: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string): Promise<UserWithProfiles | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    return this.prisma.user.findUnique({
      where: { email: normalized },
      include: {
        customerProfile: true,
        pharmacistProfile: {
          include: {
            store: true,
          },
        },
        staffProfile: {
          include: {
            store: true,
          },
        },
      },
    });
  }

  /**
   * Create customer user and profile atomically.
   */
  async createCustomer(
    phone: string,
    fullName?: string,
    preferredLanguage = 'en',
  ): Promise<UserWithProfiles> {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Invalid phone number.');
    }

    const defaultName = fullName || `Customer ${normalizedPhone.slice(-4)}`;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: normalizedPhone,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.customerProfile.create({
        data: {
          userId: user.id,
          fullName: defaultName,
          preferredLanguage: ['en', 'hi', 'bn'].includes(preferredLanguage)
            ? preferredLanguage
            : 'en',
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          customerProfile: true,
          pharmacistProfile: {
            include: {
              store: true,
            },
          },
          staffProfile: {
            include: {
              store: true,
            },
          },
        },
      });
    });
  }

  /**
   * Create customer user and profile by email atomically.
   */
  async createCustomerWithEmail(params: {
    email: string;
    fullName: string;
    passwordHash?: string;
    phone?: string;
    preferredLanguage?: string;
  }): Promise<UserWithProfiles> {
    const normalizedEmail = normalizeEmail(params.email);
    if (!normalizedEmail) {
      throw new BadRequestException('Invalid email address.');
    }

    const preferredLang = ['en', 'hi', 'bn'].includes(params.preferredLanguage || '')
      ? (params.preferredLanguage as string)
      : 'en';

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          phone: params.phone ? normalizePhone(params.phone) : null,
          passwordHash: params.passwordHash || null,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.customerProfile.create({
        data: {
          userId: user.id,
          fullName: params.fullName.trim(),
          preferredLanguage: preferredLang,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          customerProfile: true,
          pharmacistProfile: {
            include: {
              store: true,
            },
          },
          staffProfile: {
            include: {
              store: true,
            },
          },
        },
      });
    });
  }

  /**
   * Update user status (e.g., ACTIVE, INACTIVE, SUSPENDED).
   */
  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }
}
