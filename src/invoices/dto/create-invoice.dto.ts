import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Array of shift IDs to include in this invoice' })
  @IsArray()
  @IsUUID('4', { each: true })
  shiftIds: string[];

  @ApiProperty({ description: 'Array of mileage IDs to include in this invoice' })
  @IsArray()
  @IsUUID('4', { each: true })
  mileageIds: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}