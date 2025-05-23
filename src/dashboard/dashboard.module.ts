import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Shift } from '../shifts/entities/shift.entity';
import { Mileage } from '../mileages/entities/mileage.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Client } from '../clients/entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, Mileage, Invoice, Client]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}