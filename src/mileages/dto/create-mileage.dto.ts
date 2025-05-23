import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMileageDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  distance: number;

  @ApiProperty({ required: false, description: 'If not provided, uses user\'s default mileage rate' })
  @IsOptional()
  @IsNumber()
  ratePerKm?: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fromLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  toLocation?: string;
}