import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedsService } from './seeds.service';
import { User } from '../users/entities/user.entity';
import { Client } from '../clients/entities/client.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Mileage } from '../mileages/entities/mileage.entity';
import { Invoice } from '../invoices/entities/invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Client, Shift, Mileage, Invoice]),
  ],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule {}