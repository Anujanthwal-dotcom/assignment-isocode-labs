import { Module } from '@nestjs/common';
import { CustomerMedicinesController } from './customer-medicines.controller';
import { CustomerMedicinesService } from './customer-medicines.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerMedicinesController],
  providers: [CustomerMedicinesService],
  exports: [CustomerMedicinesService],
})
export class CustomerMedicinesModule {}
