import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity';

export class UpdateInvoiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false, enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @ApiProperty({ required: false, description: 'Array of shift IDs to include in this invoice' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  shiftIds?: string[];

  @ApiProperty({ required: false, description: 'Array of mileage IDs to include in this invoice' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mileageIds?: string[];
}