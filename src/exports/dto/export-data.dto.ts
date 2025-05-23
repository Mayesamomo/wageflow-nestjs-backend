import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum ExportType {
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum ExportDataType {
  SHIFTS = 'shifts',
  MILEAGES = 'mileages',
  INVOICE = 'invoice',
  EARNINGS_SUMMARY = 'earnings_summary',
}

export class ExportDataDto {
  @ApiProperty({ enum: ExportType })
  @IsEnum(ExportType)
  exportType: ExportType;

  @ApiProperty({ enum: ExportDataType })
  @IsEnum(ExportDataType)
  dataType: ExportDataType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ids?: string[];
}