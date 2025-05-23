import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @ApiProperty({ required: false, description: 'HST percentage, e.g., 13 for 13%' })
  @IsOptional()
  @IsNumber()
  hstPercentage?: number;

  @ApiProperty({ required: false, description: 'Mileage rate per kilometer' })
  @IsOptional()
  @IsNumber()
  mileageRate?: number;
}