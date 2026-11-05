import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async generateOrderNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx || this.prisma;
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10).replace(/-/g, '');

    const result = await client.$queryRaw<{ lastSequence: number }[]>`
      INSERT INTO order_counters ("dateKey", "lastSequence", "updatedAt")
      VALUES (${dateKey}, 1, NOW())
      ON CONFLICT ("dateKey")
      DO UPDATE SET "lastSequence" = order_counters."lastSequence" + 1, "updatedAt" = NOW()
      RETURNING "lastSequence"
    `;

    const seq = result[0]?.lastSequence ?? 1;
    const paddedSeq = seq.toString().padStart(6, '0');

    return `PH-${dateKey}-${paddedSeq}`;
  }
}
