import { ApiProperty } from '@nestjs/swagger';
import { Mileage } from '../entities/mileage.entity';
import { ClientDto } from '../../clients/dto/client.dto';

export class MileageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  distance: number;

  @ApiProperty()
  ratePerKm: number;

  @ApiProperty()
  amount: number;

  @ApiProperty({ required: false })
  description: string;

  @ApiProperty({ required: false })
  fromLocation: string;

  @ApiProperty({ required: false })
  toLocation: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  clientId: string;

  @ApiProperty({ type: ClientDto, required: false })
  client?: ClientDto;

  @ApiProperty()
  isInvoiced: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(mileage: Mileage) {
    this.id = mileage.id;
    this.date = mileage.date;
    this.distance = mileage.distance;
    this.ratePerKm = mileage.ratePerKm;
    this.amount = mileage.amount;
    this.description = mileage.description;
    this.fromLocation = mileage.fromLocation;
    this.toLocation = mileage.toLocation;
    this.userId = mileage.userId;
    this.clientId = mileage.clientId;
    this.isInvoiced = mileage.isInvoiced;
    this.createdAt = mileage.createdAt;
    this.updatedAt = mileage.updatedAt;
    
    if (mileage.client) {
      this.client = new ClientDto(mileage.client);
    }
  }
}