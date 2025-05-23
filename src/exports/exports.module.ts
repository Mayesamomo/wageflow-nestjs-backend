import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { Shift } from '../shifts/entities/shift.entity';
import { Mileage } from '../mileages/entities/mileage.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, Mileage, Invoice, Client, User]),
  ],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}