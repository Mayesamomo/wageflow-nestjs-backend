import { ApiProperty } from '@nestjs/swagger';
import { Shift, ShiftType } from '../entities/shift.entity';
import { ClientDto } from '../../clients/dto/client.dto';

export class ShiftDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty({ enum: ShiftType })
  shiftType: ShiftType;

  @ApiProperty()
  hourlyRate: number;

  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  earnings: number;

  @ApiProperty()
  hstAmount: number;

  @ApiProperty({ required: false })
  notes: string;

  @ApiProperty({ required: false })
  location: string;

  @ApiProperty({ required: false })
  latitude: number;

  @ApiProperty({ required: false })
  longitude: number;

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

  constructor(shift: Shift) {
    this.id = shift.id;
    this.startTime = shift.startTime;
    this.endTime = shift.endTime;
    this.shiftType = shift.shiftType;
    this.hourlyRate = shift.hourlyRate;
    this.totalHours = shift.totalHours;
    this.earnings = shift.earnings;
    this.hstAmount = shift.hstAmount;
    this.notes = shift.notes;
    this.location = shift.location;
    this.latitude = shift.latitude;
    this.longitude = shift.longitude;
    this.userId = shift.userId;
    this.clientId = shift.clientId;
    this.isInvoiced = shift.isInvoiced;
    this.createdAt = shift.createdAt;
    this.updatedAt = shift.updatedAt;
    
    if (shift.client) {
      this.client = new ClientDto(shift.client);
    }
  }
}