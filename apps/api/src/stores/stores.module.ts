import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
