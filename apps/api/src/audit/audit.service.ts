import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append-only security audit log recording.
   * Strips any potentially sensitive fields before writing.
   */
  async record(params: CreateAuditLogParams): Promise<void> {
    try {
      // Ensure no raw passwords, OTPs, or tokens are logged in metadata
      let safeMetadata = params.metadata;
      if (safeMetadata && typeof safeMetadata === 'object' && !Array.isArray(safeMetadata)) {
        const sanitized = { ...(safeMetadata as Record<string, unknown>) };
        delete sanitized.password;
        delete sanitized.otp;
        delete sanitized.token;
        delete sanitized.refreshToken;
        delete sanitized.codeHash;
        delete sanitized.passwordHash;
        safeMetadata = sanitized as Prisma.InputJsonValue;
      }

      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId || null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId || null,
          metadata: safeMetadata ?? Prisma.JsonNull,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err) {
      // Audit logging must not crash primary authentication flow if DB constraint issues arise,
      // but must log error to system logger.
      this.logger.error(`Failed to record audit log: ${params.action}`, err);
    }
  }
}
