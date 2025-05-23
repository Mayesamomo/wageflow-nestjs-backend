import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MileagesService } from './mileages.service';
import { MileagesController } from './mileages.controller';
import { Mileage } from './entities/mileage.entity';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mileage]),
    ClientsModule,
    UsersModule,
  ],
  controllers: [MileagesController],
  providers: [MileagesService],
  exports: [MileagesService],
})
export class MileagesModule {}