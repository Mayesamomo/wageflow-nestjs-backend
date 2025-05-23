import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ShiftType } from '../entities/shift.entity';

export class CreateShiftDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @ApiProperty({ enum: ShiftType, default: ShiftType.REGULAR })
  @IsEnum(ShiftType)
  @IsOptional()
  shiftType?: ShiftType = ShiftType.REGULAR;

  @ApiProperty({ required: true, description: 'Hourly rate for this shift' })
  @IsNotEmpty()
  @IsNumber()
  hourlyRate: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'Location of the shift' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false, description: 'Use current location', default: false })
  @IsOptional()
  useCurrentLocation?: boolean;
}